import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  createMockedFunction,
  log,
  newMockCall
} from "matchstick-as/assembly/index";

// use legacy V1 call handler as helper to easily add projects to the store
// TODO - this can be updated once V3 event handler for addProject is implemented
import { AddProjectCall } from "../../../generated/GenArt721Core/GenArt721Core";
import { handleAddProject } from "../../../src/mapping-v1-core";

// schema imports
import { Project } from "../../../generated/schema";

// helper src imports
import { generateContractSpecificId } from "../../../src/helpers";

// shared exports across all tests
import {
  CURRENT_BLOCK_TIMESTAMP,
  DEFAULT_PROJECT_VALUES,
  TEST_CONTRACT_ADDRESS,
  TEST_CONTRACT
} from "../shared-helpers";

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
    "artblocksAddress",
    "artblocksAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.renderProviderAddress)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksPercentage",
    "artblocksPercentage():(uint256)"
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

export function mockTokenURICall(tokenId: BigInt, tokenURI: string): void {
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "tokenURI",
    "tokenURI(uint256):(string)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
    .returns([ethereum.Value.fromString(tokenURI)]);
}

export function mockProjectDetailsCall(
  projectId: BigInt,
  projectName: string,
  overrides: Map<string, string> | null
): void {
  let projectDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(projectName),
    ethereum.Value.fromString(
      overrides && overrides.has("artistName")
        ? changetype<Map<string, string>>(overrides).get("artistName")
        : DEFAULT_PROJECT_VALUES.artistName
    ), // artistName
    ethereum.Value.fromString(
      overrides && overrides.has("description")
        ? changetype<Map<string, string>>(overrides).get("description")
        : DEFAULT_PROJECT_VALUES.description
    ), // description
    ethereum.Value.fromString(
      overrides && overrides.has("website")
        ? changetype<Map<string, string>>(overrides).get("website")
        : DEFAULT_PROJECT_VALUES.website
    ), // website
    ethereum.Value.fromString(
      overrides && overrides.has("license")
        ? changetype<Map<string, string>>(overrides).get("license")
        : DEFAULT_PROJECT_VALUES.license
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

export function mockProjectScriptDetailsCall(
  projectId: BigInt,
  overrides: Map<string, string> | null
): void {
  let projectScriptDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(
      overrides && overrides.has("scriptTypeAndVersion")
        ? changetype<Map<string, string>>(overrides).get("scriptTypeAndVersion")
        : DEFAULT_PROJECT_VALUES.scriptTypeAndVersion
    ), // scriptTypeAndVersion
    ethereum.Value.fromString(
      overrides && overrides.has("aspectRatio")
        ? changetype<Map<string, string>>(overrides).get("aspectRatio")
        : DEFAULT_PROJECT_VALUES.aspectRatio
    ), // aspectRatio
    ethereum.Value.fromString(
      overrides && overrides.has("ipfsHash")
        ? changetype<Map<string, string>>(overrides).get("ipfsHash")
        : DEFAULT_PROJECT_VALUES.ipfsHash
    ), // ipfsHash
    ethereum.Value.fromUnsignedBigInt(
      overrides && overrides.has("scriptCount")
        ? BigInt.fromString(
            changetype<Map<string, string>>(overrides).get("scriptCount")
          )
        : DEFAULT_PROJECT_VALUES.scriptCount
    ) // scriptCount
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectScriptDetails",
    "projectScriptDetails(uint256):(string,string,string,uint256)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectScriptDetailsReturnArray);
}

export function mockProjectStateDataCall(
  projectId: BigInt,
  overrides: Map<string, string> | null
): void {
  let projectStateDataReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromUnsignedBigInt(
      overrides && overrides.has("invocations")
        ? BigInt.fromString(
            changetype<Map<string, string>>(overrides).get("invocations")
          )
        : DEFAULT_PROJECT_VALUES.invocations
    ), // invocations
    ethereum.Value.fromUnsignedBigInt(
      overrides && overrides.has("maxInvocations")
        ? BigInt.fromString(
            changetype<Map<string, string>>(overrides).get("maxInvocations")
          )
        : DEFAULT_PROJECT_VALUES.maxInvocations
    ), // maxInvocations
    ethereum.Value.fromBoolean(
      overrides && overrides.has("active")
        ? changetype<Map<string, string>>(overrides).get("active") == "true"
        : DEFAULT_PROJECT_VALUES.active
    ), // active
    ethereum.Value.fromBoolean(
      overrides && overrides.has("paused")
        ? changetype<Map<string, string>>(overrides).get("paused") == "true"
        : DEFAULT_PROJECT_VALUES.paused
    ), // paused
    ethereum.Value.fromBoolean(
      overrides && overrides.has("locked")
        ? changetype<Map<string, string>>(overrides).get("locked") == "true"
        : DEFAULT_PROJECT_VALUES.paused
    ) // locked
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectStateData",
    "projectStateData(uint256):(uint256,uint256,bool,bool,bool)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectStateDataReturnArray);
}
