import { BigInt, store, log, Address, Bytes } from "@graphprotocol/graph-ts";

import {
  GenArt721CoreV3,
  Mint,
  ProjectUpdated,
  Transfer,
  PlatformUpdated,
  MinterUpdated,
  ProposedArtistAddressesAndSplits as ProposedArtistAddressesAndSplitsEvent,
  AcceptedArtistAddressesAndSplits,
  OwnershipTransferred
} from "../generated/GenArt721CoreV3/GenArt721CoreV3";

import {
  IAdminACLV0,
  SuperAdminTransferred
} from "../generated/AdminACLV0/IAdminACLV0";

import { MinterFilterV0 } from "../generated/MinterFilterV0/MinterFilterV0";
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
  ProposedArtistAddressesAndSplits
} from "../generated/schema";

import {
  generateAccountProjectId,
  generateProjectIdNumberFromTokenIdNumber,
  generateContractSpecificId,
  generateProjectScriptId,
  addWhitelisting
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
      let contract = GenArt721CoreV3.bind(contractAddress);
      refreshContract(contract, event.block.timestamp);
    }
  }
}

export function handleMint(event: Mint): void {
  let contract = GenArt721CoreV3.bind(event.address);

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
  let contract = GenArt721CoreV3.bind(event.address);
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
function handleProjectStateDataUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectStateData = contract.try_projectStateData(project.projectId);
  if (!projectStateData.reverted) {
    project.active = projectStateData.value.getActive();
    project.maxInvocations = projectStateData.value.getMaxInvocations();
    project.paused = projectStateData.value.getPaused();
    project.updatedAt = timestamp;
    project.save();
  }
}

function handleProjectArtistAddressUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectArtistAddress = contract.try_projectIdToArtistAddress(
    project.projectId
  );
  if (!projectArtistAddress.reverted) {
    project.artistAddress = projectArtistAddress.value;
    project.updatedAt = timestamp;
    project.save();
  }
}

function handleProjectDetailsUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
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

function handleProjectScriptDetailsUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
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

function handleProjectBaseURIUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
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

function handleProjectSecondaryMarketRoyaltyPercentageUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectSecondaryMarketRoyaltyPercentage = contract.try_projectIdToSecondaryMarketRoyaltyPercentage(
    project.projectId
  );
  if (!projectSecondaryMarketRoyaltyPercentage.reverted) {
    project.royaltyPercentage = projectSecondaryMarketRoyaltyPercentage.value;
    project.updatedAt = timestamp;
    project.save();
  }
}

function createProject(
  contract: GenArt721CoreV3,
  projectId: BigInt,
  timestamp: BigInt
): Project | null {
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

function refreshProjectScript(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
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
  let contract = GenArt721CoreV3.bind(event.address);
  refreshContract(contract, event.block.timestamp);
}

// Handle minter updated
// This is an event emitted when a V3 contract's minter is updated.
// @dev for V3, only one minter at a time is allowed, so this event can be
// interpreted as also indicating removal of an existing minter.
// @dev it can be assumed that the minter on V3 is a MinterFilter contract that
// conforms to IMinterFilterV0, unless the minter address is the zero address.
export function handleMinterUpdated(event: MinterUpdated): void {
  let contract = GenArt721CoreV3.bind(event.address);

  let contractEntity = loadOrCreateContract(contract, event.block.timestamp);

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
    let minterFilterContract = MinterFilterV0.bind(event.params._currentMinter);
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
  const proposedArtistAddressesAndSplits = new ProposedArtistAddressesAndSplits(
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
  const existingProposedArtistAddressesAndSplitsId =
    project.proposedArtistAddressesAndSplits;
  if (existingProposedArtistAddressesAndSplitsId === null) {
    // we don't expect this state to be possible, so we should log a warning
    log.warning(
      "[WARN] No proposed artist addresses and splits found on project {}.",
      [entityId]
    );
    return;
  }
  const proposedArtistAddressesAndSplits = ProposedArtistAddressesAndSplits.load(
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
  store.remove("ProposedArtistAddressesAndSplits", entityId);
}

// Handle OwnershipTransferred event, emitted by the Ownable contract.
// This event is updated whenever an admin address is changed.
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let contract = GenArt721CoreV3.bind(event.address);
  // refresh the contract to get the latest admin address
  refreshContract(contract, event.block.timestamp);
}

/*** END EVENT HANDLERS ***/

/*** NO CALL HANDLERS  ***/

/** HELPERS ***/

// loads or creates a contract entity and returns it.
function loadOrCreateContract(
  contract: GenArt721CoreV3,
  timestamp: BigInt
): Contract {
  let contractEntity = Contract.load(contract._address.toHexString());
  if (!contractEntity) {
    contractEntity = refreshContract(contract, timestamp);
  }
  return contractEntity;
}

// loads or creates a MinterFilter entity and returns it.
function loadOrCreateMinterFilter(
  minterFilterContract: MinterFilterV0,
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

// Refresh contract entity state. Creates new contract in store if one does not
// already exist. Expected to handle any update that emits a `PlatformUpdated`
// event.
// @dev Warning - this does not handle updates where the contract's
// minterFilter is updated. For that, see handleMinterUpdated.
function refreshContract(
  contract: GenArt721CoreV3,
  timestamp: BigInt
): Contract {
  let contractEntity = Contract.load(contract._address.toHexString());
  if (!contractEntity) {
    contractEntity = new Contract(contract._address.toHexString());
    contractEntity.createdAt = timestamp;
    contractEntity.mintWhitelisted = [];
    contractEntity.newProjectsForbidden = false;
    contractEntity.nextProjectId = contract.nextProjectId();
  }
  let _admin = contract.admin();
  if (_admin.toHexString() == NULL_ADDRESS) {
    contractEntity.admin = Bytes.fromHexString(NULL_ADDRESS);
    contractEntity.whitelisted = [];
  } else {
    let adminACLContract = IAdminACLV0.bind(_admin);
    let superAdminAddress = adminACLContract.superAdmin();
    contractEntity.admin = superAdminAddress;
    let whitelisting = addWhitelisting(
      contractEntity.id,
      superAdminAddress.toHexString()
    );
    contractEntity.whitelisted = [whitelisting.id];
  }
  contractEntity.type = contract.coreType();
  contractEntity.renderProviderAddress = contract.artblocksPrimarySalesAddress();
  contractEntity.renderProviderPercentage = contract.artblocksPrimarySalesPercentage();
  contractEntity.renderProviderSecondarySalesAddress = contract.artblocksSecondarySalesAddress();
  contractEntity.renderProviderSecondarySalesBPS = contract.artblocksSecondarySalesBPS();
  contractEntity.nextProjectId = contract.nextProjectId();
  contractEntity.randomizerContract = contract.randomizerContract();
  let _minterContract = contract.minterContract();
  if (_minterContract != Address.zero()) {
    contractEntity.mintWhitelisted = [_minterContract];
  } else {
    contractEntity.mintWhitelisted = [];
  }
  contractEntity.newProjectsForbidden = contract.newProjectsForbidden();
  contractEntity.curationRegistry = contract.artblocksCurationRegistryAddress();
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
  minterFilterContract: MinterFilterV0,
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
