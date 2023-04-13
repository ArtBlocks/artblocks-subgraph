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
  arrayToJSONValue,
  booleanToString,
  bytesToJSONValue,
  generateContractSpecificId,
  getMinterDetails,
  getProjectMinterConfigId,
  loadOrCreateMinter,
  stringToJSONString,
  stringToJSONValue,
  typedMapToJSONString,
  loadOrCreateReceipt,
  generateProjectIdNumberFromTokenIdNumber
} from "./helpers";
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

import { MinterConfigSetAddressEvent } from "./util-types";

// IFilteredMinterV0 events
export function handlePricePerTokenInWeiUpdated(
  event: PricePerTokenInWeiUpdated
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
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
  // @dev deprecated field minter.minimumAuctionLengthInSeconds
  minter.minimumAuctionLengthInSeconds =
    event.params._minimumAuctionLengthSeconds;
  handleSetMinterDetailsGeneric(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;
    projectMinterConfig.basePrice = event.params._basePrice;
    // @dev deprecated field projectMinterConfig.startPrice
    projectMinterConfig.startPrice = event.params._startPrice;
    // @dev deprecated field projectMinterConfig.startTime
    projectMinterConfig.startTime = event.params._auctionTimestampStart;
    // @dev deprecated field projectMinterConfig.endTime
    projectMinterConfig.endTime = event.params._auctionTimestampEnd;
    handleSetMinterDetailsGeneric(
      "startPrice",
      event.params._startPrice,
      projectMinterConfig
    );
    handleSetMinterDetailsGeneric(
      "startTime",
      event.params._auctionTimestampStart,
      projectMinterConfig
    );
    handleSetMinterDetailsGeneric(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = null;
    // @dev deprecated field projectMinterConfig.startPrice
    projectMinterConfig.startPrice = null;
    // @dev deprecated field projectMinterConfig.startTime
    projectMinterConfig.startTime = null;
    // @dev deprecated field projectMinterConfig.endTime
    projectMinterConfig.endTime = null;
    handleRemoveMinterDetailsGeneric("startPrice", projectMinterConfig);
    handleRemoveMinterDetailsGeneric("startTime", projectMinterConfig);
    handleRemoveMinterDetailsGeneric("endTime", projectMinterConfig);
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
  // @dev deprecated field minter.minimumHalfLifeInSeconds
  minter.minimumHalfLifeInSeconds =
    event.params._minimumPriceDecayHalfLifeSeconds;
  // @dev deprecated field minter.maximumHalfLifeInSeconds
  minter.maximumHalfLifeInSeconds =
    event.params._maximumPriceDecayHalfLifeSeconds;
  handleSetMinterDetailsGeneric(
    "minimumHalfLifeInSeconds",
    event.params._minimumPriceDecayHalfLifeSeconds,
    minter
  );
  handleSetMinterDetailsGeneric(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = event.params._basePrice;
    // @dev deprecated field projectMinterConfig.startPrice
    projectMinterConfig.startPrice = event.params._startPrice;
    // @dev deprecated field projectMinterConfig._auctionTimestampStart
    projectMinterConfig.startTime = event.params._auctionTimestampStart;
    // @dev deprecated field projectMinterConfig.halfLifeSeconds
    projectMinterConfig.halfLifeSeconds =
      event.params._priceDecayHalfLifeSeconds;
    handleSetMinterDetailsGeneric(
      "startPrice",
      event.params._startPrice,
      projectMinterConfig
    );
    handleSetMinterDetailsGeneric(
      "startTime",
      event.params._auctionTimestampStart,
      projectMinterConfig
    );
    handleSetMinterDetailsGeneric(
      "halfLifeSeconds",
      event.params._priceDecayHalfLifeSeconds,
      projectMinterConfig
    );
    // pre-calculate the approximate DA end time
    const startPriceFloatingPoint = event.params._startPrice.toBigDecimal();
    const basePriceFloatingPoint = event.params._basePrice.toBigDecimal();
    const priceRatio: f64 = Number.parseFloat(
      startPriceFloatingPoint.div(basePriceFloatingPoint).toString()
    );
    const completedHalfLives = BigInt.fromString(
      u8(Math.floor(Math.log(priceRatio) / Math.log(2))).toString()
    );
    const completedHalfLivesU8: u8 = u8(
      Number.parseInt(completedHalfLives.toString())
    );
    const x1 = completedHalfLives.times(
      event.params._priceDecayHalfLifeSeconds
    );
    const x2 = x1.plus(event.params._priceDecayHalfLifeSeconds);
    const y1 = event.params._startPrice.div(
      BigInt.fromI32(2).pow(completedHalfLivesU8)
    );
    const y2 = y1.div(BigInt.fromI32(2));
    const totalAuctionTime = x1.plus(
      x2
        .minus(x1)
        .times(event.params._basePrice.minus(y1))
        .div(y2.minus(y1))
    );
    handleSetMinterDetailsGeneric(
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

  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = null;
    // @dev deprecated field projectMinterConfig.startPrice
    projectMinterConfig.startPrice = null;
    // @dev deprecated field projectMinterConfig.startTime
    projectMinterConfig.startTime = null;
    // @dev deprecated field projectMinterConfig.halfLifeSeconds
    projectMinterConfig.halfLifeSeconds = null;
    handleRemoveMinterDetailsGeneric("startPrice", projectMinterConfig);
    handleRemoveMinterDetailsGeneric("startTime", projectMinterConfig);
    handleRemoveMinterDetailsGeneric("halfLifeSeconds", projectMinterConfig);
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

  for (let i = 0; i < event.params._ownedNFTAddresses.length; i++) {
    let address = event.params._ownedNFTAddresses[i].toHexString();
    let holderProjectId = event.params._ownedNFTProjectIds[i].toString();
    let bytesValueCombined = Bytes.fromUTF8(address + "-" + holderProjectId);

    let newAddEvent: ConfigValueAddedToSetBytes;
    let newRemoveEvent: ConfigValueRemovedFromSetBytes;
    const parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(event.params._projectId)
      ),
      new ethereum.EventParam(
        "_key",
        ethereum.Value.fromBytes(
          Bytes.fromUTF8("allowlistedAddressAndProjectId")
        )
      ),
      new ethereum.EventParam(
        "_value",
        ethereum.Value.fromBytes(bytesValueCombined)
      )
    ];

    if (event instanceof AllowedHoldersOfProjects) {
      newAddEvent = new ConfigValueAddedToSetBytes(
        event.address,
        event.logIndex,
        event.transactionLogIndex,
        event.logType,
        event.block,
        event.transaction,
        parameters,
        event.receipt
      );
      handleAddManyBytesValueProjectConfig(newAddEvent);
    } else if (event instanceof RemovedHoldersOfProjects) {
      newRemoveEvent = new ConfigValueRemovedFromSetBytes(
        event.address,
        event.logIndex,
        event.transactionLogIndex,
        event.logType,
        event.block,
        event.transaction,
        parameters,
        event.receipt
      );
      handleRemoveBytesManyValueProjectConfig(newRemoveEvent);
    }
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

  let genericEvent: MinterConfigSetAddressEvent;
  genericEvent = changetype<MinterConfigSetAddressEvent>(event);

  genericEvent.parameters = [
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("registeredNFTAddresses"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromAddress(event.params._NFTAddress)
    )
  ];

  if (event instanceof RegisteredNFTAddress) {
    handleAddManyAddressValueMinterConfig(genericEvent);
  } else if (event instanceof UnregisteredNFTAddress) {
    handleRemoveAddressManyValueMinterConfig(genericEvent);
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

  handleSetMinterDetailsGeneric(
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
  handleSetMinterDetailsGeneric(
    "minAuctionDurationSeconds",
    event.params.minAuctionDurationSeconds,
    minter
  );
  handleSetMinterDetailsGeneric(
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
  handleSetMinterDetailsGeneric(
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
  handleSetMinterDetailsGeneric(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    // update project minter configuration fields
    projectMinterConfig.priceIsConfigured = true;
    projectMinterConfig.basePrice = event.params.basePrice;
    // @dev deprecated field projectMinterConfig.startTime
    projectMinterConfig.startTime = event.params.timestampStart;
    // update project minter configuration extraMinterDetails json field
    handleSetMinterDetailsGeneric(
      "startTime",
      event.params.timestampStart,
      projectMinterConfig
    );
    handleSetMinterDetailsGeneric(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    // reset project minter configuration fields
    projectMinterConfig.priceIsConfigured = false;
    projectMinterConfig.basePrice = BigInt.fromI32(0);
    // @dev deprecated field projectMinterConfig.startTime
    projectMinterConfig.startTime = BigInt.fromI32(0);
    // clear project minter configuration extraMinterDetails json field
    handleRemoveMinterDetailsGeneric("startTime", projectMinterConfig);
    handleRemoveMinterDetailsGeneric(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
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
  handleSetMinterDetailsGeneric(
    "auctionTokenId",
    event.params.tokenId,
    projectMinterConfig
  );
  handleSetMinterDetailsGeneric(
    "auctionCurrentBid",
    event.params.bidAmount,
    projectMinterConfig
  );
  handleSetMinterDetailsGeneric(
    "auctionCurrentBidder",
    event.params.bidder,
    projectMinterConfig
  );
  handleSetMinterDetailsGeneric(
    "auctionEndTime",
    event.params.endTime,
    projectMinterConfig
  );
  // reset the token auction settled state, and set the auction as initialized
  handleSetMinterDetailsGeneric("auctionSettled", false, projectMinterConfig);
  handleSetMinterDetailsGeneric(
    "auctionInitialized",
    true,
    projectMinterConfig
  );
  // remove the next token id, since the auction is initialized with that token id
  handleRemoveMinterDetailsGeneric("projectNextTokenId", projectMinterConfig);

  // update project updatedAt to sync new projectMinterConfiguration changes
  let project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleAuctionBid(event: AuctionBid): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    projectIdNumber,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    // update relevant auction details in project minter configuration extraMinterDetails json field
    handleSetMinterDetailsGeneric(
      "auctionCurrentBid",
      event.params.bidAmount,
      projectMinterConfig
    );
    handleSetMinterDetailsGeneric(
      "auctionCurrentBidder",
      event.params.bidder,
      projectMinterConfig
    );
    // determine if auction end time needs to be updated
    let minterDetails = getMinterDetails(minterProjectAndConfig.minter);
    const bufferTimeSecondsJSON = minterDetails.get("minterTimeBufferSeconds");
    // @dev: treat null value as zero, even though we will never encounter it, but we check to keep AS happy.
    let bufferTimeSeconds = BigInt.fromI32(0);
    if (bufferTimeSecondsJSON instanceof JSONValue) {
      bufferTimeSeconds = bufferTimeSecondsJSON.toBigInt();
    }
    let earliestAuctionEndTime = event.block.timestamp.plus(bufferTimeSeconds);
    let projectMinterConfigDetails = getMinterDetails(
      minterProjectAndConfig.projectMinterConfiguration
    );
    const currentEndTimeJSON = projectMinterConfigDetails.get("auctionEndTime");
    // @dev: treat null value as zero, even though we will never encounter it, but we check to keep AS happy.
    let currentEndTime = BigInt.fromI32(0);
    if (currentEndTimeJSON instanceof JSONValue) {
      currentEndTime = currentEndTimeJSON.toBigInt();
    }
    if (currentEndTime.lt(earliestAuctionEndTime)) {
      handleSetMinterDetailsGeneric(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    projectIdNumber,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    // update relevant auction details in project minter configuration extraMinterDetails json field
    handleSetMinterDetailsGeneric("auctionSettled", true, projectMinterConfig);

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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
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
  handleSetMinterDetailsGeneric(
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
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
  handleRemoveMinterDetailsGeneric("projectNextTokenId", projectMinterConfig);

  // update project updatedAt to sync new projectMinterConfiguration changes
  let project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

// Generic Handlers
// Below is all logic pertaining to generic handlers used for maintaining JSON config stores on both the ProjectMinterConfiguration and Minter entities.
// Most logic is shared and bubbled up each respective handler for each action. We utilize ducktype to allow these to work on either a Minter or ProjectMinterConfiguration
// Because AssemblyScript does not support union types, we need to manually type check inside each method, to ensure correct usage.
// Currently supported key-value types (value: T) include boolean, BigInt, ETH address, and bytes values.
// For any questions reach out to @jon or @ryley-o.eth. or see the following document https://docs.google.com/document/d/1XSxl04eJyTxc_rbj6cmq-j00zaYDzApBBLT67JXtaOw/edit?disco=AAAAZa8xp-Q

export function handleSetMinterDetailsGeneric<T, C>(
  key: string,
  value: T,
  config: C
): void {
  if (
    !(config instanceof Minter || config instanceof ProjectMinterConfiguration)
  ) {
    log.warning(
      "[WARN] Generic property attempted to be set on something not a Minter or ProjectMinterConfiguration",
      []
    );
    return;
  }
  let minterDetails = getMinterDetails(config);
  let jsonKey = key;
  let jsonValue: JSONValue;

  if (isBoolean(value)) {
    jsonValue = json.fromString(booleanToString(value));
  } else if (value instanceof BigInt) {
    jsonValue = json.fromString(value.toString());
  } else if (value instanceof Address) {
    jsonValue = stringToJSONValue(value.toHexString());
  } else if (value instanceof Bytes) {
    jsonValue = bytesToJSONValue(value);
  } else {
    log.warning(
      "handleSetMinterDetailsGeneric received unexpected typed value",
      []
    );
    return;
  }

  minterDetails.set(jsonKey, jsonValue);
  config.extraMinterDetails = typedMapToJSONString(minterDetails);
  config.save();
}

export function handleSetValueProjectConfig<T>(event: T): void {
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
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    const config = minterProjectAndConfig.projectMinterConfiguration;
    if (
      !(
        config instanceof Minter || config instanceof ProjectMinterConfiguration
      )
    ) {
      return;
    }

    handleSetMinterDetailsGeneric(
      event.params._key.toString(),
      event.params._value,
      config
    );

    if (minterProjectAndConfig.project) {
      minterProjectAndConfig.project.updatedAt = event.block.timestamp;
      minterProjectAndConfig.project.save();
    }
  }
}
export function handleSetBooleanValueProjectConfig(
  event: ConfigValueSetBool
): void {
  handleSetValueProjectConfig(event);
}

export function handleSetBigIntValueProjectConfig(
  event: ConfigValueSetBigInt
): void {
  handleSetValueProjectConfig(event);
}

export function handleSetAddressValueProjectConfig(
  event: ConfigValueSetAddress
): void {
  handleSetValueProjectConfig(event);
}

export function handleSetBytesValueProjectConfig(
  event: ConfigValueSetBytes
): void {
  handleSetValueProjectConfig(event);
}

export function handleRemoveMinterDetailsGeneric<C>(
  key: string,
  config: C
): void {
  if (
    !(config instanceof Minter || config instanceof ProjectMinterConfiguration)
  ) {
    log.warning(
      "[WARN] Generic property attempted to be set on something not a Minter or ProjectMinterConfiguration",
      []
    );
    return;
  }

  let minterDetails = getMinterDetails(config);

  const withRemovedTypedMap: TypedMap<string, JSONValue> = new TypedMap();

  for (let i = 0; i < minterDetails.entries.length; i++) {
    let entry = minterDetails.entries[i];
    if (entry.key != key) {
      withRemovedTypedMap.set(entry.key, entry.value);
    }
  }
  config.extraMinterDetails = typedMapToJSONString(withRemovedTypedMap);

  config.save();
}

export function handleRemoveValueGeneric<T>(
  event: ConfigKeyRemoved,
  config: T,
  project: Project | null
): void {
  if (
    !(config instanceof ProjectMinterConfiguration || config instanceof Minter)
  ) {
    return;
  }

  if (project) {
    project.updatedAt = event.block.timestamp;
  }

  let minterDetails = getMinterDetails(config);

  const withRemovedTypedMap: TypedMap<string, JSONValue> = new TypedMap();
  let keyToToRemove = event.params._key.toString();

  for (let i = 0; i < minterDetails.entries.length; i++) {
    let entry = minterDetails.entries[i];
    if (entry.key != keyToToRemove) {
      withRemovedTypedMap.set(entry.key, entry.value);
    }
  }

  config.extraMinterDetails = typedMapToJSONString(withRemovedTypedMap);

  if (project) {
    project.save();
  }
  config.save();
}

export function handleRemoveValueProjectConfig(event: ConfigKeyRemoved): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    handleRemoveValueGeneric(
      event,
      minterProjectAndConfig.projectMinterConfiguration,
      minterProjectAndConfig.project
    );
  }
}

export function handleAddManyValueGeneric<T, C>(
  event: T,
  config: C,
  project: Project | null
): void {
  if (
    !(
      event instanceof ConfigValueAddedToSetBigInt ||
      event instanceof ConfigValueAddedToSetAddress ||
      event instanceof ConfigValueAddedToSetBytes ||
      event instanceof MinterConfigSetAddressEvent
    )
  ) {
    return;
  }
  if (
    !(config instanceof ProjectMinterConfiguration || config instanceof Minter)
  ) {
    return;
  }

  if (project) {
    project.updatedAt = event.block.timestamp;
  }

  if (config instanceof Minter) {
    config.updatedAt = event.block.timestamp;
  }

  let jsonResult = json.try_fromString(config.extraMinterDetails);

  let minterDetails: TypedMap<string, JSONValue>;

  if (jsonResult.isOk && jsonResult.value.kind == JSONValueKind.OBJECT) {
    minterDetails = jsonResult.value.toObject();
  } else {
    minterDetails = new TypedMap();
  }

  let val = minterDetails.get(event.params._key.toString());
  let newValue: JSONValue;

  if (event instanceof ConfigValueAddedToSetBigInt) {
    let arr: BigInt[] = [];
    if (val) {
      arr = val.toArray().map<BigInt>((v: JSONValue) => v.toBigInt());
    }
    // only add if it doesn't exist, so we act like a Set
    if (!arr.includes(event.params._value)) {
      arr.push(event.params._value);
    }
    newValue = arrayToJSONValue(arr.toString());
  } else if (
    event instanceof ConfigValueAddedToSetAddress ||
    event instanceof ConfigValueAddedToSetBytes ||
    event instanceof MinterConfigSetAddressEvent
  ) {
    let arr: string[] = [];
    if (val) {
      arr = val
        .toArray()
        .map<string>((v: JSONValue) => stringToJSONString(v.toString()));
    }
    let stringVal: string;
    if (
      event instanceof ConfigValueAddedToSetAddress ||
      event instanceof MinterConfigSetAddressEvent
    ) {
      stringVal = event.params._value.toHexString();
    } else {
      // for Bytes, use method to determine if string or hexString
      stringVal = bytesToJSONValue(event.params._value).toString();
    }
    // only add if it doesn't exist, so we act like a Set
    if (!arr.includes(stringVal)) {
      arr.push(stringToJSONString(stringVal));
    }
    newValue = arrayToJSONValue(arr.toString());
  }

  minterDetails.set(event.params._key.toString(), newValue);
  config.extraMinterDetails = typedMapToJSONString(minterDetails);

  if (project) {
    project.save();
  }
  config.save();
}

export function handleAddManyProjectConfig<T>(event: T): void {
  if (
    !(
      event instanceof ConfigValueAddedToSetBigInt ||
      event instanceof ConfigValueAddedToSetAddress ||
      event instanceof ConfigValueAddedToSetBytes
    )
  ) {
    return;
  }
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    handleAddManyValueGeneric(
      event,
      minterProjectAndConfig.projectMinterConfiguration,
      minterProjectAndConfig.project
    );
  }
}

export function handleAddManyMinterConfig<T>(event: T): void {
  if (!(event instanceof MinterConfigSetAddressEvent)) {
    return;
  }

  let minter = loadOrCreateMinter(event.address, event.block.timestamp);
  handleAddManyValueGeneric(event, minter, null);
}

export function handleAddManyBigIntValueProjectConfig(
  event: ConfigValueAddedToSetBigInt
): void {
  handleAddManyProjectConfig(event);
}

export function handleAddManyAddressValueProjectConfig(
  event: ConfigValueAddedToSetAddress
): void {
  handleAddManyProjectConfig(event);
}

export function handleAddManyBytesValueProjectConfig(
  event: ConfigValueAddedToSetBytes
): void {
  handleAddManyProjectConfig(event);
}

export function handleAddManyAddressValueMinterConfig(
  event: MinterConfigSetAddressEvent
): void {
  handleAddManyMinterConfig(event);
}

export function handleRemoveManyValueGeneric<T, C>(
  event: T,
  config: C,
  project: Project | null
): void {
  if (
    !(
      event instanceof ConfigValueRemovedFromSetBigInt ||
      event instanceof ConfigValueRemovedFromSetAddress ||
      event instanceof ConfigValueRemovedFromSetBytes ||
      event instanceof MinterConfigSetAddressEvent
    )
  ) {
    return;
  }

  if (
    !(config instanceof ProjectMinterConfiguration || config instanceof Minter)
  ) {
    return;
  }

  if (project) {
    project.updatedAt = event.block.timestamp;
  }
  let minterDetails = getMinterDetails(config);
  let jsonArr = minterDetails.get(event.params._key.toString());
  let newValue: JSONValue;
  if (event instanceof ConfigValueRemovedFromSetBigInt) {
    let arrWithRemoved: BigInt[] = [];
    if (jsonArr) {
      let arr = jsonArr.toArray().map<BigInt>((v: JSONValue) => {
        return v.toBigInt();
      });
      for (let i = 0; i < arr.length; i++) {
        let entry = arr[i];
        if (entry != event.params._value) {
          arrWithRemoved.push(entry);
        }
      }
    }
    newValue = arrayToJSONValue(arrWithRemoved.toString());
  } else if (
    event instanceof ConfigValueRemovedFromSetAddress ||
    event instanceof ConfigValueRemovedFromSetBytes ||
    event instanceof MinterConfigSetAddressEvent
  ) {
    let arrWithRemoved: string[] = [];
    if (jsonArr) {
      let arr = jsonArr.toArray().map<string>((v: JSONValue) => {
        return v.toString();
      });
      for (let i = 0; i < arr.length; i++) {
        let entry = arr[i];
        let paramsVal: string = "";
        if (
          event instanceof ConfigValueRemovedFromSetAddress ||
          event instanceof MinterConfigSetAddressEvent
        ) {
          paramsVal = event.params._value.toHexString();
        }
        if (event instanceof ConfigValueRemovedFromSetBytes) {
          paramsVal = event.params._value.toString();
        }
        if (entry != paramsVal) {
          arrWithRemoved.push(stringToJSONString(entry));
        }
      }
    }
    newValue = arrayToJSONValue(arrWithRemoved.toString());
  }

  minterDetails.set(event.params._key.toString(), newValue);

  config.extraMinterDetails = typedMapToJSONString(minterDetails);

  if (project) {
    project.save();
  }
  config.save();
}

export function handleRemoveManyProjectConfig<T>(event: T): void {
  if (
    !(
      event instanceof ConfigValueRemovedFromSetBigInt ||
      event instanceof ConfigValueRemovedFromSetAddress ||
      event instanceof ConfigValueRemovedFromSetBytes
    )
  ) {
    return;
  }
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    handleRemoveManyValueGeneric(
      event,
      minterProjectAndConfig.projectMinterConfiguration,
      minterProjectAndConfig.project
    );
  }
}

export function handleRemoveManyMinterConfig<T>(event: T): void {
  if (!(event instanceof MinterConfigSetAddressEvent)) {
    return;
  }
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);
  handleRemoveManyValueGeneric(event, minter, null);
}

export function handleRemoveBigIntManyValueProjectConfig(
  event: ConfigValueRemovedFromSetBigInt
): void {
  handleRemoveManyProjectConfig(event);
}

export function handleRemoveAddressManyValueProjectConfig(
  event: ConfigValueRemovedFromSetAddress
): void {
  handleRemoveManyProjectConfig(event);
}
export function handleRemoveBytesManyValueProjectConfig(
  event: ConfigValueRemovedFromSetBytes
): void {
  handleRemoveManyProjectConfig(event);
}

export function handleRemoveAddressManyValueMinterConfig(
  event: MinterConfigSetAddressEvent
): void {
  handleRemoveManyMinterConfig(event);
}

export function handleReceiptUpdated(event: ReceiptUpdated): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);
  if (minter) {
    // load or create receipt
    let projectId = generateContractSpecificId(
      Address.fromString(minter.coreContract),
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
      syncNumSettleableInvocations(
        event.address,
        event.params._projectId,
        event
      );
    } else {
      log.warning(
        "Error while loading/creating receipt in tx {}, log index {}",
        [
          event.transaction.hash.toHexString(),
          event.transactionLogIndex.toString()
        ]
      );
    }
  } else {
    log.warning("Error while loading/creating minter with id {}", [
      event.address.toHexString()
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
  // update project extra minter details key `auctionRevenuesCollected` to true
  let genericEvent: ConfigValueSetBool;
  genericEvent = changetype<ConfigValueSetBool>(event);
  genericEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(event.params._projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("auctionRevenuesCollected"))
    ),
    new ethereum.EventParam("_value", ethereum.Value.fromBoolean(true))
  ];
  // call generic handler to populate project's extraMinterDetails
  handleSetValueProjectConfig(genericEvent);
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
  let settleableMinter = IFilteredMinterDAExpSettlementV1.bind(minterAddress);
  let latestPurchasePrice = settleableMinter.getProjectLatestPurchasePrice(
    projectId
  );
  // update extraMinterDetails key `currentSettledPrice` to be latestPurchasePrice
  let genericEvent: ConfigValueSetBytes = new ConfigValueSetBytes(
    event.address,
    event.logIndex,
    event.transactionLogIndex,
    event.logType,
    event.block,
    event.transaction,
    [],
    event.receipt
  );
  genericEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("currentSettledPrice"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromBytes(Bytes.fromUTF8(latestPurchasePrice.toString()))
    )
  ];
  // call generic handler to populate project's extraMinterDetails
  handleSetValueProjectConfig(genericEvent);
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
  let genericEvent: ConfigValueSetBigInt = new ConfigValueSetBigInt(
    event.address,
    event.logIndex,
    event.transactionLogIndex,
    event.logType,
    event.block,
    event.transaction,
    [],
    event.receipt
  );
  genericEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("numSettleableInvocations"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromUnsignedBigInt(numSettleableInvocations)
    )
  ];
  // call generic handler to populate project's extraMinterDetails
  handleSetValueProjectConfig(genericEvent);
}

class MinterProjectAndConfig {
  minter: Minter;
  project: Project;
  projectMinterConfiguration: ProjectMinterConfiguration;
}

function loadMinterProjectAndConfig(
  minterAddress: Address,
  projectId: BigInt,
  timestamp: BigInt
): MinterProjectAndConfig | null {
  let minter = loadOrCreateMinter(minterAddress, timestamp);

  let project = Project.load(
    generateContractSpecificId(
      Address.fromString(minter.coreContract),
      projectId
    )
  );
  if (!project) {
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
