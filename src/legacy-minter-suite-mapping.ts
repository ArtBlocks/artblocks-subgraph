/**
 * @dev - This file contains the event handlers for the Minter suite of contracts.
 * When modifying handlers when adding new contracts, it is important to note that
 * functions on the codegen'd interfaces reflect the latest version of the interface,
 * not the version of the interface that the contract implements (for earlier minter
 * versions). This means that the function may not exist on the contract, and will
 * throw an error if called. To avoid this, it is important to be careful and concise
 * when binding to and calling functions on minters via the codegen'd interfaces.
 */

import {
  Address,
  BigInt,
  Bytes,
  ethereum,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap,
  log
} from "@graphprotocol/graph-ts";

import {
  PricePerTokenInWeiUpdated,
  ProjectCurrencyInfoUpdated,
  PurchaseToDisabledUpdated
} from "../generated/MinterSetPrice/IFilteredMinterV2";

import { getTotalDAExpAuctionTime } from "./helpers";

import { ProjectMaxInvocationsLimitUpdated } from "../generated/MinterSetPrice/IFilteredMinterV2";

import {
  MinimumAuctionLengthSecondsUpdated,
  ResetAuctionDetails as DALinResetAuctionDetails,
  SetAuctionDetails as DALinSetAuctionDetails
} from "../generated/MinterDALin/IFilteredMinterDALinV1";

import {
  AuctionHalfLifeRangeSecondsUpdated as DAExpHalfLifeRangeSecondsUpdated,
  ResetAuctionDetails as DAExpResetAuctionDetails,
  SetAuctionDetails as DAExpSetAuctionDetails
} from "../generated/MinterDAExp/IFilteredMinterDAExpV1";

import {
  ResetAuctionDetails as DAExpSettlementResetAuctionDetails,
  ReceiptUpdated,
  SelloutPriceUpdated,
  ArtistAndAdminRevenuesWithdrawn,
  IFilteredMinterDAExpSettlementV1
} from "../generated/MinterDAExpSettlement/IFilteredMinterDAExpSettlementV1";

import {
  Minter,
  Project,
  ProjectMinterConfiguration,
  Receipt
} from "../generated/schema";

import {
  MinterProjectAndConfig,
  generateContractSpecificId,
  getProjectMinterConfigExtraMinterDetailsTypedMap,
  getProjectMinterConfigId,
  loadOrCreateMinter,
  loadOrCreateReceipt,
  generateProjectIdNumberFromTokenIdNumber,
  getMinterExtraMinterDetailsTypedMap,
  getCoreContractAddressFromLegacyMinter
} from "./helpers";

import {
  setProjectMinterConfigExtraMinterDetailsValue,
  setMinterExtraMinterDetailsValue,
  removeProjectMinterConfigExtraMinterDetailsEntry,
  addProjectMinterConfigExtraMinterDetailsManyValue,
  addMinterExtraMinterDetailsManyValue,
  removeProjectMinterConfigExtraMinterDetailsManyValue,
  removeMinterExtraMinterDetailsManyValue,
  mergeProjectMinterConfigExtraMinterDetails
} from "./extra-minter-details-helpers";

import {
  ConfigKeyRemoved,
  ConfigValueAddedToSet as ConfigValueAddedToSetBigInt,
  ConfigValueAddedToSet1 as ConfigValueAddedToSetAddress,
  ConfigValueAddedToSet2 as ConfigValueAddedToSetBytes,
  ConfigValueRemovedFromSet as ConfigValueRemovedFromSetBigInt,
  ConfigValueRemovedFromSet1 as ConfigValueRemovedFromSetAddress,
  ConfigValueRemovedFromSet2 as ConfigValueRemovedFromSetBytes,
  ConfigValueSet as ConfigValueSetBool,
  ConfigValueSet1 as ConfigValueSetBigInt,
  ConfigValueSet2 as ConfigValueSetAddress,
  ConfigValueSet3 as ConfigValueSetBytes
} from "../generated/MinterFilterV0/IFilteredMinterV2";

import {
  AllowedHoldersOfProjects,
  RegisteredNFTAddress,
  UnregisteredNFTAddress,
  RemovedHoldersOfProjects,
  DelegationRegistryUpdated as MinterHolderDelegationRegistryUpdated
} from "../generated/MinterHolder/IFilteredMinterHolderV2";

import { DelegationRegistryUpdated as MinterMerkleDelegationRegistryUpdated } from "../generated/MinterMerkle/IFilteredMinterMerkleV2";

import {
  AuctionDurationSecondsRangeUpdated,
  MinterMinBidIncrementPercentageUpdated,
  MinterTimeBufferUpdated,
  ConfiguredFutureAuctions,
  ResetAuctionDetails,
  AuctionInitialized,
  AuctionBid,
  AuctionSettled,
  ProjectNextTokenUpdated,
  ProjectNextTokenEjected
} from "../generated/MinterSEA/IFilteredMinterSEAV0";

import { createTypedMapFromEntries, toJSONValue } from "./json";

// IFilteredMinterV0 events
export function handlePricePerTokenInWeiUpdated(
  event: PricePerTokenInWeiUpdated
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  let project = minterProjectAndConfig.project;
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  projectMinterConfig.basePrice = event.params._pricePerTokenInWei;
  projectMinterConfig.priceIsConfigured = true;
  projectMinterConfig.save();

  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleProjectCurrencyInfoUpdated(
  event: ProjectCurrencyInfoUpdated
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  let project = minterProjectAndConfig.project;
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  projectMinterConfig.currencyAddress = event.params._currencyAddress;
  projectMinterConfig.currencySymbol = event.params._currencySymbol;
  projectMinterConfig.save();

  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handlePurchaseToDisabledUpdated(
  event: PurchaseToDisabledUpdated
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  let project = minterProjectAndConfig.project;
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  projectMinterConfig.purchaseToDisabled = event.params._purchaseToDisabled;
  projectMinterConfig.save();

  project.updatedAt = event.block.timestamp;
  project.save();
}

// IFilteredMinterV2 events
// @dev - Note that the contracts enforce event.params._maxInvocations being less than or equal
// to the project's maxInvocations value set on the core contract
export function handleProjectMaxInvocationsLimitUpdated(
  event: ProjectMaxInvocationsLimitUpdated
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  let project = minterProjectAndConfig.project;
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  projectMinterConfig.maxInvocations = event.params._maxInvocations;
  projectMinterConfig.save();

  project.updatedAt = event.block.timestamp;
  project.save();
}

// MinterDALin events
export function handleMinimumAuctionLengthSecondsUpdated(
  event: MinimumAuctionLengthSecondsUpdated
): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);
  setMinterExtraMinterDetailsValue(
    "minimumAuctionLengthInSeconds",
    event.params._minimumAuctionLengthSeconds,
    minter
  );
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleDALinSetAuctionDetails(
  event: DALinSetAuctionDetails
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;
    projectMinterConfig.basePrice = event.params._basePrice;
    setProjectMinterConfigExtraMinterDetailsValue(
      "startPrice",
      event.params._startPrice.toString(), // Price is likely to overflow js Number.MAX_SAFE_INTEGER so store as string
      projectMinterConfig
    );
    setProjectMinterConfigExtraMinterDetailsValue(
      "startTime",
      event.params._auctionTimestampStart,
      projectMinterConfig
    );
    setProjectMinterConfigExtraMinterDetailsValue(
      "endTime",
      event.params._auctionTimestampEnd,
      projectMinterConfig
    );
    projectMinterConfig.priceIsConfigured = true;
    projectMinterConfig.save();
    // update project.updatedAt to queue sync of projectMinterConfig changes
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleDALinResetAuctionDetails(
  event: DALinResetAuctionDetails
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = null;
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "startPrice",
      projectMinterConfig
    );
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "startTime",
      projectMinterConfig
    );
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "endTime",
      projectMinterConfig
    );
    projectMinterConfig.priceIsConfigured = false;
    projectMinterConfig.save();
    // update project.updatedAt to queue sync of projectMinterConfig changes
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

// MinterDAExp events
export function handleAuctionHalfLifeRangeSecondsUpdated(
  event: DAExpHalfLifeRangeSecondsUpdated
): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);
  setMinterExtraMinterDetailsValue(
    "minimumHalfLifeInSeconds",
    event.params._minimumPriceDecayHalfLifeSeconds,
    minter
  );
  setMinterExtraMinterDetailsValue(
    "maximumHalfLifeInSeconds",
    event.params._maximumPriceDecayHalfLifeSeconds,
    minter
  );
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleDAExpSetAuctionDetails(
  event: DAExpSetAuctionDetails
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = event.params._basePrice;
    setProjectMinterConfigExtraMinterDetailsValue(
      "startPrice",
      event.params._startPrice.toString(), // Price is likely to overflow js Number.MAX_SAFE_INTEGER so store as string
      projectMinterConfig
    );
    setProjectMinterConfigExtraMinterDetailsValue(
      "startTime",
      event.params._auctionTimestampStart,
      projectMinterConfig
    );
    setProjectMinterConfigExtraMinterDetailsValue(
      "halfLifeSeconds",
      event.params._priceDecayHalfLifeSeconds,
      projectMinterConfig
    );
    // pre-calculate the approximate DA end time
    const totalAuctionTime = getTotalDAExpAuctionTime(
      event.params._startPrice,
      event.params._basePrice,
      event.params._priceDecayHalfLifeSeconds
    );
    setProjectMinterConfigExtraMinterDetailsValue(
      "approximateDAExpEndTime",
      event.params._auctionTimestampStart.plus(totalAuctionTime),
      projectMinterConfig
    );

    projectMinterConfig.priceIsConfigured = true;
    projectMinterConfig.save();
    // update project.updatedAt to queue sync of projectMinterConfig changes
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleDAExpResetAuctionDetails(
  event: DAExpResetAuctionDetails
): void {
  handleDAExpResetAuctionDetailsGeneric(event);
}

export function handleDAExpSettlementResetAuctionDetails(
  event: DAExpSettlementResetAuctionDetails
): void {
  handleDAExpResetAuctionDetailsGeneric(event);
}

export function handleDAExpResetAuctionDetailsGeneric<T>(event: T): void {
  if (
    !(
      event instanceof DAExpResetAuctionDetails ||
      event instanceof DAExpSettlementResetAuctionDetails
    )
  ) {
    return;
  }

  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = null;
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "startPrice",
      projectMinterConfig
    );
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "startTime",
      projectMinterConfig
    );
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "halfLifeSeconds",
      projectMinterConfig
    );
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "approximateDAExpEndTime",
      projectMinterConfig
    );
    projectMinterConfig.priceIsConfigured = false;
    projectMinterConfig.save();
    // update project.updatedAt to queue sync of projectMinterConfig changes
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

// MinterHolder Specific Handlers
export function handleAllowHoldersOfProjects(
  event: AllowedHoldersOfProjects
): void {
  handleHoldersOfProjectsGeneric(event);
}

export function handleRemoveHoldersOfProjects(
  event: RemovedHoldersOfProjects
): void {
  handleHoldersOfProjectsGeneric(event);
}

export function handleHoldersOfProjectsGeneric<T>(event: T): void {
  if (
    !(
      event instanceof AllowedHoldersOfProjects ||
      event instanceof RemovedHoldersOfProjects
    )
  ) {
    return;
  }

  const minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  for (let i = 0; i < event.params._ownedNFTAddresses.length; i++) {
    let address = event.params._ownedNFTAddresses[i].toHexString();
    let holderProjectId = event.params._ownedNFTProjectIds[i].toString();
    let bytesValueCombined = Bytes.fromUTF8(address + "-" + holderProjectId);

    if (event instanceof AllowedHoldersOfProjects) {
      addProjectMinterConfigExtraMinterDetailsManyValue(
        minterProjectAndConfig.projectMinterConfiguration,
        "allowlistedAddressAndProjectId",
        bytesValueCombined
      );
    } else if (event instanceof RemovedHoldersOfProjects) {
      removeProjectMinterConfigExtraMinterDetailsManyValue(
        minterProjectAndConfig.projectMinterConfiguration,
        "allowlistedAddressAndProjectId",
        bytesValueCombined
      );
    }

    minterProjectAndConfig.project.updatedAt = event.block.timestamp;
    minterProjectAndConfig.project.save();
  }
}

export function handleRegisteredNFTAddress(event: RegisteredNFTAddress): void {
  handleRegistrationNFTAddresses(event);
}

export function handleUnregisteredNFTAddress(
  event: UnregisteredNFTAddress
): void {
  handleRegistrationNFTAddresses(event);
}

export function handleRegistrationNFTAddresses<T>(event: T): void {
  if (
    !(
      event instanceof RegisteredNFTAddress ||
      event instanceof UnregisteredNFTAddress
    )
  ) {
    return;
  }

  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  if (event instanceof RegisteredNFTAddress) {
    addMinterExtraMinterDetailsManyValue(
      minter,
      "registeredNFTAddresses",
      event.params._NFTAddress
    );
  } else if (event instanceof UnregisteredNFTAddress) {
    removeMinterExtraMinterDetailsManyValue(
      minter,
      "registeredNFTAddresses",
      event.params._NFTAddress
    );
  }
}

export function handleMerkleDelegationRegistryUpdated(
  event: MinterMerkleDelegationRegistryUpdated
): void {
  handleDelegationRegistryUpdatedGeneric(event);
}
export function handleHolderDelegationRegistryUpdated(
  event: MinterHolderDelegationRegistryUpdated
): void {
  handleDelegationRegistryUpdatedGeneric(event);
}

export function handleDelegationRegistryUpdatedGeneric<T>(event: T): void {
  if (
    !(
      event instanceof MinterMerkleDelegationRegistryUpdated ||
      event instanceof MinterHolderDelegationRegistryUpdated
    )
  ) {
    return;
  }

  let minter = loadOrCreateMinter(event.address, event.block.timestamp);

  setMinterExtraMinterDetailsValue(
    "delegationRegistryAddress",
    event.params.delegationRegistryAddress,
    minter
  );
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

// MinterSEA specific handlers
export function handleAuctionDurationSecondsRangeUpdated(
  event: AuctionDurationSecondsRangeUpdated
): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update Minter.extraMinterDetails with new values
  setMinterExtraMinterDetailsValue(
    "minAuctionDurationSeconds",
    event.params.minAuctionDurationSeconds,
    minter
  );
  setMinterExtraMinterDetailsValue(
    "maxAuctionDurationSeconds",
    event.params.maxAuctionDurationSeconds,
    minter
  );

  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleMinterMinBidIncrementPercentageUpdated(
  event: MinterMinBidIncrementPercentageUpdated
): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update Minter.extraMinterDetails with new value
  setMinterExtraMinterDetailsValue(
    "minterMinBidIncrementPercentage",
    BigInt.fromI32(event.params.minterMinBidIncrementPercentage),
    minter
  );

  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleMinterTimeBufferUpdated(
  event: MinterTimeBufferUpdated
): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update Minter.extraMinterDetails with new value
  setMinterExtraMinterDetailsValue(
    "minterTimeBufferSeconds",
    event.params.minterTimeBufferSeconds,
    minter
  );

  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleConfiguredFutureAuctions(
  event: ConfiguredFutureAuctions
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    // update project minter configuration fields
    projectMinterConfig.priceIsConfigured = true;
    projectMinterConfig.basePrice = event.params.basePrice;
    // update project minter configuration extraMinterDetails json field
    setProjectMinterConfigExtraMinterDetailsValue(
      "startTime",
      event.params.timestampStart,
      projectMinterConfig
    );
    setProjectMinterConfigExtraMinterDetailsValue(
      "projectAuctionDurationSeconds",
      event.params.auctionDurationSeconds,
      projectMinterConfig
    );

    // update project updatedAt to sync new projectMinterConfiguration changes
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleResetAuctionDetails(event: ResetAuctionDetails): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    // reset project minter configuration fields
    projectMinterConfig.priceIsConfigured = false;
    projectMinterConfig.basePrice = BigInt.fromI32(0);
    // clear project minter configuration extraMinterDetails json field
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "startTime",
      projectMinterConfig
    );
    removeProjectMinterConfigExtraMinterDetailsEntry(
      "projectAuctionDurationSeconds",
      projectMinterConfig
    );

    // update project updatedAt to sync new projectMinterConfiguration changes
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleAuctionInitialized(event: AuctionInitialized): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    projectIdNumber,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    log.warning(
      "[WARN] Error while trying to load minter project and config for auction initialized event.",
      []
    );
    return;
  }
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  // update all auction details in project minter configuration extraMinterDetails json field
  let auctionInitializedDetails: TypedMap<
    string,
    JSONValue
  > = createTypedMapFromEntries([
    {
      key: "auctionCurrentBid",
      value: toJSONValue(event.params.bidAmount.toString()) // Bid is likely to overflow js Number.MAX_SAFE_INTEGER so store as string
    },
    { key: "auctionCurrentBidder", value: toJSONValue(event.params.bidder) },
    { key: "auctionEndTime", value: toJSONValue(event.params.endTime) },
    { key: "auctionInitialized", value: toJSONValue(true) },
    { key: "auctionSettled", value: toJSONValue(false) },
    { key: "auctionTokenId", value: toJSONValue(event.params.tokenId) }
  ]);

  mergeProjectMinterConfigExtraMinterDetails(
    projectMinterConfig,
    auctionInitializedDetails
  );

  removeProjectMinterConfigExtraMinterDetailsEntry(
    "projectNextTokenId",
    projectMinterConfig
  );

  // update project updatedAt to sync new projectMinterConfiguration changes
  let project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleAuctionBid(event: AuctionBid): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    projectIdNumber,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    // update relevant auction details in project minter configuration extraMinterDetails json field
    setProjectMinterConfigExtraMinterDetailsValue(
      "auctionCurrentBid",
      event.params.bidAmount.toString(), // Bid is likely to overflow js Number.MAX_SAFE_INTEGER so store as string
      projectMinterConfig
    );
    setProjectMinterConfigExtraMinterDetailsValue(
      "auctionCurrentBidder",
      event.params.bidder,
      projectMinterConfig
    );
    // determine if auction end time needs to be updated
    let minterDetails = getMinterExtraMinterDetailsTypedMap(
      minterProjectAndConfig.minter
    );
    const bufferTimeSecondsJSON = minterDetails.get("minterTimeBufferSeconds");
    // @dev: treat null value as zero, even though we will never encounter it, but we check to keep AS happy.
    let bufferTimeSeconds = BigInt.fromI32(0);
    if (bufferTimeSecondsJSON instanceof JSONValue) {
      bufferTimeSeconds = bufferTimeSecondsJSON.toBigInt();
    }
    let earliestAuctionEndTime = event.block.timestamp.plus(bufferTimeSeconds);
    let projectMinterConfigDetails = getProjectMinterConfigExtraMinterDetailsTypedMap(
      minterProjectAndConfig.projectMinterConfiguration
    );
    const currentEndTimeJSON = projectMinterConfigDetails.get("auctionEndTime");
    // @dev: treat null value as zero, even though we will never encounter it, but we check to keep AS happy.
    let currentEndTime = BigInt.fromI32(0);
    if (currentEndTimeJSON instanceof JSONValue) {
      currentEndTime = currentEndTimeJSON.toBigInt();
    }
    if (currentEndTime.lt(earliestAuctionEndTime)) {
      setProjectMinterConfigExtraMinterDetailsValue(
        "auctionEndTime",
        earliestAuctionEndTime,
        projectMinterConfig
      );
    }

    // update project updatedAt to sync new projectMinterConfiguration changes
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleAuctionSettled(event: AuctionSettled): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    projectIdNumber,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    // update relevant auction details in project minter configuration extraMinterDetails json field
    setProjectMinterConfigExtraMinterDetailsValue(
      "auctionSettled",
      true,
      projectMinterConfig
    );

    // update project updatedAt to sync new projectMinterConfiguration changes
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleProjectNextTokenUpdated(
  event: ProjectNextTokenUpdated
): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    projectIdNumber,
    event.block.timestamp
  );
  if (!minterProjectAndConfig) {
    log.warning(
      "[WARN] Error while trying to load minter project and config for project next token updated event.",
      []
    );
    return;
  }
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
  // update project next token id in project minter configuration extraMinterDetails json field
  setProjectMinterConfigExtraMinterDetailsValue(
    "projectNextTokenId",
    event.params.tokenId,
    projectMinterConfig
  );

  // update project updatedAt to sync new projectMinterConfiguration changes
  let project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleProjectNextTokenEjected(
  event: ProjectNextTokenEjected
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );
  if (!minterProjectAndConfig) {
    log.warning(
      "[WARN] Error while trying to load minter project and config for project next token ejected event.",
      []
    );
    return;
  }
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
  // update project next token id in project minter configuration extraMinterDetails json field
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "projectNextTokenId",
    projectMinterConfig
  );

  // update project updatedAt to sync new projectMinterConfiguration changes
  let project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleSetValueProjectMinterConfig<EventType>(
  event: EventType
): void {
  if (
    !(
      event instanceof ConfigValueSetBool ||
      event instanceof ConfigValueSetBigInt ||
      event instanceof ConfigValueSetAddress ||
      event instanceof ConfigValueSetBytes
    )
  ) {
    return;
  }

  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    const config = minterProjectAndConfig.projectMinterConfiguration;

    setProjectMinterConfigExtraMinterDetailsValue(
      event.params._key.toString(),
      event.params._value,
      config
    );

    minterProjectAndConfig.project.updatedAt = event.block.timestamp;
    minterProjectAndConfig.project.save();
  }
}

export function handleRemoveValueProjectMinterConfig(
  event: ConfigKeyRemoved
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    let extraMinterDetails = getProjectMinterConfigExtraMinterDetailsTypedMap(
      minterProjectAndConfig.projectMinterConfiguration
    );

    removeProjectMinterConfigExtraMinterDetailsEntry(
      event.params._key.toString(),
      minterProjectAndConfig.projectMinterConfiguration
    );

    minterProjectAndConfig.project.updatedAt = event.block.timestamp;
    minterProjectAndConfig.project.save();
  }
}

export function handleAddManyProjectMinterConfig<T>(event: T): void {
  if (
    !(
      event instanceof ConfigValueAddedToSetBigInt ||
      event instanceof ConfigValueAddedToSetAddress ||
      event instanceof ConfigValueAddedToSetBytes
    )
  ) {
    return;
  }
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    addProjectMinterConfigExtraMinterDetailsManyValue(
      minterProjectAndConfig.projectMinterConfiguration,
      event.params._key.toString(),
      event.params._value
    );

    minterProjectAndConfig.project.updatedAt = event.block.timestamp;
    minterProjectAndConfig.project.save();
  }
}

export function handleRemoveManyProjectMinterConfig<EventType>(
  event: EventType
): void {
  if (
    !(
      event instanceof ConfigValueRemovedFromSetBigInt ||
      event instanceof ConfigValueRemovedFromSetAddress ||
      event instanceof ConfigValueRemovedFromSetBytes
    )
  ) {
    return;
  }
  let minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    removeProjectMinterConfigExtraMinterDetailsManyValue(
      minterProjectAndConfig.projectMinterConfiguration,
      event.params._key.toString(),
      event.params._value
    );

    minterProjectAndConfig.project.updatedAt = event.block.timestamp;
    minterProjectAndConfig.project.save();
  }
}

export function handleSetBooleanValueProjectMinterConfig(
  event: ConfigValueSetBool
): void {
  handleSetValueProjectMinterConfig(event);
}

export function handleSetBigIntValueProjectMinterConfig(
  event: ConfigValueSetBigInt
): void {
  handleSetValueProjectMinterConfig(event);
}

export function handleSetAddressValueProjectMinterConfig(
  event: ConfigValueSetAddress
): void {
  handleSetValueProjectMinterConfig(event);
}

export function handleSetBytesValueProjectMinterConfig(
  event: ConfigValueSetBytes
): void {
  handleSetValueProjectMinterConfig(event);
}

export function handleAddManyBigIntValueProjectMinterConfig(
  event: ConfigValueAddedToSetBigInt
): void {
  handleAddManyProjectMinterConfig(event);
}

export function handleAddManyAddressValueProjectMinterConfig(
  event: ConfigValueAddedToSetAddress
): void {
  handleAddManyProjectMinterConfig(event);
}

export function handleAddManyBytesValueProjectMinterConfig(
  event: ConfigValueAddedToSetBytes
): void {
  handleAddManyProjectMinterConfig(event);
}

export function handleRemoveBigIntManyValueProjectMinterConfig(
  event: ConfigValueRemovedFromSetBigInt
): void {
  handleRemoveManyProjectMinterConfig(event);
}

export function handleRemoveAddressManyValueProjectMinterConfig(
  event: ConfigValueRemovedFromSetAddress
): void {
  handleRemoveManyProjectMinterConfig(event);
}

export function handleRemoveBytesManyValueProjectMinterConfig(
  event: ConfigValueRemovedFromSetBytes
): void {
  handleRemoveManyProjectMinterConfig(event);
}
// End of generic handlers

export function handleReceiptUpdated(event: ReceiptUpdated): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);
  if (!minter) {
    log.warning("Error while loading/creating minter with id {}", [
      event.address.toHexString()
    ]);
    return;
  }

  const coreContractAddress = getCoreContractAddressFromLegacyMinter(minter);
  if (!coreContractAddress) {
    log.warning("Error while loading core contract address from minter {}", [
      minter.id
    ]);
    return;
  }

  // load or create receipt
  let projectId = generateContractSpecificId(
    coreContractAddress,
    event.params._projectId
  );
  let receipt: Receipt = loadOrCreateReceipt(
    minter.id,
    projectId,
    event.params._purchaser,
    event.block.timestamp
  );
  if (receipt) {
    // update receipt state
    receipt.netPosted = event.params._netPosted;
    receipt.numPurchased = event.params._numPurchased;
    receipt.updatedAt = event.block.timestamp;
    receipt.save();
    // additionally, sync latest purchase price and number of settleable
    // purchases for project on this minter
    // @dev this is because this can be the only event emitted from the
    // minter during a purchase on a settleable minter
    syncLatestPurchasePrice(event.address, event.params._projectId, event);
    syncNumSettleableInvocations(event.address, event.params._projectId, event);
  } else {
    log.warning("Error while loading/creating receipt in tx {}, log index {}", [
      event.transaction.hash.toHexString(),
      event.transactionLogIndex.toString()
    ]);
  }
}

export function handleSelloutPriceUpdated(event: SelloutPriceUpdated): void {
  syncLatestPurchasePrice(event.address, event.params._projectId, event);
}

export function handleArtistAndAdminRevenuesWithdrawn(
  event: ArtistAndAdminRevenuesWithdrawn
): void {
  // the function that emits this event can affect latest purchase price, so sync it
  syncLatestPurchasePrice(event.address, event.params._projectId, event);

  // It's important that we load the minterProjectAndConfig after syncing the
  // latest purchase price, so that the loaded config is up to date
  const minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  // update project extra minter details key `auctionRevenuesCollected` to true
  setProjectMinterConfigExtraMinterDetailsValue(
    "auctionRevenuesCollected",
    true,
    minterProjectAndConfig.projectMinterConfiguration
  );

  minterProjectAndConfig.project.updatedAt = event.block.timestamp;
  minterProjectAndConfig.project.save();
}

// Helpers
/**
 * @notice Syncs a (settleable) minter's project latest purchase price in
 * extraMinterDetails to the current value on the minter.
 * @param minterAddress minter address to by synced
 * @param projectId project id to sync (big int, not contract specific id)
 * @param event The event emitted from the minter that triggered this sync
 */
function syncLatestPurchasePrice(
  minterAddress: Address,
  projectId: BigInt,
  event: ethereum.Event
): void {
  const minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    minterAddress,
    projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  let settleableMinter = IFilteredMinterDAExpSettlementV1.bind(minterAddress);
  let latestPurchasePrice = settleableMinter.getProjectLatestPurchasePrice(
    projectId
  );
  // update extraMinterDetails key `currentSettledPrice` to be latestPurchasePrice
  setProjectMinterConfigExtraMinterDetailsValue(
    "currentSettledPrice",
    latestPurchasePrice.toString(), // Price is likely to overflow js Number.MAX_SAFE_INTEGER, so store as string
    minterProjectAndConfig.projectMinterConfiguration
  );

  minterProjectAndConfig.project.updatedAt = event.block.timestamp;
  minterProjectAndConfig.project.save();
}

/**
 * @notice Syncs a (settleable) minter's project number of settleable
 * invocations in extraMinterDetails to the current value on the minter.
 * @param minterAddress minter address to by synced
 * @param projectId project id to sync (big int, not contract specific id)
 * @param event The event emitted from the minter that triggered this sync
 */
function syncNumSettleableInvocations(
  minterAddress: Address,
  projectId: BigInt,
  event: ethereum.Event
): void {
  let settleableMinter = IFilteredMinterDAExpSettlementV1.bind(minterAddress);
  let numSettleableInvocations = settleableMinter.getNumSettleableInvocations(
    projectId
  );
  // update extraMinterDetails key `numSettleableInvocations` to be numSettleableInvocations
  const minterProjectAndConfig = loadMinterProjectAndConfigLegacyMinters(
    minterAddress,
    projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  setProjectMinterConfigExtraMinterDetailsValue(
    "numSettleableInvocations",
    numSettleableInvocations,
    minterProjectAndConfig.projectMinterConfiguration
  );

  minterProjectAndConfig.project.updatedAt = event.block.timestamp;
  minterProjectAndConfig.project.save();
}

function loadMinterProjectAndConfigLegacyMinters(
  minterAddress: Address,
  projectId: BigInt,
  timestamp: BigInt
): MinterProjectAndConfig | null {
  let minter = loadOrCreateMinter(minterAddress, timestamp);
  if (!minter) {
    log.warning(
      "[WARN] Legacy (non-shared) minter event handler encountered null minter at address {}.",
      [minterAddress.toHexString()]
    );
    return null;
  }
  let coreContractAddress = getCoreContractAddressFromLegacyMinter(minter);
  if (!coreContractAddress) {
    log.warning(
      "[WARN] Legacy (non-shared) error encountered, minter unable to get `coreContract` address, at minter address {}.",
      [minterAddress.toHexString()]
    );
    return null;
  }

  let project = Project.load(
    generateContractSpecificId(coreContractAddress, projectId)
  );
  if (!project) {
    log.warning(
      "[WARN] Legacy (non-shared) minter event handler encountered null project at minter address {}, projectId {}.",
      [minterAddress.toHexString(), projectId.toString()]
    );
    return null;
  }

  let projectMinterConfig = ProjectMinterConfiguration.load(
    getProjectMinterConfigId(minter.id, project.id)
  );
  if (!projectMinterConfig) {
    projectMinterConfig = new ProjectMinterConfiguration(
      getProjectMinterConfigId(minter.id, project.id)
    );
    projectMinterConfig.project = project.id;
    projectMinterConfig.minter = minterAddress.toHexString();
    projectMinterConfig.priceIsConfigured = false;
    projectMinterConfig.currencySymbol = "ETH";
    projectMinterConfig.currencyAddress = Address.zero();
    projectMinterConfig.purchaseToDisabled = false;
    projectMinterConfig.extraMinterDetails = "{}";
    projectMinterConfig.save();
  }

  return {
    minter: minter,
    project: project,
    projectMinterConfiguration: projectMinterConfig
  };
}
