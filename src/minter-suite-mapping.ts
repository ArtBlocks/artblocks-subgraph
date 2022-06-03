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

export function handleSetValueGeneric<T>(event: T): void {
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
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;

    let minterDetails = getMinterDetails(projectMinterConfig);
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

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );

    projectMinterConfig.save();
    project.save();
  }
}

export function handleSetBooleanValue(event: ConfigValueSetBool): void {
  handleSetValueGeneric(event);
}

export function handleSetBigIntValue(event: ConfigValueSetBigInt): void {
  handleSetValueGeneric(event);
}

export function handleSetAddressValue(event: ConfigValueSetAddress): void {
  handleSetValueGeneric(event);
}

export function handleSetBytesValue(event: ConfigValueSetBytes): void {
  handleSetValueGeneric(event);
}

export function handleRemoveValue(event: ConfigKeyRemoved): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    let minterDetails = getMinterDetails(projectMinterConfig);

    const withRemovedTypedMap: TypedMap<string, JSONValue> = new TypedMap();
    let keyToToRemove = event.params._key.toString();

    for (let i = 0; i < minterDetails.entries.length; i++) {
      let entry = minterDetails.entries[i];
      if (entry.key != keyToToRemove) {
        withRemovedTypedMap.set(entry.key, entry.value);
      }
    }

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      withRemovedTypedMap
    );

    project.save();
    projectMinterConfig.save();
  }
}

export function handleAddManyValueGeneric<T>(event: T): void {
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
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    let jsonResult = json.try_fromString(
      projectMinterConfig.extraMinterDetails
    );

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
      event instanceof ConfigValueAddedToSetBytes
    ) {
      let arr: string[] = [];
      if (val) {
        arr = val
          .toArray()
          .map<string>((v: JSONValue) => stringToJSONString(v.toString()));
      }
      let stringVal: string;
      if (event instanceof ConfigValueAddedToSetAddress) {
        stringVal = event.params._value.toHexString();
      } else {
        stringVal = event.params._value.toString();
      }
      arr.push(stringToJSONString(stringVal));
      newValue = arrayToJSONValue(arr.toString());
    }

    minterDetails.set(event.params._key.toString(), newValue);
    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );

    project.save();
    projectMinterConfig.save();
  }
}

export function handleAddManyBigIntValue(
  event: ConfigValueAddedToSetBigInt
): void {
  handleAddManyValueGeneric(event);
}

export function handleAddManyAddressValue(
  event: ConfigValueAddedToSetAddress
): void {
  handleAddManyValueGeneric(event);
}

export function handleAddManyBytesValue(
  event: ConfigValueAddedToSetBytes
): void {
  handleAddManyValueGeneric(event);
}

export function handleRemoveManyValueGeneric<T>(event: T): void {
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
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    let minterDetails = getMinterDetails(projectMinterConfig);
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
      event instanceof ConfigValueRemovedFromSetBytes
    ) {
      let arrWithRemoved: string[] = [];
      if (jsonArr) {
        let arr = jsonArr.toArray().map<string>((v: JSONValue) => {
          return v.toString();
        });
        for (let i = 0; i < arr.length; i++) {
          let entry = arr[i];
          if (entry != event.params._value.toString()) {
            arrWithRemoved.push(stringToJSONString(entry));
          }
        }
      }
      newValue = arrayToJSONValue(arrWithRemoved.toString());
    }

    minterDetails.set(event.params._key.toString(), newValue);

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );

    project.save();
    projectMinterConfig.save();
  }
}

export function handleRemoveBigIntManyValue(
  event: ConfigValueRemovedFromSetBigInt
): void {
  handleRemoveManyValueGeneric(event);
}

export function handleRemoveAddressManyValue(
  event: ConfigValueRemovedFromSetAddress
): void {
  handleRemoveManyValueGeneric(event);
}
export function handleRemoveBytesManyValue(
  event: ConfigValueRemovedFromSetBytes
): void {
  handleRemoveManyValueGeneric(event);
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
    return null;
  }

  return {
    minter: minter,
    project: project,
    projectMinterConfiguration: projectMinterConfig
  };
}
