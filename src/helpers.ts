import { Address, BigInt } from "@graphprotocol/graph-ts";
import { MinterDAExpV0 } from "../generated/MinterDAExpV0/MinterDAExpV0";
import { MinterDALinV0 } from "../generated/MinterDALinV0/MinterDALinV0";
import { MinterSetPriceERC20V0 } from "../generated/MinterSetPriceERC20V0/MinterSetPriceERC20V0";
import { MinterSetPriceV0 } from "../generated/MinterSetPriceV0/MinterSetPriceV0";
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
  }

  if (minterType == "MinterDAExpV0") {
    let MinterDAExpV0Contract = MinterDAExpV0.bind(minterAddress);
    minter.minimumHalfLifeInSeconds = MinterDAExpV0Contract.minimumPriceDecayHalfLifeSeconds();
    minter.maximumHalfLifeInSeconds = MinterDAExpV0Contract.maximumPriceDecayHalfLifeSeconds();
  }

  minter.updatedAt = timestamp;
  minter.save();
  return minter;
}
