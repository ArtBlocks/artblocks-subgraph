import {
  Address,
  BigInt,
  Bytes,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap,
  Value,
  ValueKind
} from "@graphprotocol/graph-ts";
import { MinterDAExpV0 } from "../generated/MinterDAExpV0/MinterDAExpV0";
import { MinterDAExpV1 } from "../generated/MinterDAExpV1/MinterDAExpV1";
import { MinterDALinV0 } from "../generated/MinterDALinV0/MinterDALinV0";
import { MinterDALinV1 } from "../generated/MinterDALinV1/MinterDALinV1";
import {
  ConfigValueSet,
  ConfigValueSet1,
  ConfigValueSet2,
  ConfigValueSet3
} from "../generated/MinterFilterV0-0xDDc77d8f935b255aD8b5651392D1284E29478b5b/IFilteredMinterV1";
import { IFilteredMinterV0 } from "../generated/MinterSetPriceV0/IFilteredMinterV0";
import { Minter } from "../generated/schema";
import { booleanToString } from "../tests/subgraph/shared-helpers";

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

export function generateContractSpecificId(
  contractAddress: Address,
  entityId: BigInt
): string {
  return contractAddress.toHexString() + "-" + entityId.toString();
}

export function generateProjectScriptId(
  projectId: string,
  scriptIndex: BigInt
): string {
  return projectId + "-" + scriptIndex.toString();
}

export function loadOrCreateMinter(
  minterAddress: Address,
  timestamp: BigInt
): Minter {
  let minter = Minter.load(minterAddress.toHexString());
  if (minter) {
    return minter;
  }

  minter = new Minter(minterAddress.toHexString());
  let filteredMinterContract = IFilteredMinterV0.bind(minterAddress);
  let minterType = filteredMinterContract.minterType();

  minter.type = minterType;
  minter.minterFilter = filteredMinterContract
    .minterFilterAddress()
    .toHexString();
  minter.coreContract = filteredMinterContract
    .genArt721CoreAddress()
    .toHexString();

  if (minterType == "MinterDALinV0") {
    let minterDALinV0Contract = MinterDALinV0.bind(minterAddress);
    minter.minimumAuctionLengthInSeconds = minterDALinV0Contract.minimumAuctionLengthSeconds();
  } else if (minterType == "MinterDALinV1") {
    let minterDALinV1Contract = MinterDALinV1.bind(minterAddress);
    minter.minimumAuctionLengthInSeconds = minterDALinV1Contract.minimumAuctionLengthSeconds();
  } else if (minterType == "MinterDAExpV0") {
    let minterDAExpV0Contract = MinterDAExpV0.bind(minterAddress);
    minter.minimumHalfLifeInSeconds = minterDAExpV0Contract.minimumPriceDecayHalfLifeSeconds();
    minter.maximumHalfLifeInSeconds = minterDAExpV0Contract.maximumPriceDecayHalfLifeSeconds();
  } else if (minterType == "MinterDAExpV1") {
    let minterDAExpV1Contract = MinterDAExpV1.bind(minterAddress);
    minter.minimumHalfLifeInSeconds = minterDAExpV1Contract.minimumPriceDecayHalfLifeSeconds();
    minter.maximumHalfLifeInSeconds = minterDAExpV1Contract.maximumPriceDecayHalfLifeSeconds();
  }

  minter.updatedAt = timestamp;
  minter.save();
  return minter;
}

export function typedMapToJSONString(map: TypedMap<String, JSONValue>): string {
  let jsonString = "{";
  for (let i = 0; i < map.entries.length; i++) {
    let entry = map.entries[i];
    let val = entry.value;
    let newVal = "";
    let quoted = "";
    if (JSONValueKind.BOOL == val.kind) {
      newVal = booleanToString(val.toBool());
    } else if (JSONValueKind.NUMBER == val.kind) {
      newVal = val.toBigInt().toString();
    } else if (JSONValueKind.STRING == val.kind) {
      newVal = val.toString();
      quoted = '"';
    } else if (JSONValueKind.ARRAY == val.kind) {
      newVal =
        "[" +
        val
          .toArray()
          .map<string>((v: JSONValue) => {
            let mapped = "";
            if (JSONValueKind.BOOL == v.kind) {
              mapped = booleanToString(v.toBool());
            } else if (JSONValueKind.STRING == v.kind) {
              mapped = '"' + v.toString() + '"';
            } else if (JSONValueKind.NUMBER == v.kind) {
              mapped = v.toBigInt().toString();
            }
            return mapped;
          })
          .toString() +
        "]";
    }

    jsonString +=
      '"' +
      entry.key +
      '"' +
      ":" +
      quoted +
      newVal +
      quoted +
      (i == map.entries.length - 1 ? "" : ",");
  }
  jsonString += "}";
  return jsonString;
}

export function stringToJSONValue(value: string): JSONValue {
  return json.fromString('["' + value + '"]').toArray()[0];
}
export function arrayToJSONValue(value: string): JSONValue {
  return json.fromString("[" + value + "]");
}
