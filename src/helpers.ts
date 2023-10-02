import {
  Address,
  BigInt,
  Bytes,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap,
  store,
  log,
  ethereum
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
  Contract
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

export class MinterProjectAndConfig {
  minter: Minter;
  project: Project;
  projectMinterConfiguration: ProjectMinterConfiguration;
}

export function bytes32ToString(bytes32: Bytes): string {
  let result = "";
  for (let i = 0; i < 32; i++) {
    let char = bytes32[i];
    if (char == 0) break; // Stop at the first null character
    result += String.fromCharCode(char);
  }
  return result;
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
      "[WARN] Minter at {} does not have a valid minter filter address",
      [minterAddress.toHexString()]
    );
    const dummyMinterFilter = loadOrCreateSharedMinterFilter(
      Address.zero(),
      timestamp
    );
    minter.minterFilter = dummyMinterFilter.id;
  } else {
    minter.minterFilter = minterFilterResult.value.toHexString();
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
