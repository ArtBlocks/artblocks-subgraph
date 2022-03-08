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
import { NULL_ADDRESS } from "../../src/constants";

const ONE_MILLION = 1000000;

// Some of these match up with our actual contracts but they could
// be any arbitrary address for testing purposes.
export const genArt721Address = "0x059edd72cd353df5106d2b9cc5ab83a52287ac3a";
export const genArt721CoreAddress =
  "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270";
export const genArt721Core2PBABAddress =
  "0x28f2d3805652fb5d359486dffb7d08320d403240";
export const randomizerAddress = "0x35549b4b0cc71ef151a1eaa1fd08ddfb9a608a81";
export const minterAddress = "0xe28458729c17572977f929895e6f1f240bd0a39f";
export const minterFilterAddress = "0xb542b9a72b1e91fb3745e93e6d8e5b6985a9aac0";
export const createdAtBlock = 11338811;
export const currentBlock = 11338815;
export const adminAddress = "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2";
export const artistAddress = "0xe28458729c17572977f929895e6f1f240bd0a39f";
export const renderProviderAddress =
  "0xf7a55108a6e830a809e88e74cbf5f5de9d930153";

class ContractValues {
  admin: string;
  createdAt: string;
  id: string;
  mintWhitelisted: string[];
  nextProjectId: string;
  randomizerContract: string;
  renderProviderAddress: string;
  renderProviderPercentage: string;
  updatedAt: string;
}

export const TEST_CONTRACT: ContractValues = {
  id: genArt721Address,
  admin: adminAddress,
  renderProviderPercentage: "10",
  renderProviderAddress: renderProviderAddress,
  createdAt: createdAtBlock.toString(),
  updatedAt: createdAtBlock.toString(),
  nextProjectId: "0",
  mintWhitelisted: ["0xe28458729c17572977f929895e6f1f240bd0a39f"],
  randomizerContract: randomizerAddress
};

// These should be used to set return values for mock calls
class DefaultProjectValues {
  active: boolean;
  additionalPayeeAddress: string;
  additionalPayeePercentage: string;
  artistName: string;
  baseIpfsUri: string;
  baseUri: string;
  complete: boolean;
  currencyAddress: string;
  currencySymbol: string;
  description: string;
  dynamic: boolean;
  invocations: string;
  ipfsHash: string;
  license: string;
  locked: boolean;
  maxInvocations: string;
  paused: boolean;
  royaltyPercentage: string;
  scriptCount: string;
  scriptJSON: string;
  useHashString: boolean;
  useIpfs: boolean;
  website: string;
}

export const DEFAULT_PROJECT_VALUES: DefaultProjectValues = {
  active: false,
  additionalPayeeAddress: NULL_ADDRESS,
  additionalPayeePercentage: "0",
  artistName: "",
  baseIpfsUri: "",
  baseUri: "",
  complete: false,
  currencyAddress: NULL_ADDRESS,
  currencySymbol: "ETH",
  description: "",
  dynamic: true,
  invocations: "0",
  ipfsHash: "",
  license: "",
  locked: false,
  maxInvocations: ONE_MILLION.toString(),
  paused: true,
  royaltyPercentage: "0",
  scriptCount: "0",
  scriptJSON: "",
  useHashString: true,
  useIpfs: false,
  website: ""
};

export const ACCOUNT_ENTITY_TYPE = "Account";
export const PROJECT_ENTITY_TYPE = "Project";
export const CONTRACT_ENTITY_TYPE = "Contract";
export const WHITELISTING_ENTITY_TYPE = "Whitelisting";
export const PROJECTSCRIPT_ENTITY_TYPE = "ProjectScript";
export const TOKEN_ENTITY_TYPE = "Token";

// helper mock function to initialize a Project entity in local in-memory store
export const createProjectToLoad = function(): void {
  let newProjectCall = changetype<AddProjectCall>(newMockCall());
  newProjectCall.to = Address.fromString(DEFAULT_PROJECT_VALUES.contract);
  newProjectCall.block.timestamp = BigInt.fromString("1232");

  newProjectCall.inputValues = [
    new ethereum.EventParam(
      "projectName",
      ethereum.Value.fromString(DEFAULT_PROJECT_VALUES.name)
    ),
    new ethereum.EventParam(
      "artistAddress",
      ethereum.Value.fromString(DEFAULT_PROJECT_VALUES.artistAddress)
    ),
    new ethereum.EventParam(
      "pricePerTokenInWei",
      ethereum.Value.fromString(DEFAULT_PROJECT_VALUES.pricePerTokenInWei)
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

// mocks return values for Soldity contract calls in refreshProjectScript() helper function
export const mockRefreshProjectScript = function(): void {
  let projectScriptByIndexInputs: Array<ethereum.Value> = [
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(DEFAULT_PROJECT_VALUES.projectId)
    ), // projectId
    ethereum.Value.fromSignedBigInt(BigInt.fromString("0"))
  ]; // _index;
  createMockedFunction(
    Address.fromString(DEFAULT_PROJECT_VALUES.contract),
    "projectScriptByIndex",
    "projectScriptByIndex(uint256,uint256):(string)"
  )
    .withArgs(projectScriptByIndexInputs)
    .returns([ethereum.Value.fromString(meridianScript)]);
};
