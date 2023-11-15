import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  createMockedFunction,
  newMockCall
} from "matchstick-as/assembly/index";
import { AddProjectCall } from "../../../generated/GenArt721Core2PBAB/GenArt721Core2PBAB";
import { handleAddProject } from "../../../src/mapping-v2-core";
import {
  CURRENT_BLOCK_TIMESTAMP,
  TEST_CONTRACT_ADDRESS,
  TEST_CONTRACT,
  DEFAULT_PROJECT_VALUES
} from "../shared-helpers";
import { Project } from "../../../generated/schema";
import { generateContractSpecificId } from "../../../src/helpers";

// helper mock function to initialize a Project entity in local in-memory store
export function addNewProjectToStore(
  projectId: BigInt,
  projectName: string,
  artistAddress: Address,
  pricePerTokenInWei: BigInt,
  mockCallsWithDefaults: boolean,
  timestamp: BigInt | null
): Project {
  if (mockCallsWithDefaults) {
    mockProjectDetailsCallWithDefaults(projectId, projectName);
    mockProjectTokenInfoCallWithDefaults(
      projectId,
      artistAddress,
      pricePerTokenInWei
    );
    mockProjectScriptInfoCall(projectId, null);
  }

  const newProjectCall = changetype<AddProjectCall>(newMockCall());
  newProjectCall.to = TEST_CONTRACT_ADDRESS;
  newProjectCall.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  newProjectCall.inputValues = [
    new ethereum.EventParam(
      "projectName",
      ethereum.Value.fromString(projectName)
    ),
    new ethereum.EventParam(
      "artistAddress",
      ethereum.Value.fromAddress(artistAddress)
    ),
    new ethereum.EventParam(
      "pricePerTokenInWei",
      ethereum.Value.fromUnsignedBigInt(pricePerTokenInWei)
    )
  ];

  handleAddProject(newProjectCall);

  return changetype<Project>(
    Project.load(generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId))
  );
}

// mocks return values for Soldity contract calls in refreshContract() helper function
export function mockRefreshContractCalls(
  nextProjectId: BigInt,
  overrides: Map<string, string> | null
): void {
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "admin",
    "admin():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.admin)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderAddress",
    "renderProviderAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.renderProviderAddress)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderPercentage",
    "renderProviderPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(TEST_CONTRACT.renderProviderPercentage)
  ]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "nextProjectId",
    "nextProjectId():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(nextProjectId)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "randomizerContract",
    "randomizerContract():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.randomizerContract)]);
}

export function mockProjectDetailsCallWithDefaults(
  projectId: BigInt,
  name: string
): void {
  return mockProjectDetailsCall(projectId, name, null, null, null, null);
}

export function mockProjectDetailsCall(
  projectId: BigInt,
  name: string,
  artistName: string | null,
  description: string | null,
  website: string | null,
  license: string | null
): void {
  let projectDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(name), // name
    ethereum.Value.fromString(
      artistName ? artistName : DEFAULT_PROJECT_VALUES.artistName
    ), // artistName
    ethereum.Value.fromString(
      description ? description : DEFAULT_PROJECT_VALUES.description
    ), // description
    ethereum.Value.fromString(
      website ? website : DEFAULT_PROJECT_VALUES.website
    ), // website
    ethereum.Value.fromString(
      license ? license : DEFAULT_PROJECT_VALUES.license
    ) // license
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectDetailsReturnArray);
}

export function mockProjectTokenInfoCallWithDefaults(
  projectId: BigInt,
  artistAddress: Address,
  pricePerTokenInWei: BigInt
): void {
  return mockProjectTokenInfoCall(
    projectId,
    artistAddress,
    pricePerTokenInWei,
    null,
    null,
    false,
    null,
    null,
    null,
    null
  );
}

export function mockProjectTokenInfoCall(
  projectId: BigInt,
  artistAddress: Address,
  pricePerTokenInWei: BigInt,
  invocations: BigInt | null,
  maxInvocations: BigInt | null,
  active: boolean,
  additionalPayeeAddress: Address | null,
  additionalPayeePercentage: BigInt | null,
  currencySymbol: string | null,
  currencyAddress: Address | null
): void {
  let projectTokenInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(artistAddress), // artistAddress
    ethereum.Value.fromUnsignedBigInt(pricePerTokenInWei), // pricePerTokenInWei
    ethereum.Value.fromUnsignedBigInt(
      invocations ? invocations : DEFAULT_PROJECT_VALUES.invocations
    ), // invocations
    ethereum.Value.fromUnsignedBigInt(
      maxInvocations ? maxInvocations : DEFAULT_PROJECT_VALUES.maxInvocations
    ), // maxInvocations
    ethereum.Value.fromBoolean(active), // active
    ethereum.Value.fromAddress(
      additionalPayeeAddress
        ? additionalPayeeAddress
        : DEFAULT_PROJECT_VALUES.additionalPayeeAddress
    ), // additionalPayee
    ethereum.Value.fromUnsignedBigInt(
      additionalPayeePercentage
        ? additionalPayeePercentage
        : DEFAULT_PROJECT_VALUES.additionalPayeePercentage
    ), // additionalPayeePercentage
    ethereum.Value.fromString(
      currencySymbol ? currencySymbol : DEFAULT_PROJECT_VALUES.currencySymbol
    ), // currencySymbol
    ethereum.Value.fromAddress(
      currencyAddress ? currencyAddress : DEFAULT_PROJECT_VALUES.currencyAddress
    ) // currencyAddress
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectTokenInfo",
    "projectTokenInfo(uint256):(address,uint256,uint256,uint256,bool,address,uint256,string,address)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectTokenInfoReturnArray);
}

export function mockTokenURICall(tokenId: BigInt, tokenURI: string): void {
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "tokenURI",
    "tokenURI(uint256):(string)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
    .returns([ethereum.Value.fromString(tokenURI)]);
}

export function mockProjectScriptInfoCall(
  projectId: BigInt,
  overrides: Map<string, string> | null
): void {
  let projectScriptInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(
      overrides && overrides.has("scriptJSON")
        ? changetype<Map<String, string>>(overrides).get("scriptJSON")
        : DEFAULT_PROJECT_VALUES.scriptJSON
    ), // scriptJSON
    ethereum.Value.fromUnsignedBigInt(
      overrides && overrides.has("scriptCount")
        ? BigInt.fromString(
            changetype<Map<String, string>>(overrides).get("scriptCount")
          )
        : DEFAULT_PROJECT_VALUES.scriptCount
    ), // scriptCount
    ethereum.Value.fromString(
      overrides && overrides.has("ipfsHash")
        ? changetype<Map<String, string>>(overrides).get("ipfsHash")
        : DEFAULT_PROJECT_VALUES.ipfsHash
    ), // IPFSHash
    ethereum.Value.fromBoolean(
      overrides && overrides.has("locked")
        ? changetype<Map<String, string>>(overrides).get("locked") === "true"
        : DEFAULT_PROJECT_VALUES.locked
    ), // locked
    ethereum.Value.fromBoolean(
      overrides && overrides.has("paused")
        ? changetype<Map<String, string>>(overrides).get("paused") === "true"
        : DEFAULT_PROJECT_VALUES.paused
    ) // paused
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectScriptInfo",
    "projectScriptInfo(uint256):(string,uint256,string,bool,bool)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectScriptInfoReturnArray);
}
