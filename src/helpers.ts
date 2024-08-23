import {
  Address,
  BigInt,
  Bytes,
  JSONValue,
  TypedMap,
  store,
  log,
  ByteArray
} from "@graphprotocol/graph-ts";
import { IFilteredMinterV2 } from "../generated/MinterSetPrice/IFilteredMinterV2";
import {
  Minter,
  ProjectMinterConfiguration,
  Project,
  Account,
  Whitelisting,
  Receipt,
  MinterFilter,
  CoreRegistry,
  Contract,
  Token,
  PrimaryPurchase,
  RoyaltySplitterContract,
  RoyaltySplitRecipient
} from "../generated/schema";

import { IMinterFilterV1 } from "../generated/SharedMinterFilter/IMinterFilterV1";
import { IFilteredMinterDALinV1 } from "../generated/MinterDALin/IFilteredMinterDALinV1";
import { IFilteredMinterDAExpV1 } from "../generated/MinterDAExp/IFilteredMinterDAExpV1";

import {
  setMinterExtraMinterDetailsValue,
  setProjectMinterConfigExtraMinterDetailsValue
} from "./extra-minter-details-helpers";
import { createTypedMapFromJSONString } from "./json";

import { KNOWN_MINTER_FILTER_TYPES } from "./constants";
import { Mint as GenArt721Core2PBABMint } from "../generated/GenArt721Core2PBAB/GenArt721Core2PBAB";
import { Mint as GenArt721CoreV1Mint } from "../generated/GenArt721Core/GenArt721Core";
import { IGenArt721CoreContractV3_ProjectFinance } from "../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_ProjectFinance";

export class MinterProjectAndConfig {
  minter: Minter;
  project: Project;
  projectMinterConfiguration: ProjectMinterConfiguration;
}

export function generateProjectExternalAssetDependencyId(
  projectId: string,
  index: string
): string {
  return projectId + "-" + index;
}

export function generateAccountProjectId(
  accountId: string,
  projectId: string
): string {
  return accountId + "-" + projectId;
}

export function generateWhitelistingId(
  contractId: string,
  accountId: string
): string {
  return contractId + "-" + accountId;
}

export function generateMinterFilterContractAllowlistId(
  minterFilterContractAddress: string,
  coreContractAddress: string
): string {
  return minterFilterContractAddress + "-" + coreContractAddress;
}

export function generateProjectIdNumberFromTokenIdNumber(
  tokenId: BigInt
): BigInt {
  return tokenId.div(BigInt.fromI32(1000000));
}

export function generateSEAMinterBidId(
  minterAddress: string,
  bidderAddress: string,
  bidAmount: string,
  tokenId: string
): string {
  return minterAddress + "-" + bidderAddress + "-" + bidAmount + "-" + tokenId;
}

export function generateRAMMinterBidId(
  minterAddress: string,
  projectId: string,
  bidId: string
): string {
  return minterAddress + "-" + projectId + "-" + bidId;
}

export function generateContractSpecificId(
  contractAddress: Address,
  entityId: BigInt
): string {
  return contractAddress.toHexString() + "-" + entityId.toString();
}

export function generateDependencyAdditionalCDNId(
  dependencyId: string,
  index: BigInt
): string {
  return dependencyId + "-" + index.toString();
}

export function generateDependencyAdditionalRepositoryId(
  dependencyId: string,
  index: BigInt
): string {
  return dependencyId + "-" + index.toString();
}

export function generateDependencyScriptId(
  dependencyId: string,
  index: BigInt
): string {
  return dependencyId + "-" + index.toString();
}

// returns new whitelisting id
export function addWhitelisting(contractId: string, accountId: string): void {
  let account = new Account(accountId);
  account.save();

  let whitelisting = new Whitelisting(
    generateWhitelistingId(contractId, account.id)
  );
  whitelisting.account = account.id;
  whitelisting.contract = contractId;

  whitelisting.save();
}

export function removeWhitelisting(
  contractId: string,
  accountId: string
): void {
  let account = new Account(accountId);

  let whitelistingId = generateWhitelistingId(contractId, account.id);
  let whitelisting = Whitelisting.load(whitelistingId);

  if (whitelisting) {
    store.remove("Whitelisting", whitelistingId);
  }
}

export function generateProjectScriptId(
  projectId: string,
  scriptIndex: BigInt
): string {
  return projectId + "-" + scriptIndex.toString();
}

export function getProjectMinterConfigId(
  minterId: string,
  projectId: string
): string {
  // projectId is the contract-specific id, not the number of the project
  return minterId + "-" + projectId;
}

// @dev projectId is the id of a Project entity, i.e. contract-specific id
export function getReceiptId(
  minterId: string,
  projectId: string,
  accountAddress: Address
): string {
  return minterId + "-" + projectId + "-" + accountAddress.toHexString();
}

/**
 * Load or create a RoyaltySplitterContract entity, referencing a project actively using the contract
 * in case it needs to be created.
 * Handles case where the zero address is passed in as the royalty splitter id, and
 * will result in a RoyaltySplitterContract entity with a zero address id and no associated
 * recipients, which is a fair representation of the state of the contract.
 * @dev Due to ordering of events, this function does NOT source payment state from
 * project entity in store, because the project entity may not be up-to-date.
 * Instead, it sources payment state via call to the contract directly.
 * @dev Royalty splitter configuration is assumed to be immutable.
 * @dev Assumes project is on a v3.2+ contract, which are the only contracts that support a royalty split provider field.
 * @param royaltySplitterId Royalty splitter contract address
 * @param project Project entity actively using the royalty splitter
 * @param timestamp
 * @returns RoyaltySplitterContract entity (either loaded or created)
 */
export function loadOrCreateRoyaltySplitterContract(
  royaltySplitterId: string,
  project: Project,
  timestamp: BigInt
): RoyaltySplitterContract {
  let royaltySplitterContract = RoyaltySplitterContract.load(royaltySplitterId);
  if (royaltySplitterContract) {
    // already exists, so return
    return royaltySplitterContract;
  }

  // create and populate new RoyaltySplitterContract entity

  // load the project's contract
  const contract = Contract.load(project.contract);
  if (!contract) {
    // should never happen, because project.contract is a required field
    log.error(
      "[WARN] Could not load contract with id {} when creating RoyaltySplitterContract entity with id {}",
      [project.contract, royaltySplitterId]
    );
    throw new Error("Project entity does not have a contract field.");
  }

  // get project's payment state via call to contract, because project entity may not be up-to-date
  // due to event ordering
  const boundContract = IGenArt721CoreContractV3_ProjectFinance.bind(
    Address.fromString(contract.id)
  );
  const projectFinanceResult = boundContract.try_projectIdToFinancials(
    project.projectId
  );
  if (projectFinanceResult.reverted) {
    // should never happen, all projects with royalty splitters should have financials
    log.error(
      "[WARN] Could not load project financials for project with id {} when creating RoyaltySplitterContract entity with id {}",
      [project.id, royaltySplitterId]
    );
    throw new Error(
      "Could not load project financials for project with id " + project.id
    );
  }
  const projectFinance = projectFinanceResult.value;

  royaltySplitterContract = new RoyaltySplitterContract(royaltySplitterId);
  // @dev v3.2+ contracts always have a populated royaltySplitProvider field
  // @dev already checked for null royaltySplitProvider above, but compiler requires casting
  royaltySplitterContract.splitProviderCreator = contract.royaltySplitProvider as Bytes;
  royaltySplitterContract.coreContract = contract.id;

  // create and populate the royalty recipients and allocations
  // @dev source allocations from core contract to avoid dependency on splitter implementation)
  // @dev define allocations in BPS, since that is sufficient granularity for core contract split definitions
  const artistAllocation = BigInt.fromI32(
    projectFinance.secondaryMarketRoyaltyPercentage
  ).times(
    BigInt.fromI32(100).minus(
      BigInt.fromI32(projectFinance.additionalPayeeSecondarySalesPercentage)
    )
  );
  const additionalAllocation = BigInt.fromI32(
    projectFinance.secondaryMarketRoyaltyPercentage
  ).times(
    BigInt.fromI32(projectFinance.additionalPayeeSecondarySalesPercentage)
  );
  const renderAllocation = BigInt.fromI32(
    projectFinance.renderProviderSecondarySalesBPS
  );
  const platformAllocation = BigInt.fromI32(
    projectFinance.platformProviderSecondarySalesBPS
  );
  // total allocation is sum of all allocations
  royaltySplitterContract.totalAllocation = artistAllocation
    .plus(additionalAllocation)
    .plus(renderAllocation)
    .plus(platformAllocation);
  // seve royaltySplitterContract to store
  royaltySplitterContract.createdAt = timestamp;
  royaltySplitterContract.save();

  // create royalty split recipients
  if (artistAllocation.gt(BigInt.fromI32(0))) {
    createRoyaltySplitRecipient(
      royaltySplitterId,
      projectFinance.artistAddress,
      artistAllocation
    );
  }
  if (additionalAllocation.gt(BigInt.fromI32(0))) {
    createRoyaltySplitRecipient(
      royaltySplitterId,
      projectFinance.additionalPayeeSecondarySales,
      additionalAllocation
    );
  }
  if (renderAllocation.gt(BigInt.fromI32(0))) {
    createRoyaltySplitRecipient(
      royaltySplitterId,
      projectFinance.renderProviderSecondarySalesAddress,
      renderAllocation
    );
  }
  if (platformAllocation.gt(BigInt.fromI32(0))) {
    createRoyaltySplitRecipient(
      royaltySplitterId,
      projectFinance.platformProviderSecondarySalesAddress,
      platformAllocation
    );
  }

  return royaltySplitterContract;
}

/**
 * Creates and saves a RoyaltySplitRecipient entity with the given parameters.
 * Assumes the recipient is a valid address, and the royaltySplitterId exists
 * in the store.
 * Allocation may be arbitrary, but should be correct relative to the totalAllocation
 * of the associated RoyaltySplitterContract.
 * @param royaltySplitterId the associated RoyaltySplitterContract entity id
 * @param recipientAddress the address of the recipient
 * @param allocation the allocation of the recipient. Allocation may be arbitrary,
 * but should be correct relative to the totalAllocation of the associated RoyaltySplitterContract.
 */
function createRoyaltySplitRecipient(
  royaltySplitterId: string,
  recipientAddress: Address,
  allocation: BigInt
): void {
  let recipientId = royaltySplitterId + "-" + recipientAddress.toHexString();
  let recipient = new RoyaltySplitRecipient(recipientId);
  recipient.royaltySplitterContract = royaltySplitterId;
  recipient.recipientAddress = recipientAddress;
  recipient.allocation = allocation;
  recipient.save();
}

// @dev projectId must be the contract-specific id
export function loadOrCreateReceipt(
  minterId: string,
  projectId: string,
  accountAddress: Address,
  timestamp: BigInt
): Receipt {
  let receiptId = getReceiptId(minterId, projectId, accountAddress);
  let receipt = Receipt.load(receiptId);
  if (receipt) {
    return receipt;
  }
  // create new Receipt entity
  receipt = new Receipt(receiptId);
  // populate based on format of receiptId
  receipt.minter = minterId;
  receipt.project = projectId;

  // Make sure the account exists before adding to receipt
  const account = new Account(accountAddress.toHexString());
  account.save();
  receipt.account = accountAddress.toHexString();

  // populate non-nullable values with default solidity values
  receipt.netPosted = BigInt.fromI32(0);
  receipt.numPurchased = BigInt.fromI32(0);
  // save and return
  receipt.updatedAt = timestamp;
  receipt.save();
  return receipt;
}

/**
 * helper function that returns the value of a bid in a given slot index, in Wei.
 * used by the RAM Minter.
 * @param basePrice Base price (or reserve price) of the auction in Wei, string representation
 * @param slotIndex Slot index to query
 * @returns slotBidValue Value of a bid in the slot, in Wei
 */
export function slotIndexToBidValue(
  basePrice: BigInt,
  slotIndex: BigInt
): BigInt {
  // pricing assumes maxPrice = minPrice * 2^8, pseudo-exponential curve
  const slotsPerDouble: BigInt = BigInt.fromI32(512 / 8);
  // Calculate the bit-shift amount by dividing slotIndex and converting result to an exponent
  // for the bit-shifting equivalent
  let shiftAmount: BigInt = slotIndex.div(slotsPerDouble);
  let slotBidValue: BigInt = basePrice.times(
    BigInt.fromI32(2).pow(shiftAmount.toI32() as u8)
  );
  // Perform linear-interpolation for partial half-life points
  let remainder: BigInt = slotIndex.mod(slotsPerDouble);
  slotBidValue = slotBidValue.plus(
    slotBidValue.times(remainder).div(slotsPerDouble)
  );

  return slotBidValue;
}

/**
 * Helper function to load or create a shared minter filter.
 * Assumes:
 *  - the minter filter conforms to IMinterFilterV1 when creating a new minter
 * filter.
 *  - the minterGlobalAllowlist is empty when initializing a new minter filter
 * @returns MinterFilter entity (either loaded or created)
 */
export function loadOrCreateSharedMinterFilter(
  minterFilterAddress: Address,
  timestamp: BigInt
): MinterFilter {
  let minterFilter = MinterFilter.load(minterFilterAddress.toHexString());
  if (minterFilter) {
    return minterFilter;
  }
  // target MinterFilter was not in store, so create new one
  minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  minterFilter.minterGlobalAllowlist = [];
  // safely retrieve the core registry address from the minter filter
  let minterFilterContract = IMinterFilterV1.bind(minterFilterAddress);
  const coreRegistryResult = minterFilterContract.try_coreRegistry();
  let coreRegistryAddress: Address;
  if (coreRegistryResult.reverted) {
    // unexpected minter filter behavior - log a warning, and assign to a dummy
    // core registry at zero address
    log.warning(
      "[WARN] Could not load core registry on MinterFilter contract at address {}, so set core registry to null address on entity.",
      [minterFilterAddress.toHexString()]
    );
    coreRegistryAddress = Address.zero();
  } else {
    coreRegistryAddress = coreRegistryResult.value;
  }
  // load or create the core registry entity, and assign to the minter filter
  const coreRegistry = loadOrCreateCoreRegistry(coreRegistryAddress);
  minterFilter.coreRegistry = coreRegistry.id;

  // populate minter filter type
  // @dev we try to interact with the minter filter as if it conforms to
  // IMinterFilterV1, which has a `minterFilterType` function
  const minterFilterTypeResult = minterFilterContract.try_minterFilterType();
  if (minterFilterTypeResult.reverted) {
    // unexpected minter filter behavior - log a warning, and assume the type
    // is UNKNOWN
    log.warning(
      "[WARN] Unexpectedly could not load minter filter type on MinterFilter contract at address {}, so set minter filter type to UNKNOWN.",
      [minterFilterAddress.toHexString()]
    );
    minterFilter.type = "UNKNOWN";
  } else {
    // validate the returned type is in the enum of valid minter filter types
    if (KNOWN_MINTER_FILTER_TYPES.includes(minterFilterTypeResult.value)) {
      minterFilter.type = minterFilterTypeResult.value;
    } else {
      // unknown minter filter type - log a warning, and label the MinterFilter as UNKNOWN
      log.warning(
        "[WARN] Minter filter type on MinterFilter contract at address {} is not an expected minter filter type, so set minter filter type to UNKNOWN.",
        [minterFilterAddress.toHexString()]
      );
      minterFilter.type = "UNKNOWN";
    }
  }

  minterFilter.updatedAt = timestamp;
  minterFilter.save();

  return minterFilter;
}

/**
 * helper function that loads or creates a CoreRegistry entity in the store.
 * @param address core registry address
 * @returns CoreRegistry entity (either loaded or created)
 */
export function loadOrCreateCoreRegistry(address: Address): CoreRegistry {
  let coreRegistry = CoreRegistry.load(address.toHexString());
  if (coreRegistry) {
    return coreRegistry;
  }
  coreRegistry = new CoreRegistry(address.toHexString());
  coreRegistry.save();
  return coreRegistry;
}

/**
 * Loads or creates a ProjectMinterConfiguration entity for the given project
 * and minter, and sets the project's minter configuration to the new or
 * existing ProjectMinterConfiguration entity.
 * Updates the project's updatedAt to the timestamp, and saves entity.
 * @dev this is intended to support legacy and shared minter filters/minters
 * @param project
 * @param minter
 * @param timestamp
 * @returns
 */
export function loadOrCreateAndSetProjectMinterConfiguration(
  project: Project,
  minter: Minter,
  timestamp: BigInt
): ProjectMinterConfiguration {
  const projectMinterConfig = loadOrCreateProjectMinterConfiguration(
    project,
    minter
  );

  // update the project's minter configuration
  project.updatedAt = timestamp;
  project.minterConfiguration = projectMinterConfig.id;
  project.save();

  return projectMinterConfig;
}

/**
 * Loads or creates a ProjectMinterConfiguration entity for the given project
 * and minter.
 * If a new ProjectMinterConfiguration entity is created, it is assumed that
 * the minter is not pre-configured, and the price is not configured.
 * The project's updatedAt is not updated, and the project is not saved.
 * @param project The project entity
 * @param minter The minter entity
 * @returns
 */
export function loadOrCreateProjectMinterConfiguration(
  project: Project,
  minter: Minter
): ProjectMinterConfiguration {
  const targetProjectMinterConfigId = getProjectMinterConfigId(
    minter.id,
    project.id
  );

  let projectMinterConfig = ProjectMinterConfiguration.load(
    targetProjectMinterConfigId
  );

  if (!projectMinterConfig) {
    // create new project minter config that assumes no pre-configuring
    // @dev if minter data source templates are used, the no pre-configuring
    // assumption must be revisited
    projectMinterConfig = new ProjectMinterConfiguration(
      targetProjectMinterConfigId
    );
    projectMinterConfig.project = project.id;
    projectMinterConfig.minter = minter.id;
    projectMinterConfig.priceIsConfigured = false;
    projectMinterConfig.currencySymbol = "ETH";
    projectMinterConfig.currencyAddress = Address.zero();
    projectMinterConfig.currencyDecimals = 18;
    projectMinterConfig.purchaseToDisabled = false;
    projectMinterConfig.extraMinterDetails = "{}";
    projectMinterConfig.save();
  }
  return projectMinterConfig;
}

// util method to check if a minter is a legacy DALin minter
function isLegacyMinterDALin(minterType: string): boolean {
  return (
    minterType.startsWith("MinterDALin") &&
    (minterType.endsWith("V0") ||
      minterType.endsWith("V1") ||
      minterType.endsWith("V2") ||
      minterType.endsWith("V3") ||
      minterType.endsWith("V4"))
    // @dev V5+ is a shared, non-legacy minter
  );
}

// util method to check if a minter is a legacy DAExp minter
function isLegacyMinterDAExp(minterType: string): boolean {
  if (minterType.startsWith("MinterDAExpSettlement")) {
    // DAExpSettlement minters are legacy if they are V0, V1, or V2
    return (
      minterType.endsWith("V0") ||
      minterType.endsWith("V1") ||
      minterType.endsWith("V2")
    );
  }
  // DAExp minters are legacy if they are V0, V1, V2, V3, or V4
  return (
    minterType.startsWith("MinterDAExp") &&
    (minterType.endsWith("V0") ||
      minterType.endsWith("V1") ||
      minterType.endsWith("V2") ||
      minterType.endsWith("V3") ||
      minterType.endsWith("V4"))
    // @dev V5+ is a shared, non-legacy minter
  );
}

// @dev this is intended to work with legacy (non-shared) and new (shared)
// minters
export function loadOrCreateMinter(
  minterAddress: Address,
  timestamp: BigInt
): Minter {
  let minter = Minter.load(minterAddress.toHexString());
  if (minter) {
    return minter;
  }

  // create new Minter entity
  /**
   * @dev Minter entities are persisted, so populating then entity with any
   * configuration options set outside of the contract's deployment or
   * constructor is not necessary.
   */
  minter = new Minter(minterAddress.toHexString());
  let filteredMinterContract = IFilteredMinterV2.bind(minterAddress);

  // values assigned in contract constructors
  // @dev safely retrieve value, gracefully handle if it reverts
  const minterFilterResult = filteredMinterContract.try_minterFilterAddress();
  if (minterFilterResult.reverted) {
    // if minterFilterAddress() reverts, then the minter is not as expected and
    // we log warning, and assign to dummy MinterFilter entity at zero address
    log.warning(
      "[WARN] Cannot retrieve minter filter address for minter at {}",
      [minterAddress.toHexString()]
    );
    const dummyMinterFilter = loadOrCreateSharedMinterFilter(
      Address.zero(),
      timestamp
    );
    minter.minterFilter = dummyMinterFilter.id;
  } else {
    let minterFilter = MinterFilter.load(
      minterFilterResult.value.toHexString()
    );
    // If this happens, there was likely a mistake approving the minter for a
    // contract with a different associated minter filter. We log a warning,
    // and assign to dummy MinterFilter entity at zero address.
    if (!minterFilter) {
      log.warning(
        "[WARN] Minter at {} has a minter filter address that is not in the store",
        [minterAddress.toHexString()]
      );
      minterFilter = loadOrCreateSharedMinterFilter(Address.zero(), timestamp);
    }
    minter.minterFilter = minterFilter.id;
  }
  minter.extraMinterDetails = "{}";
  // by default, we assume the minter is not allowlisted on its MinterFilter during
  // initialization, and we let the MinterFilter entity handle the allowlisting
  minter.isGloballyAllowlistedOnMinterFilter = false;
  // @dev must populate updatedAt before calling handleSetMinterDetailsGeneric
  // to avoid saving an entity with a null updatedAt value (non-nullable field)
  minter.updatedAt = timestamp;

  // values assigned during contract deployments
  // @dev not required in more recent minters (e.g. MinterSEA) by emitting
  // events during deployment that communicate default minter config values
  let minterType = filteredMinterContract.try_minterType();
  if (!minterType.reverted) {
    minter.type = minterType.value;
    // populate any minter-specific values
    if (isLegacyMinterDALin(minterType.value)) {
      // only do this for legacy minters, because the new minters emit events
      const contract = IFilteredMinterDALinV1.bind(minterAddress);
      setMinterExtraMinterDetailsValue(
        "minimumAuctionLengthInSeconds",
        contract.minimumAuctionLengthSeconds(),
        minter
      );
    } else if (isLegacyMinterDAExp(minterType.value)) {
      const contract = IFilteredMinterDAExpV1.bind(minterAddress);
      setMinterExtraMinterDetailsValue(
        "minimumHalfLifeInSeconds",
        contract.minimumPriceDecayHalfLifeSeconds(),
        minter
      );
      setMinterExtraMinterDetailsValue(
        "maximumHalfLifeInSeconds",
        contract.maximumPriceDecayHalfLifeSeconds(),
        minter
      );
    }
  } else {
    // if minterType() reverts, then the minter is not as expected and is
    // designated as empty string
    minter.type = "";
  }

  minter.save();
  return minter;
}

export function booleanToString(b: boolean): string {
  return b ? "true" : "false";
}

export function getProjectMinterConfigExtraMinterDetailsTypedMap(
  config: ProjectMinterConfiguration
): TypedMap<string, JSONValue> {
  return createTypedMapFromJSONString(config.extraMinterDetails);
}

export function getMinterExtraMinterDetailsTypedMap(
  minter: Minter
): TypedMap<string, JSONValue> {
  return createTypedMapFromJSONString(minter.extraMinterDetails);
}

export function generateTransferId(
  transactionHash: Bytes,
  logIndex: BigInt
): string {
  return transactionHash.toHexString() + "-" + logIndex.toString();
}

export function getCoreContractAddressFromLegacyMinter(
  minter: Minter
): Address | null {
  // get associated core contract address through the minter filter
  const minterFilter = MinterFilter.load(minter.minterFilter);
  if (!minterFilter) {
    log.warning("Error while loading minter filter with id {}", [
      minter.minterFilter
    ]);
    return null;
  }
  return getCoreContractAddressFromLegacyMinterFilter(minterFilter);
}

export function getCoreContractAddressFromLegacyMinterFilter(
  minterFilter: MinterFilter
): Address | null {
  // in the case of non-shared minterFilter, we may assume that the id of
  // the dummy core registry is the single "registered" core contract address
  return Address.fromString(minterFilter.coreRegistry);
}

/**
 * This updates the project's updatedAt if the projectMinterConfig is the
 * active minter configuration for the project.
 * This is a common pattern when a project minter configuration is updated,
 * the project's updatedAt should be updated to induce a sync, but only if the
 * project minter configuration is the active minter configuration for the
 * project.
 * @param project Project entity
 * @param projectMinterConfig ProjectMinterConfiguration entity
 * @param timestamp Timestamp to set the project's updatedAt to, if the
 * projectMinterConfig is the active minter configuration for the project
 */
export function updateProjectIfMinterConfigIsActive(
  project: Project,
  projectMinterConfig: ProjectMinterConfiguration,
  timestamp: BigInt
): void {
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = timestamp;
    project.save();
  }
}

/**
 * Calculates the total auction time for an exponential Dutch auction.
 * @param startPrice The starting price of the auction.
 * @param basePrice The base price of the auction.
 * @param halfLifeSeconds The half life of the auction.
 * @returns The total auction time in seconds.
 **/
export function getTotalDAExpAuctionTime(
  startPrice: BigInt,
  basePrice: BigInt,
  halfLifeSeconds: BigInt
): BigInt {
  const startPriceFloatingPoint = startPrice.toBigDecimal();
  const basePriceFloatingPoint = basePrice.toBigDecimal();
  const priceRatio: f64 = Number.parseFloat(
    startPriceFloatingPoint.div(basePriceFloatingPoint).toString()
  );
  const completedHalfLives = BigInt.fromString(
    u8(Math.floor(Math.log(priceRatio) / Math.log(2))).toString()
  );
  // @dev max possible completedHalfLives is 255 due to on-chain use of uint256,
  // so this is safe
  const completedHalfLivesU8: u8 = u8(
    Number.parseInt(completedHalfLives.toString())
  );
  const x1 = completedHalfLives.times(halfLifeSeconds);
  const x2 = x1.plus(halfLifeSeconds);
  const y1 = startPrice.div(BigInt.fromI32(2).pow(completedHalfLivesU8));
  const y2 = y1.div(BigInt.fromI32(2));
  const totalAuctionTime = x1.plus(
    x2
      .minus(x1)
      .times(basePrice.minus(y1))
      .div(y2.minus(y1))
  );
  return totalAuctionTime;
}

/**
 * helper function to snapshot the state of a project's splits and transaction
 * hash at the time of a revenue withdrawal on a Settlement minter.
 * @dev some of the branch logic and casting here may appear unnecessary/redundant,
 * but it is necessary to avoid compiler errors.
 * @param projectMinterConfig ProjectMinterConfiguration entity
 * @param project Project entity being referenced, on a V3 flagship or engine contract
 * @param txHash Hex string of the transaction hash of the revenue withdrawal
 */
export function snapshotStateAtSettlementRevenueWithdrawal(
  projectMinterConfig: ProjectMinterConfiguration,
  project: Project,
  txHash: string
): void {
  // snapshot splits at time of revenue withdrawal
  // @dev minter is only compatible with V3 core contracts
  const contract = Contract.load(project.contract);
  if (contract) {
    // record tx hash of revenue withdrawal in case of further downstream analysis
    setProjectMinterConfigExtraMinterDetailsValue(
      "revenueWithdrawalSnapshot_widthdrawalTxHash",
      txHash,
      projectMinterConfig
    );
    // record payment addresses and splits
    setProjectMinterConfigExtraMinterDetailsValue(
      "revenueWithdrawalSnapshot_renderProviderAddress",
      contract.renderProviderAddress.toHexString(),
      projectMinterConfig
    );
    setProjectMinterConfigExtraMinterDetailsValue(
      "revenueWithdrawalSnapshot_renderProviderPercentage",
      contract.renderProviderPercentage,
      projectMinterConfig
    );
    // only record platform provider if it exists (does not exist on non-engine)
    if (contract.enginePlatformProviderAddress) {
      setProjectMinterConfigExtraMinterDetailsValue(
        "revenueWithdrawalSnapshot_platformProviderAddress",
        Address.fromBytes(
          // @dev compiler quirk requires casting as Bytes, even inside null check block
          contract.enginePlatformProviderAddress as Bytes
        ).toHexString(),
        projectMinterConfig
      );
    }
    if (contract.enginePlatformProviderPercentage) {
      setProjectMinterConfigExtraMinterDetailsValue(
        "revenueWithdrawalSnapshot_platformProviderPercentage",
        contract.enginePlatformProviderPercentage,
        projectMinterConfig
      );
    }
    setProjectMinterConfigExtraMinterDetailsValue(
      "revenueWithdrawalSnapshot_artistAddress",
      project.artistAddress.toHexString(),
      projectMinterConfig
    );
    // only record additional payee address if not null
    if (project.additionalPayee) {
      setProjectMinterConfigExtraMinterDetailsValue(
        "revenueWithdrawalSnapshot_additionalPayeeAddress",

        Address.fromBytes(project.additionalPayee as Bytes).toHexString(),
        projectMinterConfig
      );
    }
    // always additionalPayeePercentage as a value, even if null (zero if null)
    if (project.additionalPayeePercentage) {
      setProjectMinterConfigExtraMinterDetailsValue(
        "revenueWithdrawalSnapshot_additionalPayeePercentage",
        project.additionalPayeePercentage,
        projectMinterConfig
      );
    } else {
      // set to zero
      setProjectMinterConfigExtraMinterDetailsValue(
        "revenueWithdrawalSnapshot_additionalPayeePercentage",
        BigInt.fromI32(0),
        projectMinterConfig
      );
    }
  } else {
    log.warning(
      "[WARN] Legacy (non-shared) minter event handler encountered null contract at address {}. Withdrawal details for project {} were not saved to extra minter details",
      [project.contract, project.id]
    );
  }
}

/**
 * Creates a PurchaseDetails entity for a given token based on the provided event and returns its ID.
 * The function processes events that are instances of GenArt721CoreV1Mint or GenArt721Core2PBABMint.
 * If the event does not match these types, a warning is logged, and the function returns null.
 *
 * The function populates the PurchaseDetails with the minter's address, purchase currency address,
 * and purchase currency symbol. It first checks for a minter configuration associated with the
 * token's project. If found, this configuration is used. Otherwise, it falls back to the minter
 * address from the event's transaction data, provided it's whitelisted in the project's contract.
 *
 * In cases where required data is missing or relevant configurations or contracts are not found,
 * the function logs a warning and returns null.
 *
 * @param token - The token for which to create purchase details.
 * @param project - The project associated with the token.
 * @param event - The event triggering the creation of purchase details.
 * @returns The ID of the newly created PurchaseDetails entity if successful, or null if not.
 */
export function createPrimaryPurchaseDetailsFromTokenMint<T>(
  token: Token,
  project: Project,
  event: T
): string | null {
  if (
    !(
      event instanceof GenArt721CoreV1Mint ||
      event instanceof GenArt721Core2PBABMint
    )
  ) {
    log.warning(
      "[WARN] createAndAssociatePurchaseDetails was called with an event that is not a GenArt721CoreV1Mint or GenArt721Core2PBABMint. The event was not processed.",
      []
    );
    return null;
  }

  const purchaseDetails = new PrimaryPurchase(token.id);
  purchaseDetails.token = token.id;
  purchaseDetails.transactionHash = event.transaction.hash;

  // If the token's project has an associated minter configuration, use it to populate the tokens purchase info
  const minterConfigId = project.minterConfiguration;
  if (minterConfigId) {
    const minterConfig = ProjectMinterConfiguration.load(minterConfigId);
    if (minterConfig) {
      purchaseDetails.minterAddress = changetype<Bytes>(
        ByteArray.fromHexString(minterConfig.minter)
      );
      purchaseDetails.currencyAddress = minterConfig.currencyAddress;
      purchaseDetails.currencySymbol = minterConfig.currencySymbol;
      purchaseDetails.currencyDecimals = minterConfig.currencyDecimals;

      purchaseDetails.save();
      return purchaseDetails.id;
    } else {
      log.warning("Minter configuration with id {} does not exist", [
        minterConfigId
      ]);
      return null;
    }
  } else {
    // If no minter configuration is associated with the project, use the minter currently assigned to the contract
    const contract = Contract.load(project.contract);
    const to = changetype<Address>(event.transaction.to || Address.zero());

    // If the transaction to address is a whitelisted minter, use it as the minter address
    // or if there is only one whitelisted minter, use it as the minter address
    if (
      contract &&
      (contract.mintWhitelisted.includes(to) ||
        contract.mintWhitelisted.length === 1)
    ) {
      purchaseDetails.minterAddress = contract.mintWhitelisted.includes(to)
        ? to
        : contract.mintWhitelisted[0];

      // Assume the minter uses the core contract's currency info
      purchaseDetails.currencyAddress =
        project.currencyAddress || Address.zero();
      purchaseDetails.currencySymbol = project.currencySymbol || "ETH";
      purchaseDetails.currencyDecimals = project.currencyDecimals || 18;

      purchaseDetails.save();
      return purchaseDetails.id;
    } else {
      log.warning("Contract with id {} does not exist", [project.contract]);
      return null;
    }
  }
}
