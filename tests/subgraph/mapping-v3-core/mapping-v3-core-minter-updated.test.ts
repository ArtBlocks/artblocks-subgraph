import {
  assert,
  clearStore,
  test,
  newMockCall,
  log,
  logStore,
  createMockedFunction,
  newMockEvent
} from "matchstick-as/assembly/index";
import {
  BigInt,
  Bytes,
  ethereum,
  store,
  Value,
  Address
} from "@graphprotocol/graph-ts";
import {
  ACCOUNT_ENTITY_TYPE,
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  WHITELISTING_ENTITY_TYPE,
  PROJECT_SCRIPT_ENTITY_TYPE,
  TOKEN_ENTITY_TYPE,
  DEFAULT_PROJECT_VALUES,
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
  mockProjectScriptByIndex,
  mockTokenIdToHash,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  TEST_CONTRACT_ADDRESS,
  TEST_CONTRACT_CREATED_AT,
  TEST_CONTRACT,
  TEST_TOKEN_HASH,
  TEST_TX_HASH,
  TEST_MINTER_FILTER_ADDRESS,
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  addNewTokenToStore,
  addNewContractToStore,
  TRANSFER_ENTITY_TYPE,
  DEFAULT_COLLECTION,
  MINTER_FILTER_ENTITY_TYPE
} from "../shared-helpers";

import {
  mockRefreshContractCalls,
  mockMinterUpdatedCallsNoPreconfiguredProjects,
  addNewProjectToStore
} from "./helpers";

import {
  Account,
  Contract,
  MinterFilter,
  Project,
  ProjectMinterConfiguration,
  ProjectScript,
  Token,
  Whitelisting
} from "../../../generated/schema";
import { MinterUpdated } from "../../../generated/GenArt721CoreV3/GenArt721CoreV3";
import { handleMinterUpdated } from "../../../src/mapping-v3-core";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

test("GenArt721CoreV3/MinterUpdated: should handle setting minter to zero address", () => {
  clearStore();
  const startingProjectId = BigInt.fromI32(100);
  mockRefreshContractCalls(startingProjectId, null);
  mockMinterUpdatedCallsNoPreconfiguredProjects(startingProjectId);

  const event: MinterUpdated = changetype<MinterUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_currentMinter",
      ethereum.Value.fromAddress(Address.zero())
    )
  ];
  // handle event
  handleMinterUpdated(event);
  // assertions
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "minterFilter",
    "null"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "mintWhitelisted",
    "[]"
  );
  assert.notInStore(MINTER_FILTER_ENTITY_TYPE, Address.zero().toHexString());
  assert.entityCount(MINTER_FILTER_ENTITY_TYPE, 0);
});

test("GenArt721CoreV3/MinterUpdated: should create Contract and/or MinterFilter entities when not yet created, associate them", () => {
  clearStore();
  const startingProjectId = BigInt.fromI32(100);
  mockRefreshContractCalls(startingProjectId, null);
  mockMinterUpdatedCallsNoPreconfiguredProjects(startingProjectId);
  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );

  const event: MinterUpdated = changetype<MinterUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_currentMinter",
      ethereum.Value.fromAddress(TEST_MINTER_FILTER_ADDRESS)
    )
  ];
  event.block.timestamp = updateCallBlockTimestamp;
  // handle event
  handleMinterUpdated(event);
  // assertions
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "minterFilter",
    TEST_MINTER_FILTER_ADDRESS.toHexString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "mintWhitelisted",
    "[".concat(TEST_MINTER_FILTER_ADDRESS.toHexString()).concat("]")
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    TEST_MINTER_FILTER_ADDRESS.toHexString(),
    "coreContract",
    TEST_CONTRACT_ADDRESS.toHexString()
  );
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    TEST_MINTER_FILTER_ADDRESS.toHexString(),
    "minterAllowlist",
    "[]"
  );
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export { handleMinterUpdated };
