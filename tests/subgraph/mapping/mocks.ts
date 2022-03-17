import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  createMockedFunction,
  log,
  newMockCall
} from "matchstick-as/assembly/index";
import { AddProjectCall } from "../../../generated/GenArt721Core/GenArt721Core";
import { handleAddProject } from "../../../src/mapping";
import {
  CURRENT_BLOCK_TIMESTAMP,
  RANDOMIZER_ADDRESS,
  ContractValues,
  DEFAULT_PROJECT_VALUES
} from "../shared-mocks";

export const TEST_CONTRACT_ADDRESS = Address.fromString(
  "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
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
  projectName: string,
  artistAddress: Address,
  pricePerTokenInWei: BigInt,
  mockCallsWithDefaults: boolean,
  timestamp: BigInt | null
): void {
  if (mockCallsWithDefaults) {
    mockProjectDetailsCallWithDefaults(
      TEST_CONTRACT.nextProjectId,
      projectName
    );
    mockProjectTokenInfoCallWithDefaults(
      TEST_CONTRACT.nextProjectId,
      artistAddress,
      pricePerTokenInWei
    );
    mockProjectScriptInfoCallWithDefaults(TEST_CONTRACT.nextProjectId);
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
export function mockRefreshContractCalls(nextProjectId: BigInt): void {
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
    ethereum.Value.fromSignedBigInt(TEST_CONTRACT.renderProviderPercentage)
  ]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "nextProjectId",
    "nextProjectId():(uint256)"
  ).returns([ethereum.Value.fromSignedBigInt(nextProjectId)]);

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
    ), // license
    ethereum.Value.fromBoolean(true) // dynamic
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string,bool)"
  )
    .withArgs([ethereum.Value.fromSignedBigInt(projectId)])
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
    ethereum.Value.fromSignedBigInt(pricePerTokenInWei), // pricePerTokenInWei
    ethereum.Value.fromSignedBigInt(
      invocations ? invocations : DEFAULT_PROJECT_VALUES.invocations
    ), // invocations
    ethereum.Value.fromSignedBigInt(
      maxInvocations ? maxInvocations : DEFAULT_PROJECT_VALUES.maxInvocations
    ), // maxInvocations
    ethereum.Value.fromBoolean(active), // active
    ethereum.Value.fromAddress(
      additionalPayeeAddress
        ? additionalPayeeAddress
        : DEFAULT_PROJECT_VALUES.additionalPayeeAddress
    ), // additionalPayee
    ethereum.Value.fromSignedBigInt(
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
    .withArgs([ethereum.Value.fromSignedBigInt(projectId)])
    .returns(projectTokenInfoReturnArray);
}

export function mockProjectScriptInfoCallWithDefaults(projectId: BigInt): void {
  return mockProjectScriptInfoCall(
    projectId,
    null,
    null,
    DEFAULT_PROJECT_VALUES.useHashString,
    null,
    DEFAULT_PROJECT_VALUES.locked,
    DEFAULT_PROJECT_VALUES.paused
  );
}

export function mockProjectScriptInfoCall(
  projectId: BigInt,
  scriptJSON: string | null,
  scriptCount: BigInt | null,
  useHashString: boolean,
  ipfsHash: string | null,
  locked: boolean,
  paused: boolean
): void {
  let projectScriptInfoReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(
      scriptJSON ? scriptJSON : DEFAULT_PROJECT_VALUES.scriptJSON
    ), // scriptJSON
    ethereum.Value.fromSignedBigInt(
      scriptCount ? scriptCount : DEFAULT_PROJECT_VALUES.scriptCount
    ), // scriptCount
    ethereum.Value.fromBoolean(useHashString), // useHashString
    ethereum.Value.fromString(
      ipfsHash ? ipfsHash : DEFAULT_PROJECT_VALUES.ipfsHash
    ), // IPFSHash
    ethereum.Value.fromBoolean(locked), // locked
    ethereum.Value.fromBoolean(paused) // paused
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectScriptInfo",
    "projectScriptInfo(uint256):(string,uint256,bool,string,bool,bool)"
  )
    .withArgs([ethereum.Value.fromSignedBigInt(projectId)])
    .returns(projectScriptInfoReturnArray);
}
