import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as";

export function mockMinterType(
  minterAddress: Address,
  minterType: string
): void {
  createMockedFunction(
    minterAddress,
    "minterType",
    "minterType():(string)"
  ).returns([ethereum.Value.fromString(minterType)]);
}

export function mockMinterFilterAddress(
  minterAddress: Address,
  minterFilterAddress: Address
): void {
  createMockedFunction(
    minterAddress,
    "minterFilterAddress",
    "minterFilterAddress():(address)"
  ).returns([ethereum.Value.fromAddress(minterFilterAddress)]);
}

export function mockCoreContract(
  minterAddress: Address,
  coreContract: Address
): void {
  createMockedFunction(
    minterAddress,
    "genArt721CoreAddress",
    "genArt721CoreAddress():(address)"
  ).returns([ethereum.Value.fromAddress(coreContract)]);
}

export function mockGetProjectAndMinterInfoAt(
  minterFilterAddress: Address,
  index: BigInt,
  projectId: BigInt,
  minterAddress: Address,
  minterType: string
): void {
  createMockedFunction(
    minterFilterAddress,
    "getProjectAndMinterInfoAt",
    "getProjectAndMinterInfoAt(uint256):(uint256,address,string)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(index)])
    .returns([
      ethereum.Value.fromUnsignedBigInt(projectId), // project id
      ethereum.Value.fromAddress(minterAddress), // minter address
      ethereum.Value.fromString(minterType) // minter type
    ]);
}

export function mockPurchaseToDisabled(
  minterAddress: Address,
  projectId: BigInt,
  purchaseToDisabled: boolean
): void {
  createMockedFunction(
    minterAddress,
    "purchaseToDisabled",
    "purchaseToDisabled(uint256):(bool)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns([ethereum.Value.fromBoolean(purchaseToDisabled)]);
}

export function mockGetPriceInfo(
  minterAddress: Address,
  projectId: BigInt,
  priceIsConfigured: boolean,
  basePrice: BigInt,
  currencySymbol: string,
  currencyAddress: Address
): void {
  createMockedFunction(
    minterAddress,
    "getPriceInfo",
    "getPriceInfo(uint256):(bool,uint256,string,address)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns([
      ethereum.Value.fromBoolean(priceIsConfigured),
      ethereum.Value.fromUnsignedBigInt(basePrice),
      ethereum.Value.fromString(currencySymbol),
      ethereum.Value.fromAddress(currencyAddress)
    ]);
}
