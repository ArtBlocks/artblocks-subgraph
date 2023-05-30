import {
  assert,
  clearStore,
  test,
  newMockEvent,
  describe,
  beforeEach,
  createMockedFunction
} from "matchstick-as/assembly/index";

import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
  mockCoreType,
  TEST_CONTRACT_ADDRESS,
  addTestContractToStore,
  addNewProjectToStore,
  IPFS_CID,
  PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
  IPFS_CID2
} from "../shared-helpers";

import { Contract } from "../../../generated/schema";

import {
  ExternalAssetDependencyUpdated,
  ExternalAssetDependencyRemoved,
  GatewayUpdated,
  ProjectExternalAssetDependenciesLocked
} from "../../../generated/IGenArt721CoreV3_Engine_Flex/IGenArt721CoreContractV3_Engine_Flex";
import {
  handleExternalAssetDependencyUpdated,
  handleExternalAssetDependencyRemoved,
  handleGatewayUpdated,
  handleProjectExternalAssetDependenciesLocked
} from "../../../src/mapping-v3-core";
import { generateContractSpecificId } from "../../../src/helpers";
import { FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES } from "../../../src/constants";

const randomAddressGenerator = new RandomAddressGenerator();

const coreType = "GenArt721CoreV3_Engine_Flex";

describe("V3 Engine Flex Core", () => {
  beforeEach(() => {
    clearStore();
    const projectId = BigInt.fromI32(0);

    addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      projectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI64(i64(1e18)),
      CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(100))
    );
  });

  test(`${coreType} Can add/update a project external asset dependency`, () => {
    mockCoreType(TEST_CONTRACT_ADDRESS, `${coreType}`);
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );
    const initialAddEvent: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    initialAddEvent.address = TEST_CONTRACT_ADDRESS;
    initialAddEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _index0 = BigInt.zero();
    const _dependencyType0 = BigInt.zero();
    const _externalAssetDependencyCount0 = BigInt.fromI32(1);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      BigInt.fromI32(0).toString()
    );

    initialAddEvent.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index0)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType0)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
      )
    ];

    // add event
    handleExternalAssetDependencyUpdated(initialAddEvent);
    // checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount0.toString()
    );
    // checks project's updatedAt
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    // checks project external asset dependency cid
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index0.toString(),
      "cid",
      IPFS_CID
    );
    // checks project external asset dependency dependency type
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index0.toString(),
      "dependencyType",
      FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[_dependencyType0.toI32()]
    );
    // checks project external asset dependency project relationship
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index0.toString(),
      "project",
      fullProjectId
    );

    const updateEvent: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    updateEvent.address = TEST_CONTRACT_ADDRESS;
    const updatedTimestamp1 = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(200));
    updateEvent.block.timestamp = updatedTimestamp1;

    const _dependencyType1 = BigInt.fromI32(1);
    const _externalAssetDependencyCount1 = BigInt.fromI32(2);
    updateEvent.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index0)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID2)),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType1)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount1)
      )
    ];
    handleExternalAssetDependencyUpdated(updateEvent);

    // checks project's updatedAt
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "updatedAt",
      updatedTimestamp1.toString()
    );

    // checks project external asset dependency cid
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index0.toString(),
      "cid",
      IPFS_CID2
    );
    // checks project external asset dependency dependency type
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index0.toString(),
      "dependencyType",
      FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[_dependencyType1.toI32()]
    );

    // checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount1.toString()
    );

    const updateEvent2: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    updateEvent2.address = TEST_CONTRACT_ADDRESS;
    const updatedTimestamp2 = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(300));

    updateEvent2.block.timestamp = updatedTimestamp2;

    const _dependencyType2 = BigInt.fromI32(2);
    const _externalAssetDependencyCount2 = BigInt.fromI32(2);
    const _index2 = BigInt.fromI32(1);
    updateEvent2.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index2)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString("")),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType2)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount2)
      )
    ];

    const randomAddress = randomAddressGenerator.generateRandomAddress();
    const sampleData = "randomData";
    let tupleArray: Array<ethereum.Value> = [
      ethereum.Value.fromString(""),
      ethereum.Value.fromUnsignedBigInt(_dependencyType2),
      ethereum.Value.fromAddress(randomAddress),
      ethereum.Value.fromString(sampleData)
    ];
    let tuple: ethereum.Tuple = changetype<ethereum.Tuple>(tupleArray);
    createMockedFunction(
      TEST_CONTRACT_ADDRESS,
      "projectExternalAssetDependencyByIndex",
      "projectExternalAssetDependencyByIndex(uint256,uint256):((string,uint8,address,string))"
    )
      .withArgs([
        ethereum.Value.fromUnsignedBigInt(projectId),
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
      ])
      .returns([ethereum.Value.fromTuple(tuple)]);
    handleExternalAssetDependencyUpdated(updateEvent2);

    // checks project's updatedAt
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "updatedAt",
      updatedTimestamp2.toString()
    );

    // checks project external asset dependency cid
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index2.toString(),
      "cid",
      ""
    );
    // checks project external asset dependency dependency type
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index2.toString(),
      "dependencyType",
      FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[_dependencyType2.toI32()]
    );

    // checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount2.toString()
    );

    // checks project external asset dependency bytecode address (for onchain dependency)
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index2.toString(),
      "bytecodeAddress",
      randomAddress.toHexString()
    );

    // checks project external asset dependency data (for onchain dependency)
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index2.toString(),
      "data",
      sampleData
    );
  });

  test(`${coreType} Can remove a project external asset dependency`, () => {
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );
    const event: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _index0 = BigInt.zero();
    const _dependencyType0 = BigInt.zero();
    const _externalAssetDependencyCount0 = BigInt.fromI32(1);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      BigInt.fromI32(0).toString()
    );

    event.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index0)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType0)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
      )
    ];

    const event2: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    event2.address = TEST_CONTRACT_ADDRESS;
    event2.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _externalAssetDependencyCount1 = BigInt.fromI32(2);
    const _dependencyType1 = BigInt.fromI32(1);
    const _index1 = BigInt.fromI32(1);

    event2.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index1)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString("")),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType1)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount1)
      )
    ];

    // add events
    handleExternalAssetDependencyUpdated(event);
    handleExternalAssetDependencyUpdated(event2);

    //checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount1.toString()
    );

    assert.entityCount(PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE, 2);

    const removeEvent: ExternalAssetDependencyRemoved = changetype<
      ExternalAssetDependencyRemoved
    >(newMockEvent());
    removeEvent.address = TEST_CONTRACT_ADDRESS;
    removeEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    removeEvent.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
      )
    ];

    const randomAddress = randomAddressGenerator.generateRandomAddress();
    const sampleData = "randomData";
    let tupleArray: Array<ethereum.Value> = [
      ethereum.Value.fromString(""),
      ethereum.Value.fromUnsignedBigInt(_dependencyType1),
      ethereum.Value.fromAddress(randomAddress),
      ethereum.Value.fromString(sampleData)
    ];
    let tuple: ethereum.Tuple = changetype<ethereum.Tuple>(tupleArray);
    createMockedFunction(
      TEST_CONTRACT_ADDRESS,
      "projectExternalAssetDependencyByIndex",
      "projectExternalAssetDependencyByIndex(uint256,uint256):((string,uint8,address,string))"
    )
      .withArgs([
        ethereum.Value.fromUnsignedBigInt(projectId),
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
      ])
      .returns([ethereum.Value.fromTuple(tuple)]);

    handleExternalAssetDependencyRemoved(removeEvent);

    // // checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount0.toString()
    );

    // checks that removed project external asset dependency is not in store
    // note that regardless of what initial index is removed, the removed index gets moved to the last index
    assert.notInStore(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index1.toString()
    );

    // checks that asset at index 0 now has data that was formerly at index 1
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index0.toString(),
      "cid",
      ""
    );
    assert.fieldEquals(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectId + "-" + _index0.toString(),
      "dependencyType",
      FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[_dependencyType1.toI32()]
    );

    // checks that entity count is correct
    assert.entityCount(PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE, 1);
  });

  test(`${coreType} Can update a contract preferred IPFS/ARWEAVE gateway`, () => {
    const contract = addTestContractToStore(BigInt.zero());

    const event: GatewayUpdated = changetype<GatewayUpdated>(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _gateway = "https://ipfs.io/ipfs/";
    const _dependencyType = BigInt.fromI32(0);
    event.parameters = [
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType)
      ),
      new ethereum.EventParam("_gateway", ethereum.Value.fromString(_gateway))
    ];

    // add event
    handleGatewayUpdated(event);
    const loadedContractAfterEvent = Contract.load(contract.id);
    // checks contract preferredIPFSGateway
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "preferredIPFSGateway",
      _gateway.toString()
    );

    if (loadedContractAfterEvent) {
      // checks contract preferredArweaveGateway
      assert.assertNull(loadedContractAfterEvent.preferredArweaveGateway);
    }
  });

  test(`${coreType} Can lock a project's external asset dependencies`, () => {
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );

    const event: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _index0 = BigInt.zero();
    const _dependencyType0 = BigInt.zero();
    const _externalAssetDependencyCount0 = BigInt.fromI32(1);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      BigInt.fromI32(0).toString()
    );

    event.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index0)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType0)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
      )
    ];

    // add event
    handleExternalAssetDependencyUpdated(event);
    // checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount0.toString()
    );

    // checks project external asset dependency lock status
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependenciesLocked",
      "false"
    );

    const lockEvent: ProjectExternalAssetDependenciesLocked = changetype<
      ProjectExternalAssetDependenciesLocked
    >(newMockEvent());
    lockEvent.address = TEST_CONTRACT_ADDRESS;
    lockEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    lockEvent.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      )
    ];

    handleProjectExternalAssetDependenciesLocked(lockEvent);

    // checks project external asset dependency lock status
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependenciesLocked",
      "true"
    );
  });

  test(`${coreType} Cannot add a project external asset dependency for a non-existant project`, () => {
    const projectId = BigInt.fromI32(0);
    const projectIdNotInStore = BigInt.fromI32(1);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );

    const fullProjectIdNotInStore = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectIdNotInStore
    );

    const event: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _index0 = BigInt.zero();
    const _dependencyType0 = BigInt.zero();
    const _externalAssetDependencyCount0 = BigInt.fromI32(1);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      BigInt.fromI32(0).toString()
    );

    event.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectIdNotInStore)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index0)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType0)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
      )
    ];

    // add event
    handleExternalAssetDependencyUpdated(event);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      BigInt.fromI32(0).toString()
    );
    assert.notInStore(
      PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
      fullProjectIdNotInStore + "-0"
    );
  });

  test(`${coreType} Cannot remove a project external asset dependency for a non-existant project`, () => {
    // Add project to store
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );

    const event: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _index0 = BigInt.zero();
    const _dependencyType0 = BigInt.zero();
    const _externalAssetDependencyCount0 = BigInt.fromI32(1);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      BigInt.fromI32(0).toString()
    );

    event.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index0)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType0)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
      )
    ];

    const event2: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    event2.address = TEST_CONTRACT_ADDRESS;
    event2.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _externalAssetDependencyCount1 = BigInt.fromI32(2);
    const _index1 = BigInt.fromI32(1);

    event2.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index1)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID2)),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType0)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount1)
      )
    ];

    // add events
    handleExternalAssetDependencyUpdated(event);
    handleExternalAssetDependencyUpdated(event2);

    //checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount1.toString()
    );

    assert.entityCount(PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE, 2);

    const projectIdNotInStore = BigInt.fromI32(1);
    const removeEvent: ExternalAssetDependencyRemoved = changetype<
      ExternalAssetDependencyRemoved
    >(newMockEvent());
    removeEvent.address = TEST_CONTRACT_ADDRESS;
    removeEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    removeEvent.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectIdNotInStore)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
      )
    ];

    let tupleArray: Array<ethereum.Value> = [
      ethereum.Value.fromString(IPFS_CID2),
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ];
    let tuple: ethereum.Tuple = changetype<ethereum.Tuple>(tupleArray);
    createMockedFunction(
      TEST_CONTRACT_ADDRESS,
      "projectExternalAssetDependencyByIndex",
      "projectExternalAssetDependencyByIndex(uint256,uint256):((string,uint8))"
    )
      .withArgs([
        ethereum.Value.fromUnsignedBigInt(projectIdNotInStore),
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
      ])
      .returns([ethereum.Value.fromTuple(tuple)]);

    handleExternalAssetDependencyRemoved(removeEvent);

    // checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount1.toString()
    );

    // checks that entity count is correct
    assert.entityCount(PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE, 2);
  });

  test(`${coreType} Cannot lock a non-existant project's external asset dependencies`, () => {
    // Add project to store
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );

    const event: ExternalAssetDependencyUpdated = changetype<
      ExternalAssetDependencyUpdated
    >(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const _index0 = BigInt.zero();
    const _dependencyType0 = BigInt.zero();
    const _externalAssetDependencyCount0 = BigInt.fromI32(1);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      BigInt.fromI32(0).toString()
    );

    event.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_index",
        ethereum.Value.fromUnsignedBigInt(_index0)
      ),
      new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromUnsignedBigInt(_dependencyType0)
      ),
      new ethereum.EventParam(
        "_externalAssetDependencyCount",
        ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
      )
    ];

    // add event
    handleExternalAssetDependencyUpdated(event);
    // checks project external asset dependency count
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependencyCount",
      _externalAssetDependencyCount0.toString()
    );

    // checks project external asset dependency lock status
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependenciesLocked",
      "false"
    );

    const lockEvent: ProjectExternalAssetDependenciesLocked = changetype<
      ProjectExternalAssetDependenciesLocked
    >(newMockEvent());
    lockEvent.address = TEST_CONTRACT_ADDRESS;
    lockEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    const projectIdNotInStore = BigInt.fromI32(1);

    lockEvent.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectIdNotInStore)
      )
    ];

    handleProjectExternalAssetDependenciesLocked(lockEvent);

    // checks project external asset dependency lock status
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "externalAssetDependenciesLocked",
      "false"
    );
  });
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export {
  handleExternalAssetDependencyUpdated,
  handleExternalAssetDependencyRemoved,
  handleProjectExternalAssetDependenciesLocked,
  handleGatewayUpdated
};
