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
import { BigInt, Bytes, ethereum, store, Value } from "@graphprotocol/graph-ts";
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
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  addNewTokenToStore,
  addNewContractToStore,
  TRANSFER_ENTITY_TYPE,
  DEFAULT_COLLECTION
} from "../shared-helpers";

import { mockRefreshContractCalls, addNewProjectToStore } from "./helpers";

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
import {
  Mint,
  Transfer,
  PlatformUpdated
} from "../../../generated/GenArt721CoreV3/GenArt721CoreV3";
import {
  handleMint,
  handleTransfer,
  handlePlatformUpdated
} from "../../../src/mapping-v3-core";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

test("GenArt721CoreV3: Can handle Mint", () => {
  clearStore();
  // add contract to store
  const projectId = BigInt.fromI32(1);
  const tokenId = BigInt.fromI32(1000001);
  addTestContractToStore(projectId);
  mockTokenIdToHash(TEST_CONTRACT_ADDRESS, tokenId, TEST_TOKEN_HASH);
  // add project to store
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const artistAddress = randomAddressGenerator.generateRandomAddress();
  const projectName = "Test Project";
  const pricePerTokenInWei = BigInt.fromI64(i64(1e18));

  addNewProjectToStore(
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
    true,
    CURRENT_BLOCK_TIMESTAMP
  );

  // handle mint
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

  const toAddress = randomAddressGenerator.generateRandomAddress();

  const event: Mint = changetype<Mint>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam("_to", ethereum.Value.fromAddress(toAddress)),
    new ethereum.EventParam(
      "_tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  ];

  handleMint(event);

  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    fullTokenId,
    "owner",
    toAddress.toHexString()
  );
});

test("GenArt721CoreV3: Can handle transfer", () => {
  clearStore();
  const tokenId = BigInt.fromI32(0);
  const projectId = BigInt.fromI32(0);
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

  addNewTokenToStore(TEST_CONTRACT_ADDRESS, tokenId, projectId);

  const fromAddress = randomAddressGenerator.generateRandomAddress();
  const toAddress = randomAddressGenerator.generateRandomAddress();

  const logIndex = BigInt.fromI32(0);
  const event: Transfer = changetype<Transfer>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = logIndex;
  event.parameters = [
    new ethereum.EventParam("from", ethereum.Value.fromAddress(fromAddress)),
    new ethereum.EventParam("to", ethereum.Value.fromAddress(toAddress)),
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  ];

  handleTransfer(event);

  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    fullTokenId,
    "owner",
    toAddress.toHexString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    TEST_TX_HASH.toHex() + "-" + logIndex.toString(),
    "to",
    toAddress.toHexString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    TEST_TX_HASH.toHex() + "-" + logIndex.toString(),
    "from",
    fromAddress.toHexString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    TEST_TX_HASH.toHex() + "-" + logIndex.toString(),
    "token",
    fullTokenId
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::nextProjectId", () => {
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < 2; i++) {
    clearStore();
    // add new contract to store
    const projectId = BigInt.fromI32(i);
    addTestContractToStore(projectId);
    mockRefreshContractCalls(BigInt.fromI32(i), null);

    const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = BigInt.fromI32(0);
    event.parameters = [
      new ethereum.EventParam(
        "_field",
        ethereum.Value.fromBytes(Bytes.fromUTF8("nextProjectId"))
      )
    ];
    // handle event
    handlePlatformUpdated(event);
    // assertions
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "nextProjectId",
      i.toString()
    );
  }
});

test("GenArt721CoreV3: Handles PlatformUpdated::newProjectsForbidden - default value", () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "newProjectsForbidden",
    false.toString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::newProjectsForbidden - changed value", () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // update mock function return value to true
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "newProjectsForbidden",
    "newProjectsForbidden():(bool)"
  ).returns([ethereum.Value.fromBoolean(true)]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("newProjectsForbidden"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should be updated to true
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "newProjectsForbidden",
    true.toString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::nextProjectId", () => {
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < 2; i++) {
    clearStore();
    // add new contract to store
    const projectId = BigInt.fromI32(i);
    addTestContractToStore(projectId);
    mockRefreshContractCalls(BigInt.fromI32(i), null);

    const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = BigInt.fromI32(0);
    event.parameters = [
      new ethereum.EventParam(
        "_field",
        ethereum.Value.fromBytes(Bytes.fromUTF8("nextProjectId"))
      )
    ];
    // handle event
    handlePlatformUpdated(event);
    // assertions
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "nextProjectId",
      i.toString()
    );
  }
});

test("GenArt721CoreV3: Handles PlatformUpdated::artblocksPrimarySalesAddress - default value", () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    TEST_CONTRACT.renderProviderAddress.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::artblocksPrimarySalesAddress - changed value", () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // update mock function return value
  const newAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksPrimarySalesAddress",
    "artblocksPrimarySalesAddress():(address)"
  ).returns([ethereum.Value.fromAddress(newAddress)]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("artblocksPrimarySalesAddress"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    newAddress.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::artblocksSecondarySalesAddress - default value", () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderSecondarySalesAddress",
    TEST_CONTRACT.renderProviderSecondarySalesAddress.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::artblocksSecondarySalesAddress - changed value", () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // update mock function return value
  const newAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksSecondarySalesAddress",
    "artblocksSecondarySalesAddress():(address)"
  ).returns([ethereum.Value.fromAddress(newAddress)]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("artblocksSecondarySalesAddress"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderSecondarySalesAddress",
    newAddress.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::randomizerAddress - default value", () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "randomizerContract",
    TEST_CONTRACT.randomizerContract.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::randomizerAddress - changed value", () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // update mock function return value
  const newAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "randomizerContract",
    "randomizerContract():(address)"
  ).returns([ethereum.Value.fromAddress(newAddress)]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("randomizerAddress"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "randomizerContract",
    newAddress.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::curationRegistryAddress - default value", () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "curationRegistry",
    TEST_CONTRACT.curationRegistry.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::curationRegistryAddress - changed value", () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // update mock function return value
  const newAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksCurationRegistryAddress",
    "artblocksCurationRegistryAddress():(address)"
  ).returns([ethereum.Value.fromAddress(newAddress)]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("curationRegistryAddress"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "curationRegistry",
    newAddress.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::dependencyRegistryAddress - default value", () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "dependencyRegistry",
    TEST_CONTRACT.dependencyRegistry.toHexString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::dependencyRegistryAddress - changed value", () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // update mock function return value
  const newAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksDependencyRegistryAddress",
    "artblocksDependencyRegistryAddress():(address)"
  ).returns([ethereum.Value.fromAddress(newAddress)]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("dependencyRegistryAddress"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "dependencyRegistry",
    newAddress.toHexString()
  );
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export { handleMint, handleTransfer, handlePlatformUpdated };
