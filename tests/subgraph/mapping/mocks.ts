import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  createMockedFunction,
  newMockCall
} from "matchstick-as/assembly/index";
import { meridianScript } from "../../meridianScript";
import {
  randomizerAddress,
  TEST_CONTRACT,
  TEST_PROJECT
} from "../shared-mocks";

// mocks return values for Soldity contract calls in refreshContract() helper function
export const mockRefreshContractCalls = function(): void {
  createMockedFunction(
    Address.fromString(TEST_CONTRACT.id),
    "admin",
    "admin():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_CONTRACT.admin))
  ]);

  createMockedFunction(
    Address.fromString(TEST_CONTRACT.id),
    "artblocksAddress",
    "artblocksAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_CONTRACT.admin))
  ]);

  createMockedFunction(
    Address.fromString(TEST_CONTRACT.id),
    "artblocksPercentage",
    "artblocksPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_CONTRACT.renderProviderPercentage)
    )
  ]);

  createMockedFunction(
    Address.fromString(TEST_CONTRACT.id),
    "nextProjectId",
    "nextProjectId():(uint256)"
  ).returns([ethereum.Value.fromSignedBigInt(BigInt.fromString("0"))]);

  createMockedFunction(
    Address.fromString(TEST_CONTRACT.id),
    "randomizerContract",
    "randomizerContract():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(randomizerAddress))
  ]);
};

export const mockProjectDetailsCall = function(): void {
  let projectDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(TEST_PROJECT.name), // projectName
    ethereum.Value.fromString(TEST_PROJECT.artistName), // artist
    ethereum.Value.fromString(TEST_PROJECT.description), // description
    ethereum.Value.fromString(TEST_PROJECT.website), // website
    ethereum.Value.fromString(TEST_PROJECT.license), // license
    ethereum.Value.fromBoolean(true) // dynamic
  ];

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectDetailsReturnArray);
};

export const mockProjectTokenInfoCall = function(): void {
  let projectTokenInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.artistAddress)), // artistAddress
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.pricePerTokenInWei)
    ), // pricePerTokenInWei
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.invocations)
    ), // invocations
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.maxInvocations)
    ), // maxInvocations
    ethereum.Value.fromBoolean(TEST_PROJECT.active), // active
    ethereum.Value.fromAddress(
      Address.fromString(TEST_PROJECT.additionalPayee)
    ), // additionalPayee
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.additionalPayeePercentage)
    ), // additionalPayeePercentage
    ethereum.Value.fromString(TEST_PROJECT.currencySymbol), // currency
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.currencyAddress))
  ]; // currencyAddress
  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "projectTokenInfo",
    "projectTokenInfo(uint256):(address,uint256,uint256,uint256,bool,address,uint256,string,address)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectTokenInfoReturnArray);
};

export const mockProjectScriptInfoCall = function(): void {
  let projectScriptInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(TEST_PROJECT.scriptJSON), // scriptJSON
    ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // scriptCount
    ethereum.Value.fromBoolean(TEST_PROJECT.useHashString), // useHashString
    ethereum.Value.fromString(TEST_PROJECT.ipfsHash), // IPFSHash
    ethereum.Value.fromBoolean(TEST_PROJECT.locked), // locked
    ethereum.Value.fromBoolean(TEST_PROJECT.paused)
  ]; // paused

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "projectScriptInfo",
    "projectScriptInfo(uint256):(string,uint256,bool,string,bool,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectScriptInfoReturnArray);
};
