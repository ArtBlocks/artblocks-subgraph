import {
  Address,
  BigInt,
  Bytes,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap,
  store,
  ethereum
} from "@graphprotocol/graph-ts";
import { IFilteredMinterV2 } from "../generated/MinterSetPrice/IFilteredMinterV2";
import {
  Minter,
  ProjectMinterConfiguration,
  Account,
  Whitelisting,
  Receipt
} from "../generated/schema";
import { IFilteredMinterDALinV1 } from "../generated/MinterDALin/IFilteredMinterDALinV1";
import { IFilteredMinterDAExpV1 } from "../generated/MinterDAExp/IFilteredMinterDAExpV1";

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
  return minterId + "-" + projectId.split("-")[1];
}

// @dev projectId is the number of the project, contract-specific id is not required
export function getReceiptId(
  minterId: string,
  projectId: BigInt,
  accountAddress: Address
): string {
  return (
    minterId + "-" + projectId.toString() + "-" + accountAddress.toHexString()
  );
}

// @dev projectId must be the contract-specific id
export function loadOrCreateReceipt(
  minterId: string,
  projectId: string,
  accountAddress: Address,
  timestamp: BigInt
): Receipt {
  let receiptId = getReceiptId(
    minterId,
    BigInt.fromString(projectId.split("-")[1]),
    accountAddress
  );
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
  minter.minterFilter = filteredMinterContract
    .minterFilterAddress()
    .toHexString();
  minter.coreContract = filteredMinterContract
    .genArt721CoreAddress()
    .toHexString();
  minter.extraMinterDetails = "{}";

  // values assigned during contract deployments
  let minterType = filteredMinterContract.try_minterType();
  if (!minterType.reverted) {
    minter.type = minterType.value;
    // populate any minter-specific values
    if (minter.type.startsWith("MinterDALin")) {
      const contract = IFilteredMinterDALinV1.bind(minterAddress);
      minter.minimumAuctionLengthInSeconds = contract.minimumAuctionLengthSeconds();
    } else if (minter.type.startsWith("MinterDAExp")) {
      const contract = IFilteredMinterDAExpV1.bind(minterAddress);
      minter.minimumHalfLifeInSeconds = contract.minimumPriceDecayHalfLifeSeconds();
      minter.maximumHalfLifeInSeconds = contract.maximumPriceDecayHalfLifeSeconds();
    }
  } else {
    // if minterType() reverts, then the minter is not as expected and is
    // designated as empty string
    minter.type = "";
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

export function generateTransferId(
  transactionHash: Bytes,
  logIndex: BigInt
): string {
  return transactionHash.toHexString() + "-" + logIndex.toString();
}
