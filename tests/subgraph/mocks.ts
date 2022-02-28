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
  admin: string;
  additionalPayee: string;
  additionalPayeePercentage: string;
  artistAddress: string;
  artistName: string;
  artblocksPercentage: string;
  complete: boolean;
  contract: string;
  createdAt: string;
  currencyAddress: string;
  currencySymbol: string;
  dynamic: boolean;
  id: string;
  ipfsHash: string;
  invocations: string;
  locked: boolean;
  maxInvocations: string;
  name: string;
  paused: boolean;
  projectDescription: string;
  projectLicense: string;
  pricePerTokenInWei: string;
  projectId: string;
  projectScriptId: string;
  projectScriptJSON: string;
  renderProviderPercentage: string;
  scriptCount: string;
  tokenId: string;
  updatedAt: string;
  useHashString: boolean;
  useIpfs: boolean;
  website: string;
}

export const TEST_PROJECT: ProjectValues = {
  active: false,
  admin: "0x90cba2bbb19ecc291a12066fd8329d65fa1f1947",
  additionalPayee: "0xc079F0A6E8809E41A2A39D6532ff3dfa6B48e6bB",
  additionalPayeePercentage: "10",
  artistAddress: "0x1233973f9aea61250e98b697246cb10146903672",
  artistName: "Beeple",
  artblocksPercentage: "10",
  complete: false,
  contract: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
  createdAt: "1232",
  currencyAddress: "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
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
  projectDescription: "Template description blah blah blah",
  projectId: "99",
  projectLicense: "MIT License - please copy if you want",
  projectScriptId: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
  projectScriptJSON:
    '{"type":"p5js","version":"1.0.0","instructions":"click to animate | space bar changes background color","aspectRatio":"1.5","interactive":"true","curation_status":"curated"}',
  renderProviderPercentage: "10",
  scriptCount: "1",
  tokenId: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-123",
  updatedAt: "1232",
  useHashString: true,
  useIpfs: false,
  website: "artblocks.io"
};

export const ACCOUNT_ENTITY_TYPE = "Account";
export const PROJECT_ENTITY_TYPE = "Project";
export const CONTRACT_ENTITY_TYPE = "Contract";
export const WHITELISTING_ENTITY_TYPE = "Whitelisting";
export const PROJECTSCRIPT_ENTITY_TYPE = "ProjectScript";
export const TOKEN_ENTITY_TYPE = "Token";

// mocks return values for Soldity contract calls in refreshContract() helper function
export const mockRefreshContractCalls = function(): void {
  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "admin",
    "admin():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.admin))
  ]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "artblocksAddress",
    "artblocksAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract))
  ]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "artblocksPercentage",
    "artblocksPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.artblocksPercentage)
    )
  ]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "nextProjectId",
    "nextProjectId():(uint256)"
  ).returns([ethereum.Value.fromSignedBigInt(BigInt.fromString("100"))]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "randomizerContract",
    "randomizerContract():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract))
  ]);
};

// mocks return values for PBAB Soldity contract calls in refreshContract() helper function
export const mockPBABRefreshContractCalls = function(): void {
  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "admin",
    "admin():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.admin))
  ]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "artblocksAddress",
    "artblocksAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract))
  ]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "renderProviderAddress",
    "renderProviderAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract))
  ]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "renderProviderPercentage",
    "renderProviderPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(TEST_PROJECT.renderProviderPercentage)
    )
  ]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "nextProjectId",
    "nextProjectId():(uint256)"
  ).returns([ethereum.Value.fromSignedBigInt(BigInt.fromString("100"))]);

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "randomizerContract",
    "randomizerContract():(address)"
  ).returns([
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract))
  ]);
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
    Address.fromString(TEST_PROJECT.contract),
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectDetailsReturnArray);

  let projectTokenInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract)), // artistAddress
    ethereum.Value.fromSignedBigInt(BigInt.fromString("100000000")), // pricePerTokenInWei
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

  let projectScriptInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(meridianScript), // scriptJSON
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
    Address.fromString(TEST_PROJECT.contract),
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string,bool)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectDetailsReturnArray);

  let projectTokenInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract)), // artistAddress
    ethereum.Value.fromSignedBigInt(BigInt.fromString("100000000")), // pricePerTokenInWei
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
    )
  ]; // additionalPayeePercentage
  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
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
    Address.fromString(TEST_PROJECT.contract),
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
    Address.fromString(TEST_PROJECT.contract),
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string)"
  )
    .withArgs([
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ])
    .returns(projectDetailsReturnArray);

  let projectTokenInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract)), // artistAddress
    ethereum.Value.fromSignedBigInt(BigInt.fromString("100000000")), // pricePerTokenInWei
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

  let projectScriptInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(meridianScript), // scriptJSON
    ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // scriptCount
    ethereum.Value.fromString(TEST_PROJECT.ipfsHash), // IPFSHash
    ethereum.Value.fromBoolean(TEST_PROJECT.locked), // locked
    ethereum.Value.fromBoolean(TEST_PROJECT.paused)
  ]; // paused
  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
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
    Address.fromString(TEST_PROJECT.contract),
    "projectScriptByIndex",
    "projectScriptByIndex(uint256,uint256):(string)"
  )
    .withArgs(projectScriptByIndexInputs)
    .returns([ethereum.Value.fromString(meridianScript)]);
};

// helper mock function to initialize a Project entity in local in-memory store
export const createProjectToLoad = function(): void {
  let newProjectCall = changetype<AddProjectCall>(newMockCall());
  newProjectCall.to = Address.fromString(TEST_PROJECT.contract);
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
