import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  createMockedFunction,
  newMockCall
} from "matchstick-as/assembly/index";
import { AddProjectCall } from "../../../generated/GenArt721Core2PBAB/GenArt721Core2PBAB";
import { Contract } from "../../../generated/schema";
import { generateContractSpecificId } from "../../../src/helpers";
import { handleAddProject } from "../../../src/pbab-mapping";
import {
  CURRENT_BLOCK_TIMESTAMP,
  RANDOMIZER_ADDRESS,
  ContractValues,
  DEFAULT_PROJECT_VALUES,
  PROJECT_ENTITY_TYPE,
  booleanToString,
  CONTRACT_ENTITY_TYPE
} from "../shared-mocks";

export const TEST_CONTRACT_ADDRESS = Address.fromString(
  "0x28f2D3805652FB5d359486dFfb7D08320D403240"
);

export const TEST_CONTRACT: ContractValues = {
  admin: Address.fromString("0x96dc73c8b5969608c77375f085949744b5177660"),
  renderProviderPercentage: BigInt.fromI32(10),
  renderProviderAddress: Address.fromString(
    "0xf7a55108a6e830a809e88e74cbf5f5de9d930153"
  ),
  mintWhitelisted: [],
  randomizerContract: RANDOMIZER_ADDRESS
};

export const TEST_CONTRACT_CREATED_AT = BigInt.fromI32(1607763598);

// helper mock function to initialize a Project entity in local in-memory store
export function addNewProjectToStore(
  projectId: BigInt,
  projectName: string,
  artistAddress: Address,
  pricePerTokenInWei: BigInt,
  mockCallsWithDefaults: boolean,
  timestamp: BigInt | null
): void {
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

export function assertTestContractFields(
  createdAt: BigInt,
  updatedAt: BigInt,
  nextProjectId: BigInt
): void {
  // Contract setup in refreshContracts
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "admin",
    TEST_CONTRACT.admin.toHexString()
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    TEST_CONTRACT.renderProviderAddress.toHexString()
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "createdAt",
    createdAt.toString()
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "updatedAt",
    updatedAt.toString()
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "nextProjectId",
    nextProjectId.toString()
  );
}

export function assertNewProjectFields(
  contractAddress: Address,
  projectId: BigInt,
  projectName: string,
  artistAddress: Address,
  pricePerTokenInWei: BigInt,
  currentBlockTimestamp: BigInt
): void {
  const fullProjectId = generateContractSpecificId(contractAddress, projectId);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "active",
    booleanToString(DEFAULT_PROJECT_VALUES.active)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "artist",
    artistAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "artistAddress",
    artistAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "complete",
    booleanToString(DEFAULT_PROJECT_VALUES.complete)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "contract",
    TEST_CONTRACT_ADDRESS.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "createdAt",
    currentBlockTimestamp.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "currencySymbol",
    DEFAULT_PROJECT_VALUES.currencySymbol.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "dynamic",
    booleanToString(DEFAULT_PROJECT_VALUES.dynamic)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "invocations",
    DEFAULT_PROJECT_VALUES.invocations.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "locked",
    booleanToString(DEFAULT_PROJECT_VALUES.locked)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "maxInvocations",
    DEFAULT_PROJECT_VALUES.maxInvocations.toString()
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "name", projectName);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "pricePerTokenInWei",
    pricePerTokenInWei.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "projectId",
    projectId.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "scriptCount",
    DEFAULT_PROJECT_VALUES.scriptCount.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    currentBlockTimestamp.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "useHashString",
    booleanToString(DEFAULT_PROJECT_VALUES.useHashString)
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "useIpfs", "false");
}

export function addTestContractToStore(nextProjectId: BigInt): Contract {
  let contract = new Contract(TEST_CONTRACT_ADDRESS.toHexString());
  contract.admin = TEST_CONTRACT.admin;
  contract.createdAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  contract.nextProjectId = nextProjectId;
  contract.randomizerContract = TEST_CONTRACT.randomizerContract;
  contract.renderProviderAddress = TEST_CONTRACT.renderProviderAddress;
  contract.renderProviderPercentage = TEST_CONTRACT.renderProviderPercentage;
  contract.updatedAt = contract.createdAt;
  contract.save();

  return contract;
}
