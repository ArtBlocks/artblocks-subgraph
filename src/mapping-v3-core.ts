import { BigInt, store, log, Address, Bytes } from "@graphprotocol/graph-ts";

import {
  Mint,
  ProjectUpdated,
  PlatformUpdated,
  MinterUpdated,
  ProposedArtistAddressesAndSplits as ProposedArtistAddressesAndSplitsEvent,
  AcceptedArtistAddressesAndSplits
} from "../generated/GenArt721CoreV3/IGenArt721CoreContractV3_Base";

import { GenArt721CoreV3 } from "../generated/GenArt721CoreV3/GenArt721CoreV3";
import { GenArt721CoreV3_Engine } from "../generated/GenArt721CoreV3/GenArt721CoreV3_Engine";

import { Transfer } from "../generated/GenArt721CoreV3/IERC721";

import { OwnershipTransferred } from "../generated/GenArt721CoreV3/Ownable";

import {
  IAdminACLV0,
  SuperAdminTransferred
} from "../generated/AdminACLV0/IAdminACLV0";

import { MinterFilterV1 } from "../generated/MinterFilterV1/MinterFilterV1";
import { loadOrCreateAndSetProjectMinterConfiguration } from "./minter-filter-mapping";

import {
  Project,
  Token,
  Transfer as TokenTransfer,
  Account,
  AccountProject,
  ProjectScript,
  Contract,
  MinterFilter,
  ProposedArtistAddressesAndSplit
} from "../generated/schema";

import {
  generateAccountProjectId,
  generateProjectIdNumberFromTokenIdNumber,
  generateContractSpecificId,
  generateProjectScriptId,
  addWhitelisting,
  removeWhitelisting
} from "./helpers";

import { NULL_ADDRESS } from "./constants";

/**
 * @dev Warning - All parameters pulled directly from contracts will return the
 * state at the end of the block that the transaction was included in. When
 * possible, use event parameters or entity fields from the store, which will
 * reflect the state at the time of the event.
 */

/*** EVENT HANDLERS ***/
export function handleIAdminACLV0SuperAdminTransferred(
  event: SuperAdminTransferred
): void {
  // attempt to update any of the contract entities flagged in the event
  let contractAddresses: Array<Address> =
    event.params.genArt721CoreAddressesToUpdate;
  for (let i = 0; i < contractAddresses.length; i++) {
    let contractAddress: Address = contractAddresses[i];
    let contractEntity = Contract.load(contractAddress.toHexString());
    if (contractEntity) {
      // refresh the contract entity to pick up the new super admin
      refreshContractAtAddress(contractAddress, event.block.timestamp);
    }
  }
}

export function handleMint(event: Mint): void {
  const flagshipContract = getV3FlagshipContract(event.address);
  if (flagshipContract) {
    _handleMint(flagshipContract, event);
    return;
  }
  const engineContract = getV3EngineContract(event.address);
  if (engineContract) {
    _handleMint(engineContract, event);
    return;
  }
  log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
    event.address.toHexString()
  ]);
}

// helper function for `handleMint`
function _handleMint<T>(contract: T, event: Mint): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }
  let token = new Token(
    generateContractSpecificId(event.address, event.params._tokenId)
  );
  let projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params._tokenId
  );
  let projectId = generateContractSpecificId(event.address, projectIdNumber);

  let project = Project.load(projectId);
  if (project) {
    // @dev use invocations from entity in store. This will reflect the state
    // at the time of the event, not the end of the block, which is required
    // because many invocations often occur in a single block.
    let invocation = project.invocations;

    token.tokenId = event.params._tokenId;
    token.contract = event.address.toHexString();
    token.project = projectId;
    token.owner = event.params._to.toHexString();
    // Okay to assume the hash is assigned in same tx as mint for now,
    // but this will need to be updated if we ever support async token hash
    // assignment.
    token.hash = contract.tokenIdToHash(event.params._tokenId);
    token.invocation = invocation;
    token.createdAt = event.block.timestamp;
    token.updatedAt = event.block.timestamp;
    token.transactionHash = event.transaction.hash;
    token.nextSaleId = BigInt.fromI32(0);
    token.save();

    project.invocations = invocation.plus(BigInt.fromI32(1));
    if (project.invocations == project.maxInvocations) {
      project.complete = true;
      project.completedAt = event.block.timestamp;
      project.updatedAt = event.block.timestamp;
    }
    project.save();

    let account = new Account(token.owner);
    account.save();

    let accountProjectId = generateAccountProjectId(account.id, project.id);
    let accountProject = AccountProject.load(accountProjectId);
    if (!accountProject) {
      accountProject = new AccountProject(accountProjectId);
      accountProject.account = account.id;
      accountProject.project = project.id;
      accountProject.count = 0;
    }
    accountProject.count += 1;
    accountProject.save();
  }
}

// Update token owner on transfer
export function handleTransfer(event: Transfer): void {
  // This will only create a new token if a token with the
  // same id does not already exist
  let token = Token.load(
    generateContractSpecificId(event.address, event.params.tokenId)
  );

  // Let mint handlers deal with new tokens
  if (token) {
    // Update Account <-> Project many-to-many relation
    // table to reflect new account project token balance
    let prevAccountProject = AccountProject.load(
      generateAccountProjectId(
        event.transaction.from.toHexString(),
        token.project
      )
    );

    if (
      prevAccountProject &&
      (prevAccountProject as AccountProject).count > 1
    ) {
      prevAccountProject.count -= 1;
      prevAccountProject.save();
    } else if (prevAccountProject) {
      store.remove("AccountProject", prevAccountProject.id);
    }

    let newAccountProjectId = generateAccountProjectId(
      event.params.to.toHexString(),
      token.project
    );
    let newAccountProject = AccountProject.load(newAccountProjectId);
    if (!newAccountProject) {
      newAccountProject = new AccountProject(newAccountProjectId);
      newAccountProject.project = token.project;
      newAccountProject.account = event.params.to.toHexString();
      newAccountProject.count = 0;
    }
    newAccountProject.count += 1;
    newAccountProject.save();

    // Create a new account entity if one for the new owner doesn't exist
    let account = new Account(event.params.to.toHexString());
    account.save();

    token.owner = event.params.to.toHexString();
    token.updatedAt = event.block.timestamp;
    token.save();

    let transfer = new TokenTransfer(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );
    transfer.transactionHash = event.transaction.hash;
    transfer.createdAt = event.block.timestamp;
    transfer.to = event.params.to;
    transfer.from = event.params.from;
    transfer.token = token.id;
    transfer.save();
  }
}

export const FIELD_PROJECT_ACTIVE = "active";
export const FIELD_PROJECT_ARTIST_ADDRESS = "artistAddress";
export const FIELD_PROJECT_ARTIST_NAME = "artistName";
export const FIELD_PROJECT_ASPECT_RATIO = "aspectRatio";
export const FIELD_PROJECT_BASE_URI = "baseURI";
export const FIELD_PROJECT_COMPLETED = "completed";
export const FIELD_PROJECT_CREATED = "created";
export const FIELD_PROJECT_DESCRIPTION = "description";
export const FIELD_PROJECT_LICENSE = "license";
export const FIELD_PROJECT_MAX_INVOCATIONS = "maxInvocations";
export const FIELD_PROJECT_NAME = "name";
export const FIELD_PROJECT_PAUSED = "paused";
export const FIELD_PROJECT_SCRIPT = "script";
export const FIELD_PROJECT_SCRIPT_TYPE = "scriptType";
export const FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE =
  "royaltyPercentage";
export const FIELD_PROJECT_WEBSITE = "website";

export function handleProjectUpdated(event: ProjectUpdated): void {
  log.info("handleProjectUpdated", []);
  const flagshipContract = getV3FlagshipContract(event.address);
  if (flagshipContract) {
    _handleProjectUpdated(flagshipContract, event);
    return;
  }
  const engineContract = getV3EngineContract(event.address);
  if (engineContract) {
    _handleProjectUpdated(engineContract, event);
    return;
  }
  log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
    event.address.toHexString()
  ]);
}

// helper function for `handleProjectUpdated`
function _handleProjectUpdated<T>(contract: T, event: ProjectUpdated): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }

  const update = event.params._update.toString();
  const timestamp = event.block.timestamp;
  const projectId = event.params._projectId;
  const fullProjectId = generateContractSpecificId(event.address, projectId);

  if (update == FIELD_PROJECT_CREATED) {
    createProject(contract, event.params._projectId, timestamp);
    return;
  }

  const project = Project.load(fullProjectId);

  if (!project) {
    log.warning("Project not found for update: {}-{}", [
      event.address.toHexString(),
      event.params._projectId.toString()
    ]);
    return;
  }

  // Note switch statements
  if (
    update == FIELD_PROJECT_ACTIVE ||
    update == FIELD_PROJECT_MAX_INVOCATIONS ||
    update == FIELD_PROJECT_PAUSED
  ) {
    handleProjectStateDataUpdated(contract, project, timestamp);
  } else if (update == FIELD_PROJECT_ARTIST_ADDRESS) {
    handleProjectArtistAddressUpdated(contract, project, timestamp);
  } else if (
    update == FIELD_PROJECT_ARTIST_NAME ||
    update == FIELD_PROJECT_DESCRIPTION ||
    update == FIELD_PROJECT_LICENSE ||
    update == FIELD_PROJECT_NAME ||
    update == FIELD_PROJECT_WEBSITE
  ) {
    handleProjectDetailsUpdated(contract, project, timestamp);
  } else if (
    update == FIELD_PROJECT_ASPECT_RATIO ||
    update == FIELD_PROJECT_SCRIPT_TYPE
  ) {
    handleProjectScriptDetailsUpdated(contract, project, timestamp);
  } else if (update == FIELD_PROJECT_BASE_URI) {
    handleProjectBaseURIUpdated(contract, project, timestamp);
  } else if (update == FIELD_PROJECT_COMPLETED) {
    // Note this event is only ever fired when a project is completed
    // and that a project cannot become incomplete after it has been completed
    handleProjectCompleted(project, timestamp);
  } else if (update == FIELD_PROJECT_SCRIPT) {
    refreshProjectScript(contract, project, timestamp);
  } else if (update == FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE) {
    handleProjectSecondaryMarketRoyaltyPercentageUpdated(
      contract,
      project,
      timestamp
    );
  } else {
    log.warning("Unexpected update field for project {}", [project.id]);
  }
}

/*** PROJECT UPDATED FUNCTIONS ***/
function handleProjectStateDataUpdated<T>(
  contract: T,
  project: Project,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }
  const projectStateData = contract.try_projectStateData(project.projectId);
  if (!projectStateData.reverted) {
    project.active = projectStateData.value.getActive();
    project.maxInvocations = projectStateData.value.getMaxInvocations();
    project.paused = projectStateData.value.getPaused();
    project.updatedAt = timestamp;
    project.save();
  }
}

function handleProjectArtistAddressUpdated<T>(
  contract: T,
  project: Project,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }
  const projectArtistAddress = contract.try_projectIdToArtistAddress(
    project.projectId
  );
  if (!projectArtistAddress.reverted) {
    project.artistAddress = projectArtistAddress.value;
    project.updatedAt = timestamp;
    project.save();
  }
}

function handleProjectDetailsUpdated<T>(
  contract: T,
  project: Project,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }
  const projectDetails = contract.try_projectDetails(project.projectId);
  if (!projectDetails.reverted) {
    project.artistName = projectDetails.value.getArtist();
    project.description = projectDetails.value.getDescription();
    project.name = projectDetails.value.getProjectName();
    project.website = projectDetails.value.getWebsite();
    project.license = projectDetails.value.getLicense();
    project.updatedAt = timestamp;
    project.save();
  }
}

function handleProjectScriptDetailsUpdated<T>(
  contract: T,
  project: Project,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }
  const projectScriptDetails = contract.try_projectScriptDetails(
    project.projectId
  );
  if (!projectScriptDetails.reverted) {
    project.aspectRatio = projectScriptDetails.value.getAspectRatio();
    project.scriptTypeAndVersion = projectScriptDetails.value.getScriptTypeAndVersion();
    project.updatedAt = timestamp;
    project.save();
  }
}

function handleProjectBaseURIUpdated<T>(
  contract: T,
  project: Project,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }
  const projectBaseURI = contract.try_projectURIInfo(project.projectId);
  if (!projectBaseURI.reverted) {
    project.baseUri = projectBaseURI.value;
    project.updatedAt = timestamp;
    project.save();
  }
}

function handleProjectCompleted(project: Project, timestamp: BigInt): void {
  project.complete = true;
  project.completedAt = timestamp;
  project.updatedAt = timestamp;
  project.save();
}

function handleProjectSecondaryMarketRoyaltyPercentageUpdated<T>(
  contract: T,
  project: Project,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }
  const projectSecondaryMarketRoyaltyPercentage = contract.try_projectIdToSecondaryMarketRoyaltyPercentage(
    project.projectId
  );
  if (!projectSecondaryMarketRoyaltyPercentage.reverted) {
    project.royaltyPercentage = projectSecondaryMarketRoyaltyPercentage.value;
    project.updatedAt = timestamp;
    project.save();
  }
}

function createProject<T>(
  contract: T,
  projectId: BigInt,
  timestamp: BigInt
): Project | null {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return null;
  }
  const contractAddress = contract._address.toHexString();
  let contractEntity = Contract.load(contractAddress);
  // Starting with v3, the contract entity should always exists
  // before a project is created because the constructor emits
  // an event that should cause the contract entity to be created.
  if (!contractEntity) {
    log.warning("Contract not found for project: {}-{}", [
      contractAddress,
      projectId.toString()
    ]);
    return null;
  }

  const projectDetails = contract.try_projectDetails(projectId);
  const projectScriptDetails = contract.try_projectScriptDetails(projectId);
  const projectStateData = contract.try_projectStateData(projectId);
  const projectArtistAddress = contract.try_projectIdToArtistAddress(projectId);

  if (
    projectDetails.reverted ||
    projectScriptDetails.reverted ||
    projectStateData.reverted ||
    projectArtistAddress.reverted
  ) {
    log.warning("Failed to get project details for new project: {}-{}", [
      contractAddress,
      projectId.toString()
    ]);
    return null;
  }

  let name = projectDetails.value.getProjectName();
  let artistName = projectDetails.value.getArtist();

  let artistAddress = projectArtistAddress.value;
  let artist = new Account(artistAddress.toHexString());
  artist.save();

  let pricePerTokenInWei = BigInt.fromI32(0);
  let invocations = projectStateData.value.getInvocations();
  let maxInvocations = projectStateData.value.getMaxInvocations();
  let currencySymbol = "ETH";
  let currencyAddress = Address.zero();

  let scriptCount = projectScriptDetails.value.getScriptCount();
  let useHashString = true;
  let paused = projectStateData.value.getPaused();

  let project = new Project(
    generateContractSpecificId(contract._address, projectId)
  );

  project.active = false;
  project.artist = artist.id;
  project.artistAddress = artistAddress;
  project.complete = false;
  project.contract = contractAddress;
  project.createdAt = timestamp;
  project.currencyAddress = currencyAddress;
  project.currencySymbol = currencySymbol;
  project.dynamic = true;
  project.externalAssetDependencyCount = BigInt.fromI32(0);
  project.externalAssetDependenciesLocked = false;
  project.invocations = invocations;
  project.locked = false;
  project.maxInvocations = maxInvocations;
  project.name = name;
  project.paused = paused;
  project.pricePerTokenInWei = pricePerTokenInWei;
  project.projectId = projectId;
  project.scriptCount = scriptCount;
  project.updatedAt = timestamp;
  project.useHashString = useHashString;
  project.useIpfs = false;

  project.save();
  return project;
}

function refreshProjectScript<T>(
  contract: T,
  project: Project,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return;
  }
  let scriptDetails = contract.try_projectScriptDetails(project.projectId);
  if (scriptDetails.reverted) {
    log.warning("Could not retrive script info for project {}", [project.id]);
    return;
  }

  let prevScriptCount = project.scriptCount.toI32();
  let scriptCount = scriptDetails.value.getScriptCount().toI32();

  // Remove ProjectScripts that no longer exist on chain
  if (prevScriptCount > scriptCount) {
    for (let i = scriptCount; i < prevScriptCount; i++) {
      const projectScript = ProjectScript.load(
        generateProjectScriptId(project.id, BigInt.fromI32(i))
      );
      if (projectScript) {
        store.remove("ProjectScript", projectScript.id);
      }
    }
  }

  let scripts: string[] = [];
  for (let i = 0; i < scriptCount; i++) {
    let script = contract.projectScriptByIndex(
      project.projectId,
      BigInt.fromI32(i)
    );

    let projectScriptIndex = BigInt.fromI32(i);
    let projectScript = new ProjectScript(
      generateProjectScriptId(project.id, projectScriptIndex)
    );
    projectScript.script = script;
    projectScript.index = projectScriptIndex;
    projectScript.project = project.id;
    projectScript.save();

    if (script && script != "") {
      scripts.push(script);
    }
  }

  let script = scripts.join("");

  project.script = script;
  project.scriptCount = scriptDetails.value.getScriptCount();
  project.updatedAt = timestamp;
  project.scriptUpdatedAt = timestamp;

  project.save();
}
/*** END PROJECT UPDATED FUNCTIONS ***/

// Handle platform updates
// This is a generic event that can be used to update a number of different
// contract state variables. All of the expected `_field` values are handled in
// the `refreshContract` helper function.
export function handlePlatformUpdated(event: PlatformUpdated): void {
  log.info("handleProjectUpdated", []);
  const flagshipContract = getV3FlagshipContract(event.address);
  if (flagshipContract) {
    _handlePlatformUpdated(flagshipContract, event);
    return;
  }
  const engineContract = getV3EngineContract(event.address);
  if (engineContract) {
    _handlePlatformUpdated(engineContract, event);
    return;
  }
  log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
    event.address.toHexString()
  ]);
}

// helper function for `handlePlatformUpdated`
function _handlePlatformUpdated<T>(contract: T, event: PlatformUpdated): void {
  refreshContract(contract, event.block.timestamp);
}

// Handle minter updated
// This is an event emitted when a V3 contract's minter is updated.
// @dev for V3, only one minter at a time is allowed, so this event can be
// interpreted as also indicating removal of an existing minter.
// @dev it can be assumed that the minter on V3 is a MinterFilter contract that
// conforms to IMinterFilterV0, unless the minter address is the zero address.
export function handleMinterUpdated(event: MinterUpdated): void {
  const flagshipContract = getV3FlagshipContract(event.address);
  if (flagshipContract) {
    _handleMinterUpdated(flagshipContract, event);
    return;
  }
  const engineContract = getV3EngineContract(event.address);
  if (engineContract) {
    _handleMinterUpdated(engineContract, event);
    return;
  }
  log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
    event.address.toHexString()
  ]);
}

// helper function for `handleMinterUpdated`
function _handleMinterUpdated<T>(contract: T, event: MinterUpdated): void {
  if (contract instanceof GenArt721CoreV3_Engine) {
    // For Engine contracts, we explicitly do not index the minter suite, so
    // simply refresh the contract and expect mintWhitelisted to updated
    // appropriately.
    refreshContract(contract, event.block.timestamp);
    return;
  } else if (!(contract instanceof GenArt721CoreV3)) {
    return;
  }
  // we can assume this is a V3 flagship contract
  let contractEntity = loadOrCreateContract(contract, event.block.timestamp);
  if (!contractEntity) {
    // this should never happen
    return;
  }

  // Clear the minter config for all projects on core contract when a new
  // minter filter is set
  clearAllMinterConfigurations(contract, event.block.timestamp);

  let newMinterFilterAddress = event.params._currentMinter.toHexString();
  if (newMinterFilterAddress == Address.zero().toHexString()) {
    // only when MinterFilter is zero address should we should assume
    // the  minter is not a MinterFilter contract
    // update contract entity with null MinterFilter
    contractEntity.minterFilter = null;
    contractEntity.mintWhitelisted = [];
  } else {
    // we can assume the minter is a MinterFilter contract.
    contractEntity.mintWhitelisted = [event.params._currentMinter];
    let minterFilterContract = MinterFilterV1.bind(event.params._currentMinter);
    // create and save minter filter entity if doesn't exist
    loadOrCreateMinterFilter(minterFilterContract, event.block.timestamp);
    // check that the MinterFilter's core contract is the contract that emitted
    // the event.
    if (
      minterFilterContract.genArt721CoreAddress().toHexString() !=
      event.address.toHexString()
    ) {
      // if the minter filter's core contract is not the contract that emitted
      // the event, then we should null the core contract entity's minterFilter
      // field (since invalid minter filter), keep mintWhitelisted as the
      // new address (technically the new minter could mint) and warn because
      // this is an unintended state.
      contractEntity.minterFilter = null;
      log.warning(
        "[WARN] Invalid minter filter at address {} set on core contract {} - minter filter's core contract is not the contract that emitted the event.",
        [newMinterFilterAddress, contractEntity.id]
      );
    } else {
      // update contract entity with new valid MinterFilter ID
      contractEntity.minterFilter = newMinterFilterAddress;
      // sync all pre-set projectMinterConfigurations
      populateAllExistingMinterConfigurations(
        minterFilterContract,
        contract,
        event.block.timestamp
      );
    }
  }

  // update contract entity and save
  contractEntity.updatedAt = event.block.timestamp;
  contractEntity.save();
}

// Handle artist proposed address and splits updates
// This is an event indicating that the artist has proposed a new set of
// addresses and splits for a project.
export function handleProposedArtistAddressesAndSplits(
  event: ProposedArtistAddressesAndSplitsEvent
): void {
  // load associated project entity
  const newEntityId = generateContractSpecificId(
    event.address,
    event.params._projectId
  );
  const project = Project.load(newEntityId);
  if (!project) {
    return;
  }
  // create new proposed artist addresses and splits entity
  // note: any existing proposal entity will be overwritten, which is intended
  // all fields will be populated.
  const proposedArtistAddressesAndSplits = new ProposedArtistAddressesAndSplit(
    newEntityId
  );
  // populate new entity with event params
  proposedArtistAddressesAndSplits.artistAddress = event.params._artistAddress;
  proposedArtistAddressesAndSplits.additionalPayeePrimarySalesAddress =
    event.params._additionalPayeePrimarySales;
  proposedArtistAddressesAndSplits.additionalPayeePrimarySalesPercentage =
    event.params._additionalPayeePrimarySalesPercentage;
  proposedArtistAddressesAndSplits.additionalPayeeSecondarySalesAddress =
    event.params._additionalPayeeSecondarySales;
  proposedArtistAddressesAndSplits.additionalPayeeSecondarySalesPercentage =
    event.params._additionalPayeeSecondarySalesPercentage;
  proposedArtistAddressesAndSplits.project = project.id;
  // save new entity to store
  proposedArtistAddressesAndSplits.createdAt = event.block.timestamp;
  proposedArtistAddressesAndSplits.save();
  // set the project's proposedArtistAddressesAndSplits field to the new entity
  project.proposedArtistAddressesAndSplits =
    proposedArtistAddressesAndSplits.id;
  project.updatedAt = event.block.timestamp;
  project.save();
}

// Handle admin accepting the currently proposed artist address and splits.
export function handleAcceptedArtistAddressesAndSplits(
  event: AcceptedArtistAddressesAndSplits
): void {
  // load associated project entity
  const entityId = generateContractSpecificId(
    event.address,
    event.params._projectId
  );
  const project = Project.load(entityId);
  if (!project) {
    return;
  }
  // load the existing proposed artist addresses and splits
  const existingProposedArtistAddressesAndSplitId =
    project.proposedArtistAddressesAndSplits;
  if (existingProposedArtistAddressesAndSplitId === null) {
    // we don't expect this state to be possible, so we should log a warning
    log.warning(
      "[WARN] No proposed artist addresses and splits found on project {}.",
      [entityId]
    );
    return;
  }
  const proposedArtistAddressesAndSplits = ProposedArtistAddressesAndSplit.load(
    entityId
  );
  if (!proposedArtistAddressesAndSplits) {
    // we dont expect this state to be possible, so we should log a warning
    log.warning(
      "[WARN] No proposed artist addresses and splits found with id {}.",
      [entityId]
    );
    return;
  }
  // update project entity with new artist addresses and splits
  project.artistAddress = proposedArtistAddressesAndSplits.artistAddress;
  project.additionalPayee =
    proposedArtistAddressesAndSplits.additionalPayeePrimarySalesAddress;
  project.additionalPayeePercentage =
    proposedArtistAddressesAndSplits.additionalPayeePrimarySalesPercentage;
  project.additionalPayeeSecondarySalesAddress =
    proposedArtistAddressesAndSplits.additionalPayeeSecondarySalesAddress;
  project.additionalPayeeSecondarySalesPercentage =
    proposedArtistAddressesAndSplits.additionalPayeeSecondarySalesPercentage;
  // clear the existing proposed artist addresses and splits
  project.proposedArtistAddressesAndSplits = null;
  project.updatedAt = event.block.timestamp;
  project.save();
  // remove the existing proposed artist addresses and splits entity from store
  store.remove("ProposedArtistAddressesAndSplit", entityId);
}

// Handle OwnershipTransferred event, emitted by the Ownable contract.
// This event is updated whenever an admin address is changed.
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  const flagshipContract = getV3FlagshipContract(event.address);
  if (flagshipContract) {
    _handleOwnershipTransferred(flagshipContract, event);
    return;
  }
  const engineContract = getV3EngineContract(event.address);
  if (engineContract) {
    _handleOwnershipTransferred(engineContract, event);
    return;
  }
  log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
    event.address.toHexString()
  ]);
}

// helper function for `handleOwnershipTransferred`
function _handleOwnershipTransferred<T>(
  contract: T,
  event: OwnershipTransferred
): void {
  // refresh the contract to get the latest admin address
  refreshContract(contract, event.block.timestamp);
}

/*** END EVENT HANDLERS ***/

/*** NO CALL HANDLERS  ***/

/** HELPERS ***/

// loads or creates a contract entity and returns it.
function loadOrCreateContract<T>(
  contract: T,
  timestamp: BigInt
): Contract | null {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return null;
  }
  let contractEntity = Contract.load(contract._address.toHexString());
  if (!contractEntity) {
    contractEntity = refreshContract(contract, timestamp);
  }
  return contractEntity;
}

// loads or creates a MinterFilter entity and returns it.
function loadOrCreateMinterFilter(
  minterFilterContract: MinterFilterV1,
  timestamp: BigInt
): MinterFilter {
  // load or create MinterFilter entity
  let minterFilter = MinterFilter.load(
    minterFilterContract._address.toHexString()
  );
  if (!minterFilter) {
    minterFilter = new MinterFilter(
      minterFilterContract._address.toHexString()
    );
    minterFilter.coreContract = minterFilterContract
      .genArt721CoreAddress()
      .toHexString();
    // if this is the first time we have seen this minter filter, we can
    // assume the minter allowlist is empty If it was not empty, we would
    // have seen it when the minter filter was allowlisting a minter.
    // @dev this assumes the minter filter is in subgraph's config
    minterFilter.minterAllowlist = [];
    minterFilter.updatedAt = timestamp;
    minterFilter.save();
  }
  return minterFilter;
}

// Returns a V3 flagship contract if the contract type is GenArt721CoreV3,
// otherwise returns null.
function getV3FlagshipContract(
  contractAddress: Address
): GenArt721CoreV3 | null {
  const contract = GenArt721CoreV3.bind(contractAddress);
  const coreType = contract.coreType();
  if (coreType == "GenArt721CoreV3") {
    return contract;
  }
  return null;
}

// Returns a V3 engine contract if the contract type is GenArt721CoreV3_Engine,
// otherwise returns null.
function getV3EngineContract(
  contractAddress: Address
): GenArt721CoreV3_Engine | null {
  const contract = GenArt721CoreV3_Engine.bind(contractAddress);
  const coreType = contract.coreType();
  if (coreType == "GenArt721CoreV3_Engine") {
    return contract;
  }
  return null;
}

function refreshContractAtAddress(
  contractAddress: Address,
  timestamp: BigInt
): void {
  const flagshipContract = getV3FlagshipContract(contractAddress);
  if (flagshipContract) {
    refreshContract(flagshipContract, timestamp);
    return;
  }
  const engineContract = getV3EngineContract(contractAddress);
  if (engineContract) {
    refreshContract(engineContract, timestamp);
    return;
  }
  log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
    contractAddress.toHexString()
  ]);
}

// Refresh core contract entity state. Creates new contract in store if one does
// not already exist. Expected to handle any update that emits a
// `PlatformUpdated` event.
// @dev Warning - this does not handle updates where the contract's
// minterFilter is updated. For that, see handleMinterUpdated or handleMinterUpdatedEngine.
function refreshContract<T>(contract: T, timestamp: BigInt): Contract | null {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine
    )
  ) {
    return null;
  }
  let contractEntity = Contract.load(contract._address.toHexString());
  if (!contractEntity) {
    contractEntity = new Contract(contract._address.toHexString());
    contractEntity.createdAt = timestamp;
    contractEntity.mintWhitelisted = [];
    contractEntity.newProjectsForbidden = false;
    contractEntity.nextProjectId = contract.nextProjectId();
  } else {
    // clear the previous admin Whitelisting entity admin was previously defined
    if (contractEntity.admin) {
      // this properly handles the case where previous whitelisting does not exist
      removeWhitelisting(contractEntity.id, contractEntity.admin.toHexString());
    }
  }
  let _admin = contract.admin();
  if (_admin.toHexString() == NULL_ADDRESS) {
    contractEntity.admin = Bytes.fromHexString(NULL_ADDRESS);
  } else {
    let adminACLContract = IAdminACLV0.bind(_admin);
    if (adminACLContract) {
      let superAdminAddress = adminACLContract.superAdmin();
      contractEntity.admin = superAdminAddress;
      addWhitelisting(contractEntity.id, superAdminAddress.toHexString());
    } else {
      log.warning(
        "[WARN] Could not load AdminACL contract at address {}, so set admin for contract {} to null address.",
        [_admin.toHexString(), contract._address.toHexString()]
      );
      contractEntity.admin = Bytes.fromHexString(NULL_ADDRESS);
    }
  }
  contractEntity.type = contract.coreType();
  if (contract instanceof GenArt721CoreV3) {
    // render provider address and percentage are called arblocks* on flagship
    contractEntity.renderProviderAddress = contract.artblocksPrimarySalesAddress();
    contractEntity.renderProviderPercentage = contract.artblocksPrimarySalesPercentage();
    contractEntity.renderProviderSecondarySalesAddress = contract.artblocksSecondarySalesAddress();
    contractEntity.renderProviderSecondarySalesBPS = contract.artblocksSecondarySalesBPS();
    // curation registry exists only on flagship
    contractEntity.curationRegistry = contract.artblocksCurationRegistryAddress();
  } else if (contract instanceof GenArt721CoreV3_Engine) {
    // render provider address and percentage are called renderProvider* on engine
    contractEntity.renderProviderAddress = contract.renderProviderPrimarySalesAddress();
    contractEntity.renderProviderPercentage = contract.renderProviderPrimarySalesPercentage();
    contractEntity.renderProviderSecondarySalesAddress = contract.renderProviderSecondarySalesAddress();
    contractEntity.renderProviderSecondarySalesBPS = contract.renderProviderSecondarySalesBPS();
    // platform provider address and percentage are defined on engine contracts
    contractEntity.enginePlatformProviderAddress = contract.platformProviderPrimarySalesAddress();
    contractEntity.enginePlatformProviderPercentage = contract.platformProviderPrimarySalesPercentage();
    contractEntity.enginePlatformProviderSecondarySalesAddress = contract.platformProviderSecondarySalesAddress();
    contractEntity.enginePlatformProviderSecondarySalesBPS = contract.platformProviderSecondarySalesBPS();
    // automatic approval exists only on engine contracts
    contractEntity.autoApproveArtistSplitProposals = contract.autoApproveArtistSplitProposals();
  }
  contractEntity.nextProjectId = contract.nextProjectId();
  contractEntity.randomizerContract = contract.randomizerContract();
  let _minterContract = contract.minterContract();
  if (_minterContract != Address.zero()) {
    contractEntity.mintWhitelisted = [_minterContract];
  } else {
    contractEntity.mintWhitelisted = [];
  }
  contractEntity.newProjectsForbidden = contract.newProjectsForbidden();
  contractEntity.dependencyRegistry = contract.artblocksDependencyRegistryAddress();

  contractEntity.updatedAt = timestamp;

  contractEntity.save();

  return contractEntity as Contract;
}

// Clear all minter configurations for all of a V3 core contract's projects
function clearAllMinterConfigurations(
  contract: GenArt721CoreV3,
  timestamp: BigInt
): void {
  let contractEntity = loadOrCreateContract(contract, timestamp);
  if (!contractEntity) {
    // this should never happen
    return;
  }

  let startingProjectId = contract.startingProjectId().toI32();
  let nextProjectId = contractEntity.nextProjectId.toI32();
  for (let i = startingProjectId; i < nextProjectId; i++) {
    let fullProjectId = contractEntity.id + "-" + i.toString();
    let project = Project.load(fullProjectId);

    if (project) {
      project.minterConfiguration = null;
      project.updatedAt = timestamp;
      project.save();
    }
  }
}

// Populate all project minter configurations from a given minter filter
function populateAllExistingMinterConfigurations(
  minterFilterContract: MinterFilterV1,
  contract: GenArt721CoreV3,
  timestamp: BigInt
): void {
  // Check the new minter filter for any pre-allowlisted minters and update Projects accordingly
  let numProjectsWithMinters = minterFilterContract.getNumProjectsWithMinters();
  for (
    let i = BigInt.fromI32(0);
    i.lt(numProjectsWithMinters);
    i = i.plus(BigInt.fromI32(1))
  ) {
    let projectAndMinterInfo = minterFilterContract.getProjectAndMinterInfoAt(
      i
    );
    let projectId = projectAndMinterInfo.value0;
    let minterAddress = projectAndMinterInfo.value1;

    let project = Project.load(
      generateContractSpecificId(contract._address, projectId)
    );

    if (project) {
      loadOrCreateAndSetProjectMinterConfiguration(
        project,
        minterAddress,
        timestamp
      );
    }
  }
}

/** END HELPERS ***/
