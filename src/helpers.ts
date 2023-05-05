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

import { setMinterExtraMinterDetailsValue } from "./minter-suite-mapping";
import { createTypedMapFromJSONString } from "./json";

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
    if (minter.type.startsWith("MinterDALin")) {
      const contract = IFilteredMinterDALinV1.bind(minterAddress);
      // @dev deprecated minter.minimumAuctionLengthInSeconds
      minter.minimumAuctionLengthInSeconds = contract.minimumAuctionLengthSeconds();
      setMinterExtraMinterDetailsValue(
        "minimumAuctionLengthInSeconds",
        contract.minimumAuctionLengthSeconds(),
        minter
      );
    } else if (minter.type.startsWith("MinterDAExp")) {
      const contract = IFilteredMinterDAExpV1.bind(minterAddress);
      // @dev deprecated minter.minimumHalfLifeInSeconds
      minter.minimumHalfLifeInSeconds = contract.minimumPriceDecayHalfLifeSeconds();
      // @dev deprecated minter.maximumHalfLifeInSeconds
      minter.maximumHalfLifeInSeconds = contract.maximumPriceDecayHalfLifeSeconds();
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
