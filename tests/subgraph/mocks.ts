import {
  createMockedFunction,
  newMockCall
} from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { meridianScript } from "../meridianScript";
import { AddProjectCall } from "../../generated/GenArt721Core/GenArt721Core";
import { handleAddProject } from "../../src/mapping";
import { Token } from "../../generated/schema";
import { generateContractSpecificId } from "../../src/helpers";

class ProjectValues {
  active: boolean;
  admin: Address;
  additionalPayee: Address;
  additionalPayeePercentage: string;
  artistAddress: string;
  artblocksPercentage: string;
  complete: boolean;
  contract: Address;
  createdAt: string;
  currencyAddress: Address;
  currencySymbol: string;
  dynamic: boolean;
  id: string;
  ipfsHash: string;
  invocations: string;
  locked: boolean;
  maxInvocations: string;
  name: string;
  paused: boolean;
  pricePerTokenInWei: string;
  projectId: string;
  renderProviderPercentage: string;
  scriptCount: string;
  updatedAt: string;
  useHashString: boolean;
  useIpfs: boolean;
}

export const TEST_PROJECT: ProjectValues = {
  active: false,
  admin: Address.fromString("0x90cBa2Bbb19ecc291A12066Fd8329D65FA1f1947"),
  additionalPayee: Address.fromString(
    "0xc079F0A6E8809E41A2A39D6532ff3dfa6B48e6bB"
  ),
  additionalPayeePercentage: "10",
  artistAddress: "0x1233973F9aEa61250e98b697246cb10146903672",
  artblocksPercentage: "10",
  complete: false,
  contract: Address.fromString("0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"),
  createdAt: "1232",
  currencyAddress: Address.fromString(
    "0xc944e90c64b2c07662a292be6244bdf05cda44a7"
  ),
  currencySymbol: "GRT",
  dynamic: true,
  id: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
  ipfsHash: "mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a",
  invocations: "1024",
  locked: false,
  maxInvocations: "1024",
  name: "Ringers",
  paused: true,
  pricePerTokenInWei: "123",
  projectId: "99",
  renderProviderPercentage: "10",
  scriptCount: "1",
  updatedAt: "1232",
  useHashString: true,
  useIpfs: false
};

// mocks return values for Soldity contract calls in refreshContract() helper function
export const mockRefreshContractCalls = function(): void {
  createMockedFunction(
    TEST_PROJECT.contract,
    "admin",
    "admin():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_PROJECT.admin)]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "artblocksAddress",
    "artblocksAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_PROJECT.contract)]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "artblocksPercentage",
    "artblocksPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.artblocksPercentage)
    )
  ]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "nextProjectId",
    "nextProjectId():(uint256)"
  ).returns([ethereum.Value.fromSignedBigInt(BigInt.fromString("100"))]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "randomizerContract",
    "randomizerContract():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_PROJECT.contract)]);
};

// mocks return values for PBAB Soldity contract calls in refreshContract() helper function
export const mockPBABRefreshContractCalls = function(): void {
  createMockedFunction(
    TEST_PROJECT.contract,
    "admin",
    "admin():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_PROJECT.admin)]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "artblocksAddress",
    "artblocksAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_PROJECT.contract)]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "renderProviderAddress",
    "renderProviderAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_PROJECT.contract)]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "renderProviderPercentage",
    "renderProviderPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.renderProviderPercentage)
    )
  ]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "nextProjectId",
    "nextProjectId():(uint256)"
  ).returns([ethereum.Value.fromSignedBigInt(BigInt.fromString("100"))]);

  createMockedFunction(
    TEST_PROJECT.contract,
    "randomizerContract",
    "randomizerContract():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_PROJECT.contract)]);
};

// mocks return values for Soldity contract calls in handleAddProject() helper function
export const mockProjectContractCalls = function(): void {
  let projectDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString("string1"), // projectName
    ethereum.Value.fromString("string2"), // artist
    ethereum.Value.fromString("string3"), // description
    ethereum.Value.fromString("string4"), // website
    ethereum.Value.fromString("string7"), // license
    ethereum.Value.fromBoolean(true)
  ]; // dynamic
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectDetailsReturnArray);

  let projectTokenInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(TEST_PROJECT.contract), // artistAddress
    ethereum.Value.fromSignedBigInt(BigInt.fromString("100000000")), // pricePerTokenInWei
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.invocations)
    ), // invocations
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.maxInvocations)
    ), // maxInvocations
    ethereum.Value.fromBoolean(TEST_PROJECT.active), // active
    ethereum.Value.fromAddress(TEST_PROJECT.additionalPayee), // additionalPayee
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.additionalPayeePercentage)
    ), // additionalPayeePercentage
    ethereum.Value.fromString(TEST_PROJECT.currencySymbol), // currency
    ethereum.Value.fromAddress(TEST_PROJECT.currencyAddress)
  ]; // currencyAddress
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectTokenInfo",
    "projectTokenInfo(uint256):(address,uint256,uint256,uint256,bool,address,uint256,string,address)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectTokenInfoReturnArray);

  let projectScriptInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(meridianScript), // scriptJSON
    ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // scriptCount
    ethereum.Value.fromBoolean(TEST_PROJECT.useHashString), // useHashString
    ethereum.Value.fromString(TEST_PROJECT.ipfsHash), // IPFSHash
    ethereum.Value.fromBoolean(TEST_PROJECT.locked), // locked
    ethereum.Value.fromBoolean(TEST_PROJECT.paused)
  ]; // paused
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectScriptInfo",
    "projectScriptInfo(uint256):(string,uint256,bool,string,bool,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectScriptInfoReturnArray);
};

export const mockOGProjectContractCalls = function(): void {
  let projectDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString("string1"), // projectName
    ethereum.Value.fromString("string2"), // artist
    ethereum.Value.fromString("string3"), // description
    ethereum.Value.fromString("string4"), // website
    ethereum.Value.fromString("string7"), // license
    ethereum.Value.fromBoolean(true)
  ]; // dynamic
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectDetailsReturnArray);

  let projectTokenInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(TEST_PROJECT.contract), // artistAddress
    ethereum.Value.fromSignedBigInt(BigInt.fromString("100000000")), // pricePerTokenInWei
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.invocations)
    ), // invocations
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.maxInvocations)
    ), // maxInvocations
    ethereum.Value.fromBoolean(TEST_PROJECT.active), // active
    ethereum.Value.fromAddress(TEST_PROJECT.additionalPayee), // additionalPayee
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.additionalPayeePercentage)
    )
  ]; // additionalPayeePercentage
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectTokenInfo",
    "projectTokenInfo(uint256):(address,uint256,uint256,uint256,bool,address,uint256)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectTokenInfoReturnArray);

  let projectScriptInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(meridianScript), // scriptJSON
    ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // scriptCount
    ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // hashes
    ethereum.Value.fromString(TEST_PROJECT.ipfsHash), // ipfsHash
    ethereum.Value.fromBoolean(TEST_PROJECT.locked), // locked
    ethereum.Value.fromBoolean(TEST_PROJECT.paused) // paused
  ];
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectScriptInfo",
    "projectScriptInfo(uint256):(string,uint256,uint256,string,bool,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectScriptInfoReturnArray);
};

export const mockPBABProjectContractCalls = function(): void {
  let projectDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString("string1"), // projectName
    ethereum.Value.fromString("string2"), // artist
    ethereum.Value.fromString("string3"), // description
    ethereum.Value.fromString("string4"), // website
    ethereum.Value.fromString("string7") // license
  ];
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectDetailsReturnArray);

  let projectTokenInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(TEST_PROJECT.contract), // artistAddress
    ethereum.Value.fromSignedBigInt(BigInt.fromString("100000000")), // pricePerTokenInWei
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.invocations)
    ), // invocations
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.maxInvocations)
    ), // maxInvocations
    ethereum.Value.fromBoolean(TEST_PROJECT.active), // active
    ethereum.Value.fromAddress(TEST_PROJECT.additionalPayee), // additionalPayee
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.additionalPayeePercentage)
    ), // additionalPayeePercentage
    ethereum.Value.fromString(TEST_PROJECT.currencySymbol), // currency
    ethereum.Value.fromAddress(TEST_PROJECT.currencyAddress)
  ]; // currencyAddress
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectTokenInfo",
    "projectTokenInfo(uint256):(address,uint256,uint256,uint256,bool,address,uint256,string,address)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectTokenInfoReturnArray);

  let projectScriptInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(meridianScript), // scriptJSON
    ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // scriptCount
    ethereum.Value.fromString(TEST_PROJECT.ipfsHash), // IPFSHash
    ethereum.Value.fromBoolean(TEST_PROJECT.locked), // locked
    ethereum.Value.fromBoolean(TEST_PROJECT.paused)
  ]; // paused
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectScriptInfo",
    "projectScriptInfo(uint256):(string,uint256,string,bool,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectScriptInfoReturnArray);
};

// mocks return values for Soldity contract calls in refreshProjectScript() helper function
export const mockRefreshProjectScript = function(): void {
  let projectScriptByIndexInputs: Array<ethereum.Value> = [
    ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId)), // projectId
    ethereum.Value.fromSignedBigInt(BigInt.fromString("0"))
  ]; // _index;
  createMockedFunction(
    TEST_PROJECT.contract,
    "projectScriptByIndex",
    "projectScriptByIndex(uint256,uint256):(string)"
  )
    .withArgs(projectScriptByIndexInputs)
    .returns([ethereum.Value.fromString(meridianScript)]);
};

// helper mock function to initialize a Project entity in local in-memory store
export const createProjectToLoad = function(): void {
  let newProjectCall = changetype<AddProjectCall>(newMockCall());
  newProjectCall.to = TEST_PROJECT.contract;
  newProjectCall.block.timestamp = BigInt.fromString("1232");

  newProjectCall.inputValues = [
    new ethereum.EventParam(
      "projectName",
      ethereum.Value.fromString(TEST_PROJECT.name)
    ),
    new ethereum.EventParam(
      "artistAddress",
      ethereum.Value.fromString(TEST_PROJECT.artistAddress)
    ),
    new ethereum.EventParam(
      "pricePerTokenInWei",
      ethereum.Value.fromString(TEST_PROJECT.pricePerTokenInWei)
    )
  ];

  handleAddProject(newProjectCall);
};

// helper mock function to initialize a Token entity in local in-memory store
export const createTokenToLoad = function(
  address: Address,
  tokenId: BigInt
): void {
  let token = new Token(generateContractSpecificId(address, tokenId));

  token.save();
};
