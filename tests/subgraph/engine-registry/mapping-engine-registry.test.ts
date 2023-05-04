import {
  assert,
  clearStore,
  test,
  newMockEvent,
  describe,
  beforeEach,
  createMockedFunction
} from "matchstick-as/assembly/index";
import {
  BigInt,
  Bytes,
  ethereum,
  store,
  Address
} from "@graphprotocol/graph-ts";
import {
  ACCOUNT_ENTITY_TYPE,
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  PROJECT_SCRIPT_ENTITY_TYPE,
  TOKEN_ENTITY_TYPE,
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
  mockProjectScriptByIndex,
  mockTokenIdToHash,
  mockCoreType,
  TEST_CONTRACT_ADDRESS,
  TEST_TOKEN_HASH,
  TEST_TX_HASH,
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  addArbitraryContractToStore,
  addNewProjectToStore,
  addNewTokenToStore,
  TRANSFER_ENTITY_TYPE,
  ONE_MILLION,
  booleanToString,
  TEST_CONTRACT,
  TEST_SUPER_ADMIN_ADDRESS,
  RANDOMIZER_ADDRESS,
  WHITELISTING_ENTITY_TYPE
} from "../shared-helpers";
import { mockRefreshContractCalls } from "../mapping-v3-core/helpers";
import { Contract, CoreRegistry } from "../../../generated/schema";
import {
  ContractRegistered,
  ContractUnregistered
} from "../../../generated/EngineRegistryV0/IEngineRegistryV0";
import {
  handleContractRegistered,
  handleContractUnregistered
} from "../../../src/core-registry";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();
const contractRegistryAddress = randomAddressGenerator.generateRandomAddress();
const coreType = "GenArt721CoreV3_Engine";
const defaultLogIndex = BigInt.fromI32(0);
const defaultNextProjectId = BigInt.fromI32(0);

describe("ContractRegistered event", () => {
  test("adds new contract to store if not already in store", () => {
    clearStore();
    mockRefreshContractCalls(defaultNextProjectId, coreType, null);
    const event: ContractRegistered = changetype<ContractRegistered>(
      newMockEvent()
    );
    event.address = contractRegistryAddress;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = defaultLogIndex;
    event.parameters = [
      new ethereum.EventParam(
        "_contractAddress",
        ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
      ),
      new ethereum.EventParam(
        "_coreVersion",
        ethereum.Value.fromBytes(Bytes.fromUTF8("v3.1.1"))
      ),
      new ethereum.EventParam(
        "_coreType",
        ethereum.Value.fromBytes(Bytes.fromUTF8(coreType))
      )
    ];

    // ensure contract not currently in store
    assert.notInStore(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString()
    );

    // handle event
    handleContractRegistered(event);

    // Check that the contract was created and spot check fields
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "id",
      TEST_CONTRACT_ADDRESS.toHexString()
    );
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "enginePlatformProviderAddress",
      TEST_CONTRACT.enginePlatformProviderAddress.toHexString()
    );
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "randomizerContract",
      RANDOMIZER_ADDRESS.toHexString()
    );

    // ensure engine registry is populated in Contract's `registeredOn` field
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "registeredOn",
      contractRegistryAddress.toHexString()
    );

    // @dev no way to determine if contract was added as template source
    // at this time
  });

  test("handles registering contract already in store", () => {
    clearStore();
    // specifically add test contract to store
    addTestContractToStore(defaultNextProjectId);
    mockRefreshContractCalls(defaultNextProjectId, coreType, null);
    const event: ContractRegistered = changetype<ContractRegistered>(
      newMockEvent()
    );
    event.address = contractRegistryAddress;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = defaultLogIndex;
    event.parameters = [
      new ethereum.EventParam(
        "_contractAddress",
        ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
      ),
      new ethereum.EventParam(
        "_coreVersion",
        ethereum.Value.fromBytes(Bytes.fromUTF8("v3.1.1"))
      ),
      new ethereum.EventParam(
        "_coreType",
        ethereum.Value.fromBytes(Bytes.fromUTF8(coreType))
      )
    ];

    // ensure contract is already in store
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "id",
      TEST_CONTRACT_ADDRESS.toHexString()
    );

    // handle event
    handleContractRegistered(event);

    // Check that the contract still exists and spot check fields
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "id",
      TEST_CONTRACT_ADDRESS.toHexString()
    );
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "randomizerContract",
      RANDOMIZER_ADDRESS.toHexString()
    );

    // ensure engine registry is populated in Contract's `registeredOn` field
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "registeredOn",
      contractRegistryAddress.toHexString()
    );
  });
});

describe("ContractUnregistered event", () => {
  test("handles unregistering contract not already in store", () => {
    clearStore();
    mockRefreshContractCalls(defaultNextProjectId, coreType, null);
    const event: ContractUnregistered = changetype<ContractUnregistered>(
      newMockEvent()
    );
    event.address = contractRegistryAddress;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = defaultLogIndex;
    event.parameters = [
      new ethereum.EventParam(
        "_contractAddress",
        ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
      )
    ];

    // ensure contract not currently in store
    assert.notInStore(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString()
    );

    // handle event
    handleContractUnregistered(event);

    // Check that the contract was not created
    assert.notInStore(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString()
    );
  });

  test("handles registering contract already in store", () => {
    clearStore();
    // specifically add test contract to store
    addTestContractToStore(defaultNextProjectId);
    mockRefreshContractCalls(defaultNextProjectId, coreType, null);
    const contractRegistryAddress = randomAddressGenerator.generateRandomAddress();
    const event: ContractUnregistered = changetype<ContractUnregistered>(
      newMockEvent()
    );
    event.address = contractRegistryAddress;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = defaultLogIndex;
    event.parameters = [
      new ethereum.EventParam(
        "_contractAddress",
        ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
      )
    ];

    // ensure contract is already in store
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "id",
      TEST_CONTRACT_ADDRESS.toHexString()
    );

    // handle event
    handleContractUnregistered(event);

    // Check that the contract still exists in store
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "id",
      TEST_CONTRACT_ADDRESS.toHexString()
    );

    // ensure contract `registeredOn` field is null
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "registeredOn",
      "null"
    );
  });
});

describe("Registered/Unregistered Sequence(s)", () => {
  test("handles adding two contracts, removing index zero", () => {
    clearStore();
    mockRefreshContractCalls(defaultNextProjectId, coreType, null);
    const event: ContractRegistered = changetype<ContractRegistered>(
      newMockEvent()
    );
    event.address = contractRegistryAddress;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = defaultLogIndex;
    event.parameters = [
      new ethereum.EventParam(
        "_contractAddress",
        ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
      ),
      new ethereum.EventParam(
        "_coreVersion",
        ethereum.Value.fromBytes(Bytes.fromUTF8("v3.1.1"))
      ),
      new ethereum.EventParam(
        "_coreType",
        ethereum.Value.fromBytes(Bytes.fromUTF8(coreType))
      )
    ];

    // handle event
    handleContractRegistered(event);

    // register second contract
    const engineContractAddress2 = randomAddressGenerator.generateRandomAddress();
    addArbitraryContractToStore(engineContractAddress2, defaultNextProjectId);
    event.parameters = [
      new ethereum.EventParam(
        "_contractAddress",
        ethereum.Value.fromAddress(engineContractAddress2)
      ),
      new ethereum.EventParam(
        "_coreVersion",
        ethereum.Value.fromBytes(Bytes.fromUTF8("v3.1.1"))
      ),
      new ethereum.EventParam(
        "_coreType",
        ethereum.Value.fromBytes(Bytes.fromUTF8(coreType))
      )
    ];

    // handle event for second contract
    handleContractRegistered(event);

    // ensure registeredOn is updated for both contracts
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "registeredOn",
      contractRegistryAddress.toHexString()
    );
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      engineContractAddress2.toHexString(),
      "registeredOn",
      contractRegistryAddress.toHexString()
    );

    // remove first contract
    const event2: ContractUnregistered = changetype<ContractUnregistered>(
      newMockEvent()
    );
    event2.address = contractRegistryAddress;
    event2.transaction.hash = TEST_TX_HASH;
    event2.logIndex = defaultLogIndex;
    event2.parameters = [
      new ethereum.EventParam(
        "_contractAddress",
        ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
      )
    ];

    // handle event
    handleContractUnregistered(event2);

    // ensure registeredOn is updated for first contract
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "registeredOn",
      "null"
    );
    // ensure registeredOn is not updated for second contract
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      engineContractAddress2.toHexString(),
      "registeredOn",
      contractRegistryAddress.toHexString()
    );
  });
});
