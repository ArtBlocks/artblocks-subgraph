// We're importing these event types from MinterSetPriceV0
// but the signature should be the same for all filtered minters
import {
  Address,
  BigInt,
  Bytes,
  ethereum,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap
} from "@graphprotocol/graph-ts";

import {
  PricePerTokenInWeiUpdated,
  ProjectCurrencyInfoUpdated,
  PurchaseToDisabledUpdated
} from "../generated/MinterSetPriceV0/IFilteredMinterV0";

import {
  MinimumAuctionLengthSecondsUpdated as MinimumAuctionLengthSecondsUpdatedV0,
  ResetAuctionDetails as DALinV0ResetAuctionDetails,
  SetAuctionDetails as DALinV0SetAuctionDetails
} from "../generated/MinterDALinV0/MinterDALinV0";

import {
  AuctionHalfLifeRangeSecondsUpdated as AuctionHalfLifeRangeSecondsUpdatedV0,
  ResetAuctionDetails as DAExpV0ResetAuctionDetails,
  SetAuctionDetails as DAExpV0SetAuctionDetails
} from "../generated/MinterDAExpV0/MinterDAExpV0";

import {
  MinimumAuctionLengthSecondsUpdated as MinimumAuctionLengthSecondsUpdatedV1,
  ResetAuctionDetails as DALinV1ResetAuctionDetails,
  SetAuctionDetails as DALinV1SetAuctionDetails
} from "../generated/MinterDALinV1/MinterDALinV1";

import {
  AuctionHalfLifeRangeSecondsUpdated as AuctionHalfLifeRangeSecondsUpdatedV1,
  ResetAuctionDetails as DAExpV1ResetAuctionDetails,
  SetAuctionDetails as DAExpV1SetAuctionDetails
} from "../generated/MinterDAExpV1/MinterDAExpV1";

import {
  Minter,
  Project,
  ProjectMinterConfiguration
} from "../generated/schema";
import {
  arrayToJSONValue,
  booleanToString,
  generateContractSpecificId,
  getMinterDetails,
  getProjectMinterConfigId,
  loadOrCreateMinter,
  stringToJSONString,
  stringToJSONValue,
  typedMapToJSONString
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
} from "../generated/MinterFilterV0/IFilteredMinterV1";
import {
  AllowedHoldersOfProjects,
  RegisteredNFTAddress,
  UnregisteredNFTAddress,
  RemovedHoldersOfProjects
} from "../generated/MinterHolderV0/MinterHolderV0";
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

// MinterDALin events
export function handleMinimumAuctionLengthSecondsUpdatedV0(
  event: MinimumAuctionLengthSecondsUpdatedV0
): void {
  handleMinimumAuctionLengthSecondsUpdated(event);
}

export function handleMinimumAuctionLengthSecondsUpdatedV1(
  event: MinimumAuctionLengthSecondsUpdatedV1
): void {
  handleMinimumAuctionLengthSecondsUpdated(event);
}

export function handleMinimumAuctionLengthSecondsUpdated<T>(event: T): void {
  if (
    !(
      event instanceof MinimumAuctionLengthSecondsUpdatedV0 ||
      event instanceof MinimumAuctionLengthSecondsUpdatedV1
    )
  ) {
    return;
  }

  let minter = loadOrCreateMinter(event.address, event.block.timestamp);

  minter.minimumAuctionLengthInSeconds =
    event.params._minimumAuctionLengthSeconds;
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleDALinV0SetAuctionDetails(
  event: DALinV0SetAuctionDetails
): void {
  handleDALinSetAuctionDetails(event);
}

export function handleDALinV1SetAuctionDetails(
  event: DALinV1SetAuctionDetails
): void {
  handleDALinSetAuctionDetails(event);
}

export function handleDALinSetAuctionDetails<T>(event: T): void {
  if (
    !(
      event instanceof DALinV0SetAuctionDetails ||
      event instanceof DALinV1SetAuctionDetails
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

    projectMinterConfig.basePrice = event.params._basePrice;
    projectMinterConfig.startPrice = event.params._startPrice;
    projectMinterConfig.startTime = event.params._auctionTimestampStart;
    projectMinterConfig.endTime = event.params._auctionTimestampEnd;
    projectMinterConfig.priceIsConfigured = true;

    projectMinterConfig.save();

    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleDALinV0ResetAuctionDetails(
  event: DALinV0ResetAuctionDetails
): void {
  handleDALinResetAuctionDetails(event);
}

export function handleDALinV1ResetAuctionDetails(
  event: DALinV1ResetAuctionDetails
): void {
  handleDALinResetAuctionDetails(event);
}

export function handleDALinResetAuctionDetails<T>(event: T): void {
  if (
    !(
      event instanceof DALinV0ResetAuctionDetails ||
      event instanceof DALinV1ResetAuctionDetails
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
    projectMinterConfig.startPrice = null;
    projectMinterConfig.startTime = null;
    projectMinterConfig.endTime = null;
    projectMinterConfig.priceIsConfigured = false;

    projectMinterConfig.save();

    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

// MinterDAExp events
export function handleAuctionHalfLifeRangeSecondsUpdatedV0(
  event: AuctionHalfLifeRangeSecondsUpdatedV0
): void {
  handleAuctionHalfLifeRangeSecondsUpdated(event);
}

export function handleAuctionHalfLifeRangeSecondsUpdatedV1(
  event: AuctionHalfLifeRangeSecondsUpdatedV1
): void {
  handleAuctionHalfLifeRangeSecondsUpdated(event);
}

export function handleAuctionHalfLifeRangeSecondsUpdated<T>(event: T): void {
  if (
    !(
      event instanceof AuctionHalfLifeRangeSecondsUpdatedV0 ||
      event instanceof AuctionHalfLifeRangeSecondsUpdatedV1
    )
  ) {
    return;
  }

  let minter = loadOrCreateMinter(event.address, event.block.timestamp);

  minter.minimumHalfLifeInSeconds =
    event.params._minimumPriceDecayHalfLifeSeconds;
  minter.maximumHalfLifeInSeconds =
    event.params._maximumPriceDecayHalfLifeSeconds;

  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleDAExpV0SetAuctionDetails(
  event: DAExpV0SetAuctionDetails
): void {
  handleDAExpSetAuctionDetails(event);
}

export function handleDAExpV1SetAuctionDetails(
  event: DAExpV1SetAuctionDetails
): void {
  handleDAExpSetAuctionDetails(event);
}

export function handleDAExpSetAuctionDetails<T>(event: T): void {
  if (
    !(
      event instanceof DAExpV0SetAuctionDetails ||
      event instanceof DAExpV1SetAuctionDetails
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

    projectMinterConfig.basePrice = event.params._basePrice;
    projectMinterConfig.startPrice = event.params._startPrice;
    projectMinterConfig.startTime = event.params._auctionTimestampStart;
    projectMinterConfig.halfLifeSeconds =
      event.params._priceDecayHalfLifeSeconds;
    projectMinterConfig.priceIsConfigured = true;

    projectMinterConfig.save();

    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleDAExpV0ResetAuctionDetails(
  event: DAExpV0ResetAuctionDetails
): void {
  handleDAExpResetAuctionDetails(event);
}

export function handleDAExpV1ResetAuctionDetails(
  event: DAExpV1ResetAuctionDetails
): void {
  handleDAExpResetAuctionDetails(event);
}

export function handleDAExpResetAuctionDetails<T>(event: T): void {
  if (
    !(
      event instanceof DAExpV0ResetAuctionDetails ||
      event instanceof DAExpV1ResetAuctionDetails
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
    projectMinterConfig.startPrice = null;
    projectMinterConfig.startTime = null;
    projectMinterConfig.halfLifeSeconds = null;
    projectMinterConfig.priceIsConfigured = false;

    projectMinterConfig.save();

    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

// MinterHolder Specific Handlers

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
export function handleRegisteredNFTAddress(event: RegisteredNFTAddress): void {
  handleRegistrationNFTAddresses(event);
}

export function handleUnregisteredNFTAddress(
  event: UnregisteredNFTAddress
): void {
  handleRegistrationNFTAddresses(event);
}

// Generic Handlers
// Below is all logic pertaining to generic handlers used for maintaining JSON config stores on both the ProjectMinterConfiguration and Minter entities.
// Most logic is shared and bubbled up each respective handler for each action. We utilize ducktype to allow these to work on either a Minter or ProjectMinterConfiguration
// Because AssemblyScript does not support union types, we need to manually type check inside each method, to ensure correct usage.
// For any questions reach out to @jon or @ryley-o.eth. or see the following document https://docs.google.com/document/d/1XSxl04eJyTxc_rbj6cmq-j00zaYDzApBBLT67JXtaOw/edit?disco=AAAAZa8xp-Q

export function handleSetValueGeneric<T, C>(
  event: T,
  config: C,
  project: Project | null
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

  if (
    !(config instanceof ProjectMinterConfiguration || config instanceof Minter)
  ) {
    return;
  }

  if (project) {
    project.updatedAt = event.block.timestamp;
  }

  let minterDetails = getMinterDetails(config);
  let jsonKey = event.params._key.toString();
  let jsonValue: JSONValue;

  if (event instanceof ConfigValueSetBool) {
    jsonValue = json.fromString(booleanToString(event.params._value));
  } else if (event instanceof ConfigValueSetBigInt) {
    jsonValue = json.fromString(event.params._value.toString());
  } else if (event instanceof ConfigValueSetAddress) {
    jsonValue = stringToJSONValue(event.params._value.toHexString());
  } else if (event instanceof ConfigValueSetBytes) {
    jsonValue = stringToJSONValue(event.params._value.toString());
  }

  minterDetails.set(jsonKey, jsonValue);

  config.extraMinterDetails = typedMapToJSONString(minterDetails);

  config.save();
  if (project) {
    project.save();
  }
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
    handleSetValueGeneric(
      event,
      minterProjectAndConfig.projectMinterConfiguration,
      minterProjectAndConfig.project
    );
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
    arr.push(event.params._value);
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
      stringVal = event.params._value.toString();
    }
    arr.push(stringToJSONString(stringVal));
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
  if (minter) {
    handleAddManyValueGeneric(event, minter, null);
  }
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
  if (minter) {
    handleRemoveManyValueGeneric(event, minter, null);
  }
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

// Helpers
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
  if (
    !projectMinterConfig ||
    projectMinterConfig.minter != minterAddress.toHexString()
  ) {
    projectMinterConfig = new ProjectMinterConfiguration(
      getProjectMinterConfigId(minter.id, project.id)
    );
    projectMinterConfig.project = project.id;
    projectMinterConfig.minter = minterAddress.toHexString();
    projectMinterConfig.save();
  }

  return {
    minter: minter,
    project: project,
    projectMinterConfiguration: projectMinterConfig
  };
}
