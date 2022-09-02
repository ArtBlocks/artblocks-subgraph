import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  createMockedFunction,
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
  TEST_CONTRACT,
  TEST_MINTER_FILTER_ADDRESS
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
    "coreType",
    "coreType():(string)"
  ).returns([ethereum.Value.fromString("GenArt721CoreV3")]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksPrimarySalesAddress",
    "artblocksPrimarySalesAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.renderProviderAddress)]);

  // Note: not used in V3 sync, but good to add backwards-compatible mock here
  //for the backwards-compatible V3 external function
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksAddress",
    "artblocksAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.renderProviderAddress)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksPrimarySalesPercentage",
    "artblocksPrimarySalesPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(TEST_CONTRACT.renderProviderPercentage)
  ]);

  // Note: not used in V3 sync, but good to add backwards-compatible mock here
  //for the backwards-compatible V3 external function
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksPercentage",
    "artblocksPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(TEST_CONTRACT.renderProviderPercentage)
  ]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksSecondarySalesAddress",
    "artblocksSecondarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(
      TEST_CONTRACT.renderProviderSecondarySalesAddress
    )
  ]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksSecondarySalesBPS",
    "artblocksSecondarySalesBPS():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(
      TEST_CONTRACT.renderProviderSecondarySalesBPS
    )
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

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "minterContract",
    "minterContract():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.minterContract)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "newProjectsForbidden",
    "newProjectsForbidden():(bool)"
  ).returns([ethereum.Value.fromBoolean(TEST_CONTRACT.newProjectsForbidden)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksCurationRegistryAddress",
    "artblocksCurationRegistryAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.curationRegistry)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksDependencyRegistryAddress",
    "artblocksDependencyRegistryAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.dependencyRegistry)]);
}

// mocks return values for Soldity contract calls in handleMinterUpdated() function
export function mockMinterUpdatedCallsNoPreconfiguredProjects(
  startingProjectId: BigInt
): void {
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "startingProjectId",
    "startingProjectId():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(startingProjectId)]);

  createMockedFunction(
    TEST_MINTER_FILTER_ADDRESS,
    "genArt721CoreAddress",
    "genArt721CoreAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)]);

  createMockedFunction(
    TEST_MINTER_FILTER_ADDRESS,
    "getNumProjectsWithMinters",
    "getNumProjectsWithMinters():(uint256)"
  ).returns([ethereum.Value.fromI32(0)]);
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
    ), // license
    ethereum.Value.fromBoolean(true) // dynamic
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string,bool)"
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
    ethereum.Value.fromBoolean(
      overrides && overrides.has("useHashString")
        ? changetype<Map<String, string>>(overrides).get("useHashString") ===
            "true"
        : DEFAULT_PROJECT_VALUES.useHashString
    ), // useHashString
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
    "projectScriptInfo(uint256):(string,uint256,bool,string,bool,bool)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectScriptInfoReturnArray);
}

export function mockMintersCoreContract(
  minterAddress: Address,
  coreContract: Address
): void {
  createMockedFunction(
    minterAddress,
    "genArt721CoreAddress",
    "genArt721CoreAddress():(address)"
  ).returns([ethereum.Value.fromAddress(coreContract)]);
}

export function mockMintersMinterFilterAddress(
  minterAddress: Address,
  minterFilterAddress: Address
): void {
  createMockedFunction(
    minterAddress,
    "minterFilterAddress",
    "minterFilterAddress():(address)"
  ).returns([ethereum.Value.fromAddress(minterFilterAddress)]);
}

export function mockMintersMinterType(
  minterAddress: Address,
  minterType: string
): void {
  createMockedFunction(
    minterAddress,
    "minterType",
    "minterType():(string)"
  ).returns([ethereum.Value.fromString(minterType)]);
}
