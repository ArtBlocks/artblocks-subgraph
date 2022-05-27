import { Address, BigInt } from "@graphprotocol/graph-ts";
import { MinterDAExpV0 } from "../generated/MinterDAExpV0/MinterDAExpV0";
import { MinterDAExpV1 } from "../generated/MinterDAExpV1/MinterDAExpV1";
import { MinterDALinV0 } from "../generated/MinterDALinV0/MinterDALinV0";
import { MinterDALinV1 } from "../generated/MinterDALinV1/MinterDALinV1";
import { IFilteredMinterV0 } from "../generated/MinterSetPriceV0/IFilteredMinterV0";
import { Minter } from "../generated/schema";

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
