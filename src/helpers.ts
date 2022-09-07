import {
  Address,
  BigInt,
  Bytes,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap
} from "@graphprotocol/graph-ts";
import { log } from "matchstick-as";
import { MinterDAExpV0 } from "../generated/MinterDAExpV0/MinterDAExpV0";
import { MinterDAExpV1 } from "../generated/MinterDAExpV1/MinterDAExpV1";
import { MinterDALinV0 } from "../generated/MinterDALinV0/MinterDALinV0";
import { MinterDALinV1 } from "../generated/MinterDALinV1/MinterDALinV1";
import { IFilteredMinterV0 } from "../generated/MinterSetPriceV0/IFilteredMinterV0";
import { Minter, ProjectMinterConfiguration } from "../generated/schema";

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
  return minterId + "-" + projectId.split("-")[1];
}

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
  let filteredMinterContract = IFilteredMinterV0.bind(minterAddress);

  // values assigned in contract constructors
  minter.minterFilter = filteredMinterContract
    .minterFilterAddress()
    .toHexString();
  minter.coreContract = filteredMinterContract
    .genArt721CoreAddress()
    .toHexString();
  minter.extraMinterDetails = "{}";

  // values assigned during contract deployments
  let minterType = filteredMinterContract.minterType();
  minter.type = minterType;
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

export function booleanToString(b: boolean): string {
  return b ? "true" : "false";
}

export function getMinterDetails<T>(config: T): TypedMap<string, JSONValue> {
  if (
    !(config instanceof ProjectMinterConfiguration || config instanceof Minter)
  ) {
    throw new Error("cannot find extra minter details on " + config);
  }
  let jsonResult = json.try_fromString(config.extraMinterDetails);

  let minterDetails: TypedMap<string, JSONValue>;
  if (jsonResult.isOk && jsonResult.value.kind == JSONValueKind.OBJECT) {
    minterDetails = jsonResult.value.toObject();
  } else {
    minterDetails = new TypedMap();
  }
  return minterDetails;
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
      stringToJSONString(entry.key.toString()) +
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

// If byte data is parseable to a valid unicode string then do so
// otherwise parse the byte data to a hex string
export function bytesToJSONValue(value: Bytes): JSONValue {
  // fallback - assume the data is a hex string (always valid)
  let result = json.try_fromString('["' + value.toHexString() + '"]');
  // If the bytes can be parsed as a string, then losslessly re-encoded into
  // UTF-8 bytes, then consider a valid UTF-8 encoded string and store
  // string value in json.
  // note: Bytes.toString() uses WTF-8 encoding as opposed to UTF-8.  Solidity
  // encodes UTF-8 strings, so safe assume any string data are UTF-8 encoded.
  let stringValue: string = value.toString();
  let reEncodedBytesValue: Bytes = Bytes.fromUTF8(stringValue);
  if (reEncodedBytesValue.toHexString() == value.toHexString()) {
    // if the bytes are the same then the string was valid UTF-8
    let potentialResult = json.try_fromString('["' + stringValue + '"]');
    if (potentialResult.isOk) {
      result = potentialResult;
    }
  }
  return result.value.toArray()[0];
}

export function stringToJSONString(value: string): string {
  return '"' + value + '"';
}
