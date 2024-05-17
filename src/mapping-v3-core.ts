import {
  BigInt,
  store,
  log,
  Address,
  Bytes,
  ByteArray
} from "@graphprotocol/graph-ts";

import {
  Mint,
  ProjectUpdated,
  PlatformUpdated,
  MinterUpdated,
  ProposedArtistAddressesAndSplits as ProposedArtistAddressesAndSplitsEvent,
  AcceptedArtistAddressesAndSplits,
  IGenArt721CoreContractV3_Base,
  ProjectRoyaltySplitterUpdated
} from "../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_Base";

import { IGenArt721CoreContractV3_ProjectFinance } from "../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_ProjectFinance";
import { IGenArt721CoreContractV3_Engine } from "../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_Engine";
import { IGenArt721CoreContractV3_Engine_PreV3p2 } from "../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_Engine_PreV3p2";

import { IMinterFilterV1 } from "../generated/IGenArt721CoreV3_Base/IMinterFilterV1";

import {
  ProjectExternalAssetDependenciesLocked,
  GatewayUpdated,
  ExternalAssetDependencyRemoved,
  ExternalAssetDependencyUpdated
} from "../generated/IGenArt721CoreV3_Engine_Flex/IGenArt721CoreContractV3_Engine_Flex";

import { GenArt721CoreV3 } from "../generated/IGenArt721CoreV3_Base/GenArt721CoreV3";
import { GenArt721CoreV3_Engine } from "../generated/IGenArt721CoreV3_Base/GenArt721CoreV3_Engine";
import { GenArt721CoreV3_Engine_Flex } from "../generated/IGenArt721CoreV3_Engine_Flex/GenArt721CoreV3_Engine_Flex";

import { Transfer } from "../generated/IERC721GenArt721CoreV3Contract/IERC721";

import { OwnershipTransferred } from "../generated/OwnableGenArt721CoreV3Contract/Ownable";

import {
  IAdminACLV0,
  SuperAdminTransferred
} from "../generated/AdminACLV0/IAdminACLV0";

import { MinterFilterV1 } from "../generated/MinterFilterV1/MinterFilterV1";
import { loadOrCreateMinterFilter as legacyLoadOrCreatMinterFilter } from "./legacy-minter-filter-mapping";

import {
  loadOrCreateAndSetProjectMinterConfiguration,
  loadOrCreateMinter,
  loadOrCreateRoyaltySplitterContract
} from "./helpers";

import {
  Project,
  Token,
  Transfer as TokenTransfer,
  Account,
  AccountProject,
  ProjectScript,
  Contract,
  MinterFilter,
  ProposedArtistAddressesAndSplit,
  ProjectExternalAssetDependency,
  ProjectMinterConfiguration,
  PrimaryPurchase
} from "../generated/schema";

import {
  generateAccountProjectId,
  generateProjectIdNumberFromTokenIdNumber,
  generateProjectExternalAssetDependencyId,
  generateContractSpecificId,
  generateProjectScriptId,
  addWhitelisting,
  removeWhitelisting,
  generateTransferId,
  loadOrCreateSharedMinterFilter
} from "./helpers";

import {
  NULL_ADDRESS,
  FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES
} from "./constants";

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
  const contract = getIGenArt721CoreContractV3_BaseContract(event.address);
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

    if (project.minterConfiguration) {
      const minterConfiguration = ProjectMinterConfiguration.load(
        changetype<string>(project.minterConfiguration)
      );

      if (minterConfiguration) {
        const purchaseDetails = new PrimaryPurchase(token.id);
        purchaseDetails.token = token.id;
        purchaseDetails.transactionHash = event.transaction.hash;
        purchaseDetails.minterAddress = changetype<Bytes>(
          ByteArray.fromHexString(minterConfiguration.minter)
        );
        purchaseDetails.currencyAddress = minterConfiguration.currencyAddress;
        purchaseDetails.currencySymbol = minterConfiguration.currencySymbol;
        purchaseDetails.save();
        token.primaryPurchaseDetails = purchaseDetails.id;
      } else {
        log.warning("Minter configuration not found with id: {}", [
          changetype<string>(project.minterConfiguration)
        ]);
      }
    }

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
  const tokenId = generateContractSpecificId(
    event.address,
    event.params.tokenId
  );
  let token = Token.load(tokenId);

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
  }

  let transfer = new TokenTransfer(
    generateTransferId(event.transaction.hash, event.logIndex)
  );
  transfer.transactionHash = event.transaction.hash;
  transfer.to = event.params.to;
  transfer.from = event.params.from;
  transfer.token = tokenId;

  transfer.blockHash = event.block.hash;
  transfer.blockNumber = event.block.number;
  transfer.blockTimestamp = event.block.timestamp;
  transfer.save();
}

// v3.2 core contract Enum ProjectUpdatedFields, encoded as bytes32 Bytes
// ref: https://github.com/ArtBlocks/artblocks-contracts/blob/795a7a52491cd1e6b71ef356c02356740a12c235/packages/contracts/contracts/interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol#L55
export const ENUM_FIELD_PROJECT_COMPLETED = toBytes32Numeric(0);
export const ENUM_FIELD_PROJECT_ACTIVE = toBytes32Numeric(1);
export const ENUM_FIELD_PROJECT_ARTIST_ADDRESS = toBytes32Numeric(2);
export const ENUM_FIELD_PROJECT_PAUSED = toBytes32Numeric(3);
export const ENUM_FIELD_PROJECT_CREATED = toBytes32Numeric(4);
export const ENUM_FIELD_PROJECT_NAME = toBytes32Numeric(5);
export const ENUM_FIELD_PROJECT_ARTIST_NAME = toBytes32Numeric(6);
export const ENUM_FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE = toBytes32Numeric(
  7 as i32
);
export const ENUM_FIELD_PROJECT_DESCRIPTION = toBytes32Numeric(8);
export const ENUM_FIELD_PROJECT_WEBSITE = toBytes32Numeric(9);
export const ENUM_FIELD_PROJECT_LICENSE = toBytes32Numeric(10);
export const ENUM_FIELD_PROJECT_MAX_INVOCATIONS = toBytes32Numeric(11);
export const ENUM_FIELD_PROJECT_SCRIPT = toBytes32Numeric(12);
export const ENUM_FIELD_PROJECT_SCRIPT_TYPE = toBytes32Numeric(13);
export const ENUM_FIELD_PROJECT_ASPECT_RATIO = toBytes32Numeric(14);
export const ENUM_FIELD_PROJECT_BASE_URI = toBytes32Numeric(15);
export const ENUM_FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS = toBytes32Numeric(
  16
);

// pre-v3.2 core contract ProjectUpdatedFields, as their unpadded string values here
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
// field did not exist prior to v3.2, and only uses string here for consistency with other fields
export const FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS =
  "secondaryFinancials";

/**
 * @notice helper function to get the field name for a ProjectUpdated event
 * that handles both string and enum values for the _update field.
 * @param _update bytes32 value of the field emitted in the ProjectUpdated event
 * @returns string field name or null if the field is not recognized
 */
function getProjectUpdatedField(_update: Bytes): string | null {
  // @dev switch/case not supported in AssemblyScript for Bytes type
  if (
    _update.equals(toBytes32(FIELD_PROJECT_ACTIVE)) ||
    _update.equals(ENUM_FIELD_PROJECT_ACTIVE)
  ) {
    return FIELD_PROJECT_ACTIVE;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_ARTIST_ADDRESS)) ||
    _update.equals(ENUM_FIELD_PROJECT_ARTIST_ADDRESS)
  ) {
    return FIELD_PROJECT_ARTIST_ADDRESS;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_ARTIST_NAME)) ||
    _update.equals(ENUM_FIELD_PROJECT_ARTIST_NAME)
  ) {
    return FIELD_PROJECT_ARTIST_NAME;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_ASPECT_RATIO)) ||
    _update.equals(ENUM_FIELD_PROJECT_ASPECT_RATIO)
  ) {
    return FIELD_PROJECT_ASPECT_RATIO;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_BASE_URI)) ||
    _update.equals(ENUM_FIELD_PROJECT_BASE_URI)
  ) {
    return FIELD_PROJECT_BASE_URI;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_COMPLETED)) ||
    _update.equals(ENUM_FIELD_PROJECT_COMPLETED)
  ) {
    return FIELD_PROJECT_COMPLETED;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_CREATED)) ||
    _update.equals(ENUM_FIELD_PROJECT_CREATED)
  ) {
    return FIELD_PROJECT_CREATED;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_DESCRIPTION)) ||
    _update.equals(ENUM_FIELD_PROJECT_DESCRIPTION)
  ) {
    return FIELD_PROJECT_DESCRIPTION;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_LICENSE)) ||
    _update.equals(ENUM_FIELD_PROJECT_LICENSE)
  ) {
    return FIELD_PROJECT_LICENSE;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_MAX_INVOCATIONS)) ||
    _update.equals(ENUM_FIELD_PROJECT_MAX_INVOCATIONS)
  ) {
    return FIELD_PROJECT_MAX_INVOCATIONS;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_NAME)) ||
    _update.equals(ENUM_FIELD_PROJECT_NAME)
  ) {
    return FIELD_PROJECT_NAME;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_PAUSED)) ||
    _update.equals(ENUM_FIELD_PROJECT_PAUSED)
  ) {
    return FIELD_PROJECT_PAUSED;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_SCRIPT)) ||
    _update.equals(ENUM_FIELD_PROJECT_SCRIPT)
  ) {
    return FIELD_PROJECT_SCRIPT;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_SCRIPT_TYPE)) ||
    _update.equals(ENUM_FIELD_PROJECT_SCRIPT_TYPE)
  ) {
    return FIELD_PROJECT_SCRIPT_TYPE;
  } else if (
    _update.equals(
      toBytes32(FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE)
    ) ||
    _update.equals(ENUM_FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE)
  ) {
    return FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE;
  } else if (
    _update.equals(toBytes32(FIELD_PROJECT_WEBSITE)) ||
    _update.equals(ENUM_FIELD_PROJECT_WEBSITE)
  ) {
    return FIELD_PROJECT_WEBSITE;
  } else if (
    _update.equals(
      ENUM_FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS // field did not exist prior to v3.2, so only check enum value
    )
  ) {
    return FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS;
  } else {
    return null;
  }
}

export function handleProjectUpdated(event: ProjectUpdated): void {
  const contract = getIGenArt721CoreContractV3_BaseContract(event.address);
  const update = getProjectUpdatedField(event.params._update);
  // unexpected case: unrecognized update field. Log warning and return early.
  if (!update) {
    log.warning(
      "Unexpected update field for project {} on contract {}, update: {}",
      [
        event.params._projectId.toString(),
        event.address.toHexString(),
        event.params._update.toHexString()
      ]
    );
    return;
  }
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
  } else if (update == FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS) {
    handleProjectProviderSecondaryFinancialsUpdated(
      contract,
      project,
      timestamp
    );
  } else {
    // @dev all possible update fields should be handled above, so this should
    // never be reached. Log a warning and return.
    log.warning(
      "Subgraph issue: Unhandled update field for project {} on contract {} in tx {}",
      [
        project.id,
        event.address.toHexString(),
        event.transaction.hash.toHexString()
      ]
    );
  }
}

/*** PROJECT UPDATED FUNCTIONS ***/
function handleProjectStateDataUpdated(
  contract: IGenArt721CoreContractV3_Base,
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
  contract: IGenArt721CoreContractV3_Base,
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
  contract: IGenArt721CoreContractV3_Base,
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
  contract: IGenArt721CoreContractV3_Base,
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
  contract: IGenArt721CoreContractV3_Base,
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
  contract: IGenArt721CoreContractV3_Base,
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

/**
 * @notice Handle ProjectUpdated event with ENUM_FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS.
 * The enum was introduced in v3.2 and is emitted when a project's provider secondary payment
 * information are updated.
 * @param contract V3 core contract
 * @param project project associated with the event
 * @param timestamp timestamp of the event
 */
function handleProjectProviderSecondaryFinancialsUpdated(
  contract: IGenArt721CoreContractV3_Base,
  project: Project,
  timestamp: BigInt
): void {
  // @dev event added in v3.2, so we can safely assume the contract conforms to
  // the ProjectFinance interface. Use try/catch for redundant safety.
  const contractAsV3_ProjectFinance = IGenArt721CoreContractV3_ProjectFinance.bind(
    contract._address
  );
  const projectFinance = contractAsV3_ProjectFinance.try_projectIdToFinancials(
    project.projectId
  );

  // @dev revert should never happen, so log a warning if it does
  if (projectFinance.reverted) {
    log.warning(
      "Unexpected error: Failed to get project financials for project: {}-{}",
      [contract._address.toHexString(), project.projectId.toString()]
    );
    return;
  }
  // update provider secondary financials on the project entity
  project.renderProviderSecondarySalesAddress =
    projectFinance.value.renderProviderSecondarySalesAddress;
  project.renderProviderSecondarySalesBPS = BigInt.fromI32(
    projectFinance.value.renderProviderSecondarySalesBPS
  );
  project.enginePlatformProviderSecondarySalesAddress =
    projectFinance.value.platformProviderSecondarySalesAddress;
  project.enginePlatformProviderSecondarySalesBPS = BigInt.fromI32(
    projectFinance.value.platformProviderSecondarySalesBPS
  );
  // update and save project entity
  project.updatedAt = timestamp;
  project.save();
}

function createProject(
  contract: IGenArt721CoreContractV3_Base,
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
  project.useHashString = useHashString;
  project.useIpfs = false;

  // populate the project's financial information
  // available on all cores, populated to non-zero value for new projects on v3.2+ cores
  project.royaltyPercentage = contract.projectIdToSecondaryMarketRoyaltyPercentage(
    projectId
  );
  // provider secondary financials are modeled differently on v3.0 and v3.1 vs. v3.2+, handle both cases
  const coreVersion = contractEntity.version;
  // version should never be null on a V3 contract
  if (!coreVersion) {
    log.error(
      "V3 Contract entity for contract {} does not have a version set and has caused a subgraph error.",
      [contract._address.toHexString()]
    );
    return null;
  }
  const isPreV3_2 = getIsPreV3_2(coreVersion as string);
  if (isPreV3_2) {
    if (contractEntity.type == "GenArt721CoreV3") {
      // use the artbocks getter functions (not an Engine contract)
      const contractAsV3_Legacy = GenArt721CoreV3.bind(contract._address);
      project.renderProviderSecondarySalesAddress = contractAsV3_Legacy.artblocksSecondarySalesAddress();
      project.renderProviderSecondarySalesBPS = contractAsV3_Legacy.artblocksSecondarySalesBPS();
      project.enginePlatformProviderSecondarySalesAddress = null;
      project.enginePlatformProviderSecondarySalesBPS = null;
    } else {
      // use the render provider and platform provider getters (it is an Engine contract)
      // populate project provider secondary addresses and BPS for v3.0 and v3.1
      const contractAsV3_PreV3p2 = IGenArt721CoreContractV3_Engine_PreV3p2.bind(
        contract._address
      );
      project.renderProviderSecondarySalesAddress = contractAsV3_PreV3p2.renderProviderSecondarySalesAddress();
      project.renderProviderSecondarySalesBPS = contractAsV3_PreV3p2.renderProviderSecondarySalesBPS();
      project.enginePlatformProviderSecondarySalesAddress = contractAsV3_PreV3p2.platformProviderSecondarySalesAddress();
      project.enginePlatformProviderSecondarySalesBPS = contractAsV3_PreV3p2.platformProviderSecondarySalesBPS();
    }
  } else {
    // populate project provider secondary addresses and BPS for v3.2+.
    // note that projectIdToFinancials is only available on v3.2+ contracts.
    const contractAsV3_2 = IGenArt721CoreContractV3_ProjectFinance.bind(
      contract._address
    );
    const projectFinance = contractAsV3_2.projectIdToFinancials(projectId);
    project.renderProviderSecondarySalesAddress =
      projectFinance.renderProviderSecondarySalesAddress;
    project.renderProviderSecondarySalesBPS = BigInt.fromI32(
      projectFinance.renderProviderSecondarySalesBPS
    );
    project.enginePlatformProviderSecondarySalesAddress =
      projectFinance.platformProviderSecondarySalesAddress;
    project.enginePlatformProviderSecondarySalesBPS = BigInt.fromI32(
      projectFinance.platformProviderSecondarySalesBPS
    );
  }

  project.updatedAt = timestamp;
  project.save();
  return project;
}

function refreshProjectScript(
  contract: IGenArt721CoreContractV3_Base,
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
  // refresh the contract
  refreshContractAtAddress(event.address, event.block.timestamp);
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
  const engineFlexContract = getV3EngineFlexContract(event.address);
  if (engineFlexContract) {
    _handleMinterUpdated(engineFlexContract, event);
    return;
  }
  log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
    event.address.toHexString()
  ]);
}

// helper function for `handleMinterUpdated`
function _handleMinterUpdated<T>(contract: T, event: MinterUpdated): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine ||
      contract instanceof GenArt721CoreV3_Engine_Flex
    )
  ) {
    return;
  }
  // load or create contract entity
  let contractEntity = loadOrCreateContract(contract, event.block.timestamp);
  if (!contractEntity) {
    // this should never happen
    return;
  }

  if (
    contract instanceof GenArt721CoreV3_Engine ||
    contract instanceof GenArt721CoreV3_Engine_Flex
  ) {
    // For Engine contracts, only index minter filters that are in the config
    // and actively being indexed
    // @dev there was a temporarily bugged state caused by some MinterFilters
    // not being indexed immediately after deployment (due to no event being
    // handled during the MinterFilter's deployment transaction). Those states
    // were fixed operationally by re-setting the minter filter on the
    // core contract. And-on MinterFilters now emit an event and are added to
    // the subgraph store during deployment, so we can safely ignore
    // MinterFilters that are not in the store here.
    let minterFilter = MinterFilter.load(
      event.params._currentMinter.toHexString()
    );
    if (!minterFilter) {
      // minter filter is not in config, set minterFilter to null
      contractEntity.minterFilter = null;
      contractEntity.save();
      // refresh contract to update mintWhitelisted
      refreshContract(contract, event.block.timestamp);
      return;
    }
  }

  // Clear the minter config for all projects on core contract when a new
  // minter filter is set
  clearAllMinterConfigurations(contract, event.block.timestamp);

  let newMinterFilterAddress = event.params._currentMinter;
  if (newMinterFilterAddress.toHexString() == Address.zero().toHexString()) {
    // only when MinterFilter is zero address should we should assume
    // the  minter is not a MinterFilter contract
    // update contract entity with null MinterFilter
    contractEntity.minterFilter = null;
    contractEntity.mintWhitelisted = [];
    contractEntity.registeredOn = null;
    // update contract entity and save
    contractEntity.updatedAt = event.block.timestamp;
    contractEntity.save();
    return;
  }
  // we assume the minter is a MinterFilter contract.
  contractEntity.mintWhitelisted = [event.params._currentMinter];
  // branch logic based on if the MinterFilter is a shared MinterFilter, or a
  // legacy MinterFilter
  if (getIsLegacyMinterFilter(newMinterFilterAddress)) {
    // This is a legacy (non-shared) MinterFilter
    // create and save minter filter entity if doesn't exist
    legacyLoadOrCreatMinterFilter(
      newMinterFilterAddress,
      event.block.timestamp
    );
    // safely check that the MinterFilter's core contract is the contract
    // that emitted the event.
    let minterFilterContract = MinterFilterV1.bind(newMinterFilterAddress);
    const coreContractAddressResult = minterFilterContract.try_genArt721CoreAddress();
    if (
      coreContractAddressResult.reverted ||
      coreContractAddressResult.value != event.address
    ) {
      // if the minter filter's core contract is not the contract that emitted
      // the event, then we should null the core contract entity's minterFilter
      // field (since invalid minter filter), keep mintWhitelisted as the
      // new address (technically the new minter could mint) and warn because
      // this is an unintended state.
      contractEntity.minterFilter = null;
      log.warning(
        "[WARN] Invalid minter filter at address {} set on core contract {} - minter filter's core contract is not the contract that emitted the event.",
        [newMinterFilterAddress.toHexString(), contractEntity.id]
      );
    } else {
      // update contract entity with new valid MinterFilter ID
      contractEntity.minterFilter = newMinterFilterAddress.toHexString();
      // legacy MinterFilters have a dummy CoreRegistry with same id as core contract
      contractEntity.registeredOn = event.address.toHexString();
      // sync all pre-set projectMinterConfigurations
      legacyPopulateAllExistingMinterConfigurations(
        minterFilterContract,
        contract,
        event.block.timestamp
      );
    }
  } else {
    // This is a shared MinterFilter
    // create and save minter filter entity if doesn't exist
    const sharedMinterFilter = loadOrCreateSharedMinterFilter(
      newMinterFilterAddress,
      event.block.timestamp
    );
    // update contract entity with new MinterFilter ID
    contractEntity.minterFilter = sharedMinterFilter.id;
    // shared MinterFilters have a non-nullable CoreRegistry
    contractEntity.registeredOn = sharedMinterFilter.coreRegistry;
    // sync all pre-existing projectMinterConfigurations
    let minterFilterContract = IMinterFilterV1.bind(newMinterFilterAddress);
    populateAllExistingMinterConfigurations(
      minterFilterContract,
      contract,
      event.block.timestamp
    );
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
  // refresh the contract to get the latest admin address
  refreshContractAtAddress(event.address, event.block.timestamp);
}

// Handle ProjectRoyaltySplitterUpdated event. This event is emitted when the
// royalty splitter address is updated for a project. Other events trigger the
// update logic for fields other than the royalty splitter address, so this
// event is only used to update the royalty splitter address, and populate the
// royalty splitter contract entity.
// Assigns the project's royalty splitter fields to null if the new address is
// the zero address.
// @dev This event may be emitted BEFORE the ProjectUpdated event that updates
// the project entity with new state data. Therefore, any payment data must be
// sourced from the contract directly, rather than the project entity in the store.
// @dev specifically in the case of a new project, the ProjectUpdated event will
// be reliably emitted before the ProjectRoyaltySplitterUpdated event, ensuring
// the project entity will exist before this handler is called.
export function handleProjectRoyaltySplitterUpdated(
  event: ProjectRoyaltySplitterUpdated
): void {
  const project = Project.load(
    generateContractSpecificId(event.address, event.params.projectId)
  );

  if (!project) {
    log.warning(
      "Project not found for ProjectRoyaltySplitterUpdated event on project {}-{}",
      [event.address.toHexString(), event.params.projectId.toString()]
    );
    return;
  }

  // assign + create the royalty splitter contract entity if it doesn't exist
  const royaltySplitterContractId = event.params.royaltySplitter.toHexString();
  // assign the new royalty splitter address or null if the address is zero
  if (royaltySplitterContractId == Address.zero().toHexString()) {
    project.erc2981SplitterAddress = null;
    project.erc2981SplitterContract = null;
  } else {
    loadOrCreateRoyaltySplitterContract(
      royaltySplitterContractId,
      project,
      event.block.timestamp
    );
    project.erc2981SplitterAddress = event.params.royaltySplitter;
    project.erc2981SplitterContract = royaltySplitterContractId;
  }
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleExternalAssetDependencyUpdated(
  event: ExternalAssetDependencyUpdated
): void {
  const engineFlexContract = getV3EngineFlexContract(event.address);

  if (!engineFlexContract) {
    log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
      event.address.toHexString()
    ]);
    return;
  }
  let project = Project.load(
    generateContractSpecificId(event.address, event.params._projectId)
  );

  if (!project) {
    log.warning(
      "Project not found for ExternalAssetDependencyUpdated event",
      []
    );
    return;
  }

  const assetEntity = new ProjectExternalAssetDependency(
    generateProjectExternalAssetDependencyId(
      project.id,
      event.params._index.toString()
    )
  );
  assetEntity.cid = event.params._cid;
  assetEntity.project = project.id;
  assetEntity.index = event.params._index;
  assetEntity.dependencyType =
    FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[event.params._dependencyType];

  if (assetEntity.dependencyType === "ONCHAIN") {
    const projextExternalAssetDependency = engineFlexContract.projectExternalAssetDependencyByIndex(
      event.params._projectId,
      event.params._index
    );
    assetEntity.bytecodeAddress =
      projextExternalAssetDependency.bytecodeAddress;
    assetEntity.data = projextExternalAssetDependency.data;
  }

  assetEntity.save();

  project.externalAssetDependencyCount = BigInt.fromI32(
    event.params._externalAssetDependencyCount
  );
  project.updatedAt = event.block.timestamp;
  project.save();
}

/**
 * Based on the way external asset dependency removal is implement on the contract
 * we can always assume that the last index is the one being removed.
 */
export function handleExternalAssetDependencyRemoved(
  event: ExternalAssetDependencyRemoved
): void {
  const engineFlexContract = getV3EngineFlexContract(event.address);

  if (!engineFlexContract) {
    log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
      event.address.toHexString()
    ]);
    return;
  }

  let project = Project.load(
    generateContractSpecificId(event.address, event.params._projectId)
  );

  if (!project) {
    log.warning(
      "Project not found for ExternalAssetDependencyRemoved event",
      []
    );
    return;
  }

  // Remove last asset entity on the project
  const lastEntityIndex = project.externalAssetDependencyCount.minus(
    BigInt.fromI32(1)
  );
  const entity = ProjectExternalAssetDependency.load(
    generateProjectExternalAssetDependencyId(
      project.id,
      lastEntityIndex.toString()
    )
  );

  if (entity) {
    store.remove("ProjectExternalAssetDependency", entity.id);
  }

  // Refresh project external asset dependencies
  for (
    let index = BigInt.fromI32(0);
    index < lastEntityIndex;
    index = index.plus(BigInt.fromI32(1))
  ) {
    const assetEntity = new ProjectExternalAssetDependency(
      generateProjectExternalAssetDependencyId(project.id, index.toString())
    );

    const contractExternalAsset = engineFlexContract.projectExternalAssetDependencyByIndex(
      project.projectId,
      index
    );

    assetEntity.cid = contractExternalAsset.cid;
    assetEntity.project = project.id;
    assetEntity.index = index;
    assetEntity.dependencyType =
      FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[
        contractExternalAsset.dependencyType
      ];
    if (assetEntity.dependencyType === "ONCHAIN") {
      assetEntity.bytecodeAddress = contractExternalAsset.bytecodeAddress;
      assetEntity.data = contractExternalAsset.data;
    }
    assetEntity.save();
  }

  // lastEntityIndex is previous external asset dependecy count - 1
  project.externalAssetDependencyCount = lastEntityIndex;
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleGatewayUpdated(event: GatewayUpdated): void {
  const engineFlexContract = getV3EngineFlexContract(event.address);

  if (!engineFlexContract) {
    log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
      event.address.toHexString()
    ]);
    return;
  }

  let contractEntity = Contract.load(event.address.toHexString());

  if (!contractEntity) {
    log.warning("Contract not found for GatewayUpdated event", []);
    return;
  }
  const dependencyType =
    FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[event.params._dependencyType];
  if (dependencyType === "IPFS") {
    contractEntity.preferredIPFSGateway = event.params._gatewayAddress;
  } else {
    contractEntity.preferredArweaveGateway = event.params._gatewayAddress;
  }
  contractEntity.updatedAt = event.block.timestamp;
  contractEntity.save();
}

export function handleProjectExternalAssetDependenciesLocked(
  event: ProjectExternalAssetDependenciesLocked
): void {
  const engineFlexContract = getV3EngineFlexContract(event.address);

  if (!engineFlexContract) {
    log.warning("[WARN] Unknown V3 coreType for contract at address {}.", [
      event.address.toHexString()
    ]);
    return;
  }

  let project = Project.load(
    generateContractSpecificId(event.address, event.params._projectId)
  );

  if (!project) {
    log.warning(
      "Project not found for ProjectExternalAssetDependenciesLocked event",
      []
    );
    return;
  }

  project.externalAssetDependenciesLocked = true;
  project.updatedAt = event.block.timestamp;
  project.save();
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
      contract instanceof GenArt721CoreV3_Engine ||
      contract instanceof GenArt721CoreV3_Engine_Flex
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

// Returns an IGenArt721CoreContractV3_Base contract
// @dev assumes the contract conforms to the IGenArt721CoreContractV3_Base
// interface
function getIGenArt721CoreContractV3_BaseContract(
  contractAddress: Address
): IGenArt721CoreContractV3_Base {
  const contract = IGenArt721CoreContractV3_Base.bind(contractAddress);
  return contract;
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

function getV3EngineFlexContract(
  contractAddress: Address
): GenArt721CoreV3_Engine_Flex | null {
  const contract = GenArt721CoreV3_Engine_Flex.bind(contractAddress);
  const coreType = contract.coreType();
  if (coreType == "GenArt721CoreV3_Engine_Flex") {
    return contract;
  }
  return null;
}

export function refreshContractAtAddress(
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

  const engineFlexContract = getV3EngineFlexContract(contractAddress);
  if (engineFlexContract) {
    refreshContract(engineFlexContract, timestamp);
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
      contract instanceof GenArt721CoreV3_Engine ||
      contract instanceof GenArt721CoreV3_Engine_Flex
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
    contractEntity.registeredOn = null;
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
    const superAdmingResult = adminACLContract.try_superAdmin();
    if (!superAdmingResult.reverted) {
      const superAdminAddress = superAdmingResult.value;
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
  const coreVersion = contract.coreVersion();
  contractEntity.version = coreVersion;
  const isEngineOrEngineFlex =
    contract instanceof GenArt721CoreV3_Engine ||
    contract instanceof GenArt721CoreV3_Engine_Flex;
  if (contract instanceof GenArt721CoreV3) {
    // render provider address and percentage are called arblocks* on flagship
    contractEntity.renderProviderAddress = contract.artblocksPrimarySalesAddress();
    contractEntity.renderProviderPercentage = contract.artblocksPrimarySalesPercentage();
    // secondary sales are defined on the projects after release of v3.2 core contracts
    const renderProviderSecondarySalesAddress = contract.artblocksSecondarySalesAddress();
    const renderProviderSecondarySalesBPS = contract.artblocksSecondarySalesBPS();
    // detect if secondary sales payment info have changed
    const platformSecondaryHaveChanged =
      !contractEntity.renderProviderSecondarySalesAddress ||
      Address.fromBytes(
        contractEntity.renderProviderSecondarySalesAddress as Bytes // @dev casting shouldn't be necessary, but is required to compile
      ).toHexString() != renderProviderSecondarySalesAddress.toHexString() ||
      !contractEntity.renderProviderSecondarySalesBPS ||
      (contractEntity.renderProviderSecondarySalesBPS as BigInt) != // @dev casting shouldn't be necessary, but is required to compile
        renderProviderSecondarySalesBPS;
    if (platformSecondaryHaveChanged) {
      // @dev DEPRECATED-START ---
      contractEntity.renderProviderSecondarySalesAddress = renderProviderSecondarySalesAddress;
      contractEntity.renderProviderSecondarySalesBPS = renderProviderSecondarySalesBPS;
      // @dev DEPRECATED-END ---
      contractEntity.defaultRenderProviderSecondarySalesAddress = renderProviderSecondarySalesAddress;
      contractEntity.defaultRenderProviderSecondarySalesBPS = renderProviderSecondarySalesBPS;
      // secondary sales are defined on the projects after release of v3.2 core contracts
      const startingProjectId = contract.startingProjectId();
      let nextProjectId = contract.nextProjectId();
      // iterate over every project and update the platform and render provider secondary sales info
      for (
        let i = startingProjectId;
        i.lt(nextProjectId);
        i = i.plus(BigInt.fromI32(1))
      ) {
        let fullProjectId = contractEntity.id + "-" + i.toString();
        let project = Project.load(fullProjectId);
        if (project) {
          project.renderProviderSecondarySalesAddress = renderProviderSecondarySalesAddress;
          project.renderProviderSecondarySalesBPS = renderProviderSecondarySalesBPS;
          project.updatedAt = timestamp;
          project.save();
        }
      }
    }
    // curation registry exists on flagship
    contractEntity.curationRegistry = contract.artblocksCurationRegistryAddress();
    // flagship never auto approves artist split proposals for all changes
    contractEntity.autoApproveArtistSplitProposals = false;
  } else if (isEngineOrEngineFlex) {
    // flex specific fields are not refreshed here due to flex specific handlers updating all relevant fields on their own
    // render provider address and percentage are called renderProvider* on engine
    // platform provider address and percentage are defined on engine contracts
    contractEntity.renderProviderAddress = contract.renderProviderPrimarySalesAddress();
    contractEntity.renderProviderPercentage = contract.renderProviderPrimarySalesPercentage();
    contractEntity.enginePlatformProviderAddress = contract.platformProviderPrimarySalesAddress();
    contractEntity.enginePlatformProviderPercentage = contract.platformProviderPrimarySalesPercentage();
    // secondary sales are defined on the projects after release of v3.2 core contracts
    const isPreV3_2 = getIsPreV3_2(coreVersion as string);
    if (isPreV3_2) {
      const preV3_2Contract = IGenArt721CoreContractV3_Engine_PreV3p2.bind(
        contract._address
      );
      const renderProviderSecondarySalesAddress = preV3_2Contract.renderProviderSecondarySalesAddress();
      const renderProviderSecondarySalesBPS = preV3_2Contract.renderProviderSecondarySalesBPS();
      const enginePlatformProviderSecondarySalesAddress = preV3_2Contract.platformProviderSecondarySalesAddress();
      const enginePlatformProviderSecondarySalesBPS = preV3_2Contract.platformProviderSecondarySalesBPS();
      // detect if secondary sales payment info have changed (to prevent unnecessary updates)
      let platformSecondaryHaveChanged =
        !contractEntity.renderProviderSecondarySalesAddress ||
        Address.fromBytes(
          contractEntity.renderProviderSecondarySalesAddress as Bytes // @dev casting shouldn't be necessary, but is required to compile
        ).toHexString() != renderProviderSecondarySalesAddress.toHexString() ||
        !contractEntity.renderProviderSecondarySalesBPS ||
        (contractEntity.renderProviderSecondarySalesBPS as BigInt) != // @dev casting shouldn't be necessary, but is required to compile
          renderProviderSecondarySalesBPS ||
        !contractEntity.enginePlatformProviderSecondarySalesAddress ||
        Address.fromBytes(
          contractEntity.enginePlatformProviderSecondarySalesAddress as Bytes // @dev casting shouldn't be necessary, but is required to compile
        ).toHexString() !=
          enginePlatformProviderSecondarySalesAddress.toHexString() ||
        !contractEntity.enginePlatformProviderSecondarySalesBPS ||
        (contractEntity.enginePlatformProviderSecondarySalesBPS as BigInt) != // @dev casting shouldn't be necessary, but is required to compile
          enginePlatformProviderSecondarySalesBPS;
      if (platformSecondaryHaveChanged) {
        // @dev DEPRECATED-START ---
        contractEntity.renderProviderSecondarySalesAddress = renderProviderSecondarySalesAddress;
        contractEntity.renderProviderSecondarySalesBPS = renderProviderSecondarySalesBPS;
        contractEntity.enginePlatformProviderSecondarySalesAddress = enginePlatformProviderSecondarySalesAddress;
        contractEntity.enginePlatformProviderSecondarySalesBPS = enginePlatformProviderSecondarySalesBPS;
        // @dev DEPRECATED-END ---
        // set defaults to the contract-level fields for pre-v3.2 contracts
        contractEntity.defaultRenderProviderSecondarySalesAddress = renderProviderSecondarySalesAddress;
        contractEntity.defaultRenderProviderSecondarySalesBPS = renderProviderSecondarySalesBPS;
        contractEntity.defaultEnginePlatformProviderSecondarySalesAddress = enginePlatformProviderSecondarySalesAddress;
        contractEntity.defaultEnginePlatformProviderSecondarySalesBPS = enginePlatformProviderSecondarySalesBPS;
        // secondary sales are defined on the projects after release of v3.2 core contracts
        const startingProjectId = contract.startingProjectId();
        let nextProjectId = contract.nextProjectId();
        // iterate over every project and update the platform and render provider secondary sales info
        for (
          let i = startingProjectId;
          i.lt(nextProjectId);
          i = i.plus(BigInt.fromI32(1))
        ) {
          let fullProjectId = contractEntity.id + "-" + i.toString();
          let project = Project.load(fullProjectId);
          if (project) {
            project.renderProviderSecondarySalesAddress = renderProviderSecondarySalesAddress;
            project.renderProviderSecondarySalesBPS = renderProviderSecondarySalesBPS;
            project.enginePlatformProviderSecondarySalesAddress = enginePlatformProviderSecondarySalesAddress;
            project.enginePlatformProviderSecondarySalesBPS = enginePlatformProviderSecondarySalesBPS;
            project.updatedAt = timestamp;
            project.save();
          }
        }
      }
    } else {
      // assign defaults to the contract-level fields for v3.2+ contracts
      const V3_2Contract = IGenArt721CoreContractV3_Engine.bind(
        contract._address
      );
      const defaultRenderProviderSecondarySalesAddress = V3_2Contract.defaultRenderProviderSecondarySalesAddress();
      const defaultRenderProviderSecondarySalesBPS = V3_2Contract.defaultRenderProviderSecondarySalesBPS();
      const defaultEnginePlatformProviderSecondarySalesAddress = V3_2Contract.defaultPlatformProviderSecondarySalesAddress();
      const defaultEnginePlatformProviderSecondarySalesBPS = V3_2Contract.defaultPlatformProviderSecondarySalesBPS();
      // @dev no need to optimally detect if secondary sales payment info have changed, as we are setting defaults
      // and not iterating over all projects on the contract

      // backwards-compatible deprecated fields
      // @dev DEPRECATED-START ---
      contractEntity.renderProviderSecondarySalesAddress = defaultRenderProviderSecondarySalesAddress;
      contractEntity.renderProviderSecondarySalesBPS = defaultRenderProviderSecondarySalesBPS;
      contractEntity.enginePlatformProviderSecondarySalesAddress = defaultEnginePlatformProviderSecondarySalesAddress;
      contractEntity.enginePlatformProviderSecondarySalesBPS = defaultEnginePlatformProviderSecondarySalesBPS;
      // @dev DEPRECATED-END ---
      // set defaults to the default values for v3.2+ contracts
      contractEntity.defaultRenderProviderSecondarySalesAddress = defaultRenderProviderSecondarySalesAddress;
      contractEntity.defaultRenderProviderSecondarySalesBPS = defaultRenderProviderSecondarySalesBPS;
      contractEntity.defaultEnginePlatformProviderSecondarySalesAddress = defaultEnginePlatformProviderSecondarySalesAddress;
      contractEntity.defaultEnginePlatformProviderSecondarySalesBPS = defaultEnginePlatformProviderSecondarySalesBPS;
      // project-level secondary sales are defined on the projects after release of v3.2 core contracts, so we don't need to update them here

      // v3.2+ contracts have a royalty split provider
      // @dev use try for extra safety and error handling/logging
      const splitProviderResult = V3_2Contract.try_splitProvider();
      if (splitProviderResult.reverted) {
        log.error(
          "[ERROR] Unexpected on v3.2+ core contract. Could not load split provider for contract at address {}.",
          [contract._address.toHexString()]
        );
        throw new Error("Could not load split provider for v3.2+ contract.");
      }
      contractEntity.royaltySplitProvider = splitProviderResult.value;
    }
    // null curation registry on engine contracts
    contractEntity.curationRegistry = null;
    // automatic approval exists on engine contracts
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
  contractEntity.updatedAt = timestamp;

  contractEntity.save();

  return contractEntity as Contract;
}

// Clear all minter configurations for all of a V3 core contract's projects
function clearAllMinterConfigurations<T>(contract: T, timestamp: BigInt): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine ||
      contract instanceof GenArt721CoreV3_Engine_Flex
    )
  ) {
    return;
  }
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

// Populate all project minter configurations from a given MinterFilterV1
function legacyPopulateAllExistingMinterConfigurations<T>(
  minterFilterContract: MinterFilterV1,
  contract: T,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine ||
      contract instanceof GenArt721CoreV3_Engine_Flex
    )
  ) {
    return;
  }
  // Check the new minter filter for any pre-allowlisted minters and update Projects accordingly
  const numProjectsWithMintersResult = minterFilterContract.try_getNumProjectsWithMinters();
  if (numProjectsWithMintersResult.reverted) {
    log.warning(
      "[WARN] MinterFilter at address {} does not implement getNumProjectsWithMinters() function.",
      [minterFilterContract._address.toHexString()]
    );
    return;
  }
  let numProjectsWithMinters = numProjectsWithMintersResult.value;
  for (
    let i = BigInt.fromI32(0);
    i.lt(numProjectsWithMinters);
    i = i.plus(BigInt.fromI32(1))
  ) {
    const projectAndMinterInfoResult = minterFilterContract.try_getProjectAndMinterInfoAt(
      i
    );
    if (projectAndMinterInfoResult.reverted) {
      log.warning(
        "[WARN] MinterFilter at address {} reverts getProjectAndMinterInfoAt(uint256) function for arg value {}.",
        [i.toString()]
      );
      continue;
    }
    const projectAndMinterInfo = projectAndMinterInfoResult.value;
    const projectId = projectAndMinterInfo.value0;
    const minterAddress = projectAndMinterInfo.value1;

    const project = Project.load(
      generateContractSpecificId(contract._address, projectId)
    );

    if (project) {
      const minter = loadOrCreateMinter(minterAddress, timestamp);
      loadOrCreateAndSetProjectMinterConfiguration(project, minter, timestamp);
    }
  }
}

/**
 * Populate all project minter configurations from a given shared MinterFilter
 * (e.g. IMinterFilterV1)
 * @dev for legacy minter filters, use function
 * legacyPopulateAllExistingMinterConfigurations
 */
function populateAllExistingMinterConfigurations<T>(
  minterFilterContract: IMinterFilterV1,
  contract: T,
  timestamp: BigInt
): void {
  if (
    !(
      contract instanceof GenArt721CoreV3 ||
      contract instanceof GenArt721CoreV3_Engine ||
      contract instanceof GenArt721CoreV3_Engine_Flex
    )
  ) {
    return;
  }
  // Check the new minter filter for any pre-allowlisted minters and update Projects accordingly
  const numProjectsWithMintersResult = minterFilterContract.try_getNumProjectsOnContractWithMinters(
    contract._address
  );
  if (numProjectsWithMintersResult.reverted) {
    log.warning(
      "[WARN] MinterFilter at address {} does not implement getNumProjectsWithMinters() function.",
      [minterFilterContract._address.toHexString()]
    );
    return;
  }
  const numProjectsWithMinters = numProjectsWithMintersResult.value;
  for (
    let i = BigInt.fromI32(0);
    i.lt(numProjectsWithMinters);
    i = i.plus(BigInt.fromI32(1))
  ) {
    const projectAndMinterInfoResult = minterFilterContract.try_getProjectAndMinterInfoOnContractAt(
      contract._address,
      i
    );
    if (projectAndMinterInfoResult.reverted) {
      log.warning(
        "[WARN] MinterFilter at address {} reverts getProjectAndMinterInfoOnContractAt(address,uint256) function for arg values {}, {}.",
        [contract._address.toHexString(), i.toString()]
      );
      continue;
    }
    const projectAndMinterInfo = projectAndMinterInfoResult.value;
    const projectId = projectAndMinterInfo.value0;

    const project = Project.load(
      generateContractSpecificId(contract._address, projectId)
    );

    if (project) {
      const minterAddress = projectAndMinterInfo.value1;
      const minter = loadOrCreateMinter(minterAddress, timestamp);
      loadOrCreateAndSetProjectMinterConfiguration(project, minter, timestamp);
    }
  }
}

/**
 * Helper function that determines if a minter filter at address `minterFilterAddress`
 * is a legacy MinterFilter (non-shared) or not.
 * @dev the logic in this function maneuvers around the fact that MinterFilterV0, and
 * SOME MinterFilterV1 do not implement the `minterFilterType()` external function.
 * behavior when called.
 * @param minterFilterAddress
 * @returns true if the minter filter is a legacy MinterFilter, false otherwise.
 */
function getIsLegacyMinterFilter(minterFilterAddress: Address): boolean {
  // optimistically bind to IMinterFilterV1 and check the minterFilterType() function
  // @dev MinterFilterV0 and V1 sometimes do not implement this function
  let minterFilterContract = IMinterFilterV1.bind(minterFilterAddress);
  let minterFilterTypeResult = minterFilterContract.try_minterFilterType();
  if (minterFilterTypeResult.reverted) {
    // only legacy MinterFilters don't implement the minterFilterType() function,
    // so we can assume this is a legacy MinterFilter
    return true;
  }
  // if the minter filter does implement the minterFilterType() function, then
  // we can assume it is only a legacy minter filter if the minterFilterType()
  // function returns "MinterFilterV1" (since MinterFilterV0 does not implement,
  // and MinterFilterV1 SOMETIMES returns "MinterFilterV1")
  return minterFilterTypeResult.value == "MinterFilterV1";
}

/**
 * @notice helper function to determine if a given version string is pre-v3.2
 * for a given V3 core contract's version string.
 * @param version version string of V3 core contract
 * @returns boolean, true if the version is pre-v3.2, false otherwise.
 */
function getIsPreV3_2(version: string): boolean {
  return version.startsWith("v3.0.") || version.startsWith("v3.1.");
}

/**
 * @notice helper function to convert a string value to a Bytes32 value.
 * @dev string values are UTF-8 encoded, little-endian, so pads to right with 0s
 * @param value string value to convert
 * @returns Bytes result, 32 bytes long (consistent with typing in Subgraph utils)
 */
export function toBytes32(value: string): Bytes {
  // string values are UTF-8 encoded, little-endian, so padEnd
  return Bytes.fromHexString(
    "0x" +
      Bytes.fromUTF8(value)
        .toHexString()
        .slice(2)
        .padEnd(64, "0")
  );
}

/**
 * @notice helper function to convert a numeric i32 value to a Bytes32 value.
 * @dev numeric values are big-endian, so pads to left with 0s
 * @param value numeric value to convert (i32)
 * @returns Bytes result, 32 bytes long (consistent with typing in Subgraph utils)
 */
function toBytes32Numeric(value: i32): Bytes {
  // enum values are numeric, big-endian, so padStart
  return Bytes.fromHexString(
    "0x" +
      Bytes.fromI32(value)
        .toHexString()
        .slice(2)
        .padStart(64, "0")
  );
}

/** END HELPERS ***/
