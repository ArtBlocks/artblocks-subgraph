// We're importing these event types from MinterSetPriceV0
// but the signature should be the same for all filtered minters
import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  ethereum,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap,
  Value
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
  generateContractSpecificId,
  loadOrCreateMinter,
  stringToJSONValue,
  typedMapToJSONString
} from "./helpers";
import {
  ConfigValueAddedToSet,
  ConfigValueAddedToSet1,
  ConfigValueAddedToSet2,
  ConfigValueSet,
  ConfigValueSet1,
  ConfigValueSet2,
  ConfigValueSet3,
  ConfigValueSet4
} from "../generated/MinterFilterV0-0xDDc77d8f935b255aD8b5651392D1284E29478b5b/IFilteredMinterV1";
import { booleanToString } from "../tests/subgraph/shared-helpers";
import { log, logStore } from "matchstick-as";

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

export function handleSetBooleanValue(event: ConfigValueSet): void {
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
    if (jsonResult.isOk) {
      minterDetails = jsonResult.value.toObject();
    } else {
      minterDetails = new TypedMap();
    }
    minterDetails.set(
      event.params._key.toString(),
      json.fromString(booleanToString(event.params._value))
    );

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );
    projectMinterConfig.save();
    project.save();
  }
}

export function handleSetBigIntValue(event: ConfigValueSet1): void {
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

    if (jsonResult.isError) {
      logStore();
    }

    if (jsonResult.isOk) {
      minterDetails = jsonResult.value.toObject();
    } else {
      minterDetails = new TypedMap();
    }
    minterDetails.set(
      event.params._key.toString(),
      json.fromString(event.params._value.toString())
    );

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );
    projectMinterConfig.save();
    project.save();
  }
}
export function handleSetAddressValue(event: ConfigValueSet2): void {
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
    if (jsonResult.isOk) {
      minterDetails = jsonResult.value.toObject();
    } else {
      minterDetails = new TypedMap();
    }
    minterDetails.set(
      event.params._key.toString(),
      stringToJSONValue(event.params._value.toHexString())
    );

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );
    projectMinterConfig.save();
    project.save();
  }
}

export function handleSetBytesValue(event: ConfigValueSet3): void {
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
    if (jsonResult.isOk) {
      minterDetails = jsonResult.value.toObject();
    } else {
      minterDetails = new TypedMap();
    }

    minterDetails.set(
      event.params._key.toString(),
      stringToJSONValue(event.params._value.toString())
    );

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );
    projectMinterConfig.save();
    project.save();
  }
}

export function handleRemoveValue(event: any): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    const minterDetails = json
      .fromString(projectMinterConfig.extraMinterDetails)
      .toObject();
    minterDetails.set(event.params._key, null);
    projectMinterConfig.extraMinterDetails = minterDetails.toString();
    project.save();
    projectMinterConfig.save();
  }
}

export function handleAddManyBigIntValue(event: ConfigValueAddedToSet): void {
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
    if (jsonResult.isOk) {
      minterDetails = jsonResult.value.toObject();
    } else {
      minterDetails = new TypedMap();
    }
    let val = minterDetails.get(event.params._key.toString());
    let arr: BigInt[] = [];
    if (val) {
      arr = val.toArray().map<BigInt>((v: JSONValue) => v.toBigInt());
    }

    arr.push(event.params._value);

    minterDetails.set(
      event.params._key.toString(),
      arrayToJSONValue(arr.join(","))
    );
    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );

    project.save();
    projectMinterConfig.save();
  }
}

export function handleAddManyAddressValue(event: ConfigValueAddedToSet1): void {
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
    if (jsonResult.isOk) {
      minterDetails = jsonResult.value.toObject();
    } else {
      minterDetails = new TypedMap();
    }
    let val = minterDetails.get(event.params._key.toString());
    let arr: string[] = [];
    if (val) {
      arr = val.toArray().map<string>((v: JSONValue) => v.toString());
    }

    arr.push('"' + event.params._value.toHexString() + '"');

    minterDetails.set(
      event.params._key.toString(),
      arrayToJSONValue(arr.toString())
    );
    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );

    project.save();
    projectMinterConfig.save();
  }
}

export function handleAddManyBytesValue(event: ConfigValueAddedToSet2): void {
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
    if (jsonResult.isOk) {
      minterDetails = jsonResult.value.toObject();
    } else {
      minterDetails = new TypedMap();
    }
    let val = minterDetails.get(event.params._key.toString());
    let arr: string[] = [];
    if (val) {
      arr = val.toArray().map<string>((v: JSONValue) => v.toString());
    }

    arr.push('"' + event.params._value.toString() + '"');

    minterDetails.set(
      event.params._key.toString(),
      arrayToJSONValue(arr.toString())
    );

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      minterDetails
    );

    project.save();
    projectMinterConfig.save();
  }
}

export function handleRemoveManyValue(event: any): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );
  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;
    project.updatedAt = event.block.timestamp;
    const minterDetails = json
      .try_fromString(projectMinterConfig.extraMinterDetails)[0]
      .toObject();
    const arr = minterDetails.get(event.params._key).toArray();
    const newValues = arr.filter((v: any) => {
      return v !== event.params._value;
    });
    minterDetails.set(event.params._key, json.fromString(newValues.toString()));
    projectMinterConfig.extraMinterDetails = minterDetails.toString();
    project.save();
    projectMinterConfig.save();
  }
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

  let projectMinterConfig = ProjectMinterConfiguration.load(project.id);
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
