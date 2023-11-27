import {
  assert,
  clearStore,
  test,
  newMockEvent,
  describe,
  dataSourceMock,
  logStore
} from "matchstick-as/assembly/index";
import {
  BigInt,
  Bytes,
  ethereum,
  Address,
  DataSourceContext,
  Value
} from "@graphprotocol/graph-ts";
import {
  CONTRACT_ENTITY_TYPE,
  RandomAddressGenerator,
  TEST_CONTRACT_ADDRESS,
  TEST_TX_HASH,
  addTestContractToStore,
  addArbitraryContractToStore,
  TEST_CONTRACT,
  RANDOMIZER_ADDRESS
} from "../shared-helpers";
import { mockRefreshContractCalls } from "../mapping-v3-core/helpers";
import {
  ContractRegistered,
  ContractUnregistered
} from "../../../generated/CoreRegistry/ICoreRegistryV1";
import {
  handleContractRegistered,
  handleContractUnregistered
} from "../../../src/core-registry";
import {
  COMPROMISED_ENGINE_REGISTRY_ADDRESS_GOERLI,
  COMPROMISED_ENGINE_REGISTRY_ADDRESS_MAINNET,
  COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_GOERLI,
  COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_MAINNET
} from "../../../src/constants";

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
  test("does not add a new contract registered on compromised registry", () => {
    clearStore();
    let event: ContractRegistered = changetype<ContractRegistered>(
      newMockEvent()
    );

    event.address = changetype<Address>(
      Address.fromHexString(COMPROMISED_ENGINE_REGISTRY_ADDRESS_GOERLI)
    );
    event.transaction.hash = TEST_TX_HASH;
    event.block.number = COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_GOERLI;
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

    let context = new DataSourceContext();
    // context.set("contextVal", Value.fromI32(325));
    dataSourceMock.setReturnValues(
      COMPROMISED_ENGINE_REGISTRY_ADDRESS_GOERLI,
      "goerli",
      context
    );

    // ensure contract not currently in store
    assert.notInStore(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString()
    );

    // handle event
    handleContractRegistered(event);

    assert.notInStore(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString()
    );

    event = changetype<ContractRegistered>(newMockEvent());

    event.address = changetype<Address>(
      Address.fromHexString(COMPROMISED_ENGINE_REGISTRY_ADDRESS_MAINNET)
    );
    event.transaction.hash = TEST_TX_HASH;
    event.block.number = COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_MAINNET;
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

    context = new DataSourceContext();
    // context.set("contextVal", Value.fromI32(325));
    dataSourceMock.setReturnValues(
      COMPROMISED_ENGINE_REGISTRY_ADDRESS_MAINNET,
      "mainnet",
      context
    );

    handleContractRegistered(event);

    assert.notInStore(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString()
    );

    // @dev no way to determine if contract was added as template source
    // at this time
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
