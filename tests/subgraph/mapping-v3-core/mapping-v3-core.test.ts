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
  TEST_CONTRACT_ADDRESS,
  TEST_TOKEN_HASH,
  TEST_TX_HASH,
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  addNewProjectToStore,
  addNewTokenToStore,
  TRANSFER_ENTITY_TYPE,
  ONE_MILLION,
  booleanToString,
  TEST_CONTRACT
} from "../shared-helpers";
import {
  mockProjectScriptDetailsCall,
  mockProjectStateDataCall,
  testProjectDetailsUpdated,
  testProjectScriptDetailsUpdated,
  testProjectStateDataUpdated,
  mockRefreshContractCalls
} from "./helpers";
import { Project } from "../../../generated/schema";
import {
  Mint,
  ProjectUpdated,
  Transfer,
  PlatformUpdated,
  OwnershipTransferred
} from "../../../generated/GenArt721CoreV3/GenArt721CoreV3";
import {
  FIELD_PROJECT_ACTIVE,
  FIELD_PROJECT_ARTIST_ADDRESS,
  FIELD_PROJECT_ARTIST_NAME,
  FIELD_PROJECT_ASPECT_RATIO,
  FIELD_PROJECT_BASE_URI,
  FIELD_PROJECT_COMPLETED,
  FIELD_PROJECT_CREATED,
  FIELD_PROJECT_DESCRIPTION,
  FIELD_PROJECT_IPFS_HASH,
  FIELD_PROJECT_LICENSE,
  FIELD_PROJECT_MAX_INVOCATIONS,
  FIELD_PROJECT_NAME,
  FIELD_PROJECT_PAUSED,
  FIELD_PROJECT_SCRIPT,
  FIELD_PROJECT_SCRIPT_TYPE,
  FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE,
  FIELD_PROJECT_WEBSITE,
  handleMint,
  handleTransfer,
  handlePlatformUpdated,
  handleOwnershipTransferred,
  handleProjectUpdated
} from "../../../src/mapping-v3-core";
import {
  generateContractSpecificId,
  generateProjectScriptId
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
    TEST_CONTRACT_ADDRESS,
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
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

test("GenArt721CoreV3: Handles OwnershipTransferred to new address and zero address, when Contract not in store", () => {
  const newOwners = [
    randomAddressGenerator.generateRandomAddress(),
    Address.zero()
  ];
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < newOwners.length; i++) {
    clearStore();
    const newOwnerAddress = newOwners[i];
    // add new contract to store
    const projectId = BigInt.fromI32(101);
    // specifically do not add new contract to store, because this event is
    // emitted by the V3 constructor, and we expect item may not be in store.
    // DO add mock contract calls, because we expect the contract to be called
    // during initial contract setup.
    mockRefreshContractCalls(projectId, null);

    const updatedEventBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
      BigInt.fromI32(10)
    );
    const event: OwnershipTransferred = changetype<OwnershipTransferred>(
      newMockEvent()
    );
    event.address = TEST_CONTRACT_ADDRESS;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = BigInt.fromI32(0);
    event.parameters = [
      new ethereum.EventParam(
        "previousOwner",
        ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
      ),
      new ethereum.EventParam(
        "newOwner",
        ethereum.Value.fromAddress(newOwnerAddress)
      )
    ];
    event.block.timestamp = updatedEventBlockTimestamp;
    // handle event
    handleOwnershipTransferred(event);
    // assertions
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "admin",
      newOwnerAddress.toHexString()
    );
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "updatedAt",
      updatedEventBlockTimestamp.toString()
    );
    // should also initialize the Contract entity with expected values from
    // mock functions. spot check a few here
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "renderProviderAddress",
      TEST_CONTRACT.renderProviderAddress.toHexString()
    );
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "randomizerContract",
      TEST_CONTRACT.randomizerContract.toHexString()
    );
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "nextProjectId",
      projectId.toString()
    );
  }
});

test("GenArt721CoreV3: Handles OwnershipTransferred to new address and zero address, when already in store", () => {
  const newOwners = [
    randomAddressGenerator.generateRandomAddress(),
    Address.zero()
  ];
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < newOwners.length; i++) {
    clearStore();
    const newOwnerAddress = newOwners[i];
    // add new contract to store
    const projectId = BigInt.fromI32(101);
    // specifically do add new contract to store, because sometimes we do
    // expect contract entity to be in store.
    addTestContractToStore(projectId);
    // also add mock contract calls, because that will always be available.
    mockRefreshContractCalls(projectId, null);

    const updatedEventBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
      BigInt.fromI32(10)
    );
    const event: OwnershipTransferred = changetype<OwnershipTransferred>(
      newMockEvent()
    );
    event.address = TEST_CONTRACT_ADDRESS;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = BigInt.fromI32(0);
    event.parameters = [
      new ethereum.EventParam(
        "previousOwner",
        ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
      ),
      new ethereum.EventParam(
        "newOwner",
        ethereum.Value.fromAddress(newOwnerAddress)
      )
    ];
    event.block.timestamp = updatedEventBlockTimestamp;
    // handle event
    handleOwnershipTransferred(event);
    // assertions
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "admin",
      newOwnerAddress.toHexString()
    );
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "updatedAt",
      updatedEventBlockTimestamp.toString()
    );
  }
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

test("GenArt721CoreV3: Handles PlatformUpdated::artblocksPrimaryPercentage - default value", () => {
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
    "renderProviderPercentage",
    TEST_CONTRACT.renderProviderPercentage.toString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::artblocksPrimaryPercentage - changed value", () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // update mock function return value
  const newValue = BigInt.fromI32(13);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksPrimarySalesPercentage",
    "artblocksPrimarySalesPercentage():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(newValue)]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("artblocksPrimaryPercentage"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderPercentage",
    newValue.toString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::artblocksSecondaryBPS - default value", () => {
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
    "renderProviderSecondarySalesBPS",
    TEST_CONTRACT.renderProviderSecondarySalesBPS.toString()
  );
});

test("GenArt721CoreV3: Handles PlatformUpdated::artblocksSecondaryBPS - changed value", () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), null);

  // update mock function return value
  const newValue = BigInt.fromI32(250);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksSecondarySalesBPS",
    "artblocksSecondarySalesBPS():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(newValue)]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("artblocksSecondaryBPS"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderSecondarySalesBPS",
    newValue.toString()
  );
});

describe("GenArt721CoreV3: handleProjectUpdated", () => {
  describe("create", () => {
    beforeEach(() => {
      clearStore();
      addTestContractToStore(BigInt.fromI32(0));
    });

    test("should do nothing if the contract does not already exist", () => {
      // Extra clearStore for this test since we don't want the contract to exist here
      clearStore();
      const projectId = BigInt.fromI32(0);

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_CREATED))
        )
      ];

      handleProjectUpdated(event);

      assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHex());
      assert.notInStore(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId)
      );
    });

    test("should do nothing if request for project info reverts", () => {
      const projectId = BigInt.fromI32(0);

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_CREATED))
        )
      ];

      // mock projectDetails
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectDetails",
        "projectDetails(uint256):(string,string,string,string,string)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test")
        ]);
      // mock projectScriptDetails
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectScriptDetails",
        "projectScriptDetails(uint256):(string,string,string,uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
        ]);
      // mock projectStateData
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectStateData",
        "projectStateData(uint256):(uint256,uint256,bool,bool,bool)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(ONE_MILLION)),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromBoolean(true),
          ethereum.Value.fromBoolean(false)
        ]);
      // // mock projectIdToArtistAddress
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToArtistAddress",
        "projectIdToArtistAddress(uint256):(address)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .reverts();

      handleProjectUpdated(event);

      assert.notInStore(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId)
      );
    });

    test("should create a project entity", () => {
      const projectId = BigInt.fromI32(0);
      const artistAddress = randomAddressGenerator.generateRandomAddress();
      const projectName = "Test Project";
      const invocations = BigInt.fromI32(0);
      const maxInvocations = BigInt.fromI32(ONE_MILLION);
      const paused = true;
      const scriptCount = BigInt.fromI32(0);

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_CREATED))
        )
      ];

      // mock projectDetails
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectDetails",
        "projectDetails(uint256):(string,string,string,string,string)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString(projectName),
          ethereum.Value.fromString(""),
          ethereum.Value.fromString(""),
          ethereum.Value.fromString(""),
          ethereum.Value.fromString("")
        ]);
      // mock projectScriptDetails
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectScriptDetails",
        "projectScriptDetails(uint256):(string,string,string,uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString(""),
          ethereum.Value.fromString(""),
          ethereum.Value.fromString(""),
          ethereum.Value.fromUnsignedBigInt(scriptCount)
        ]);
      // mock projectStateData
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectStateData",
        "projectStateData(uint256):(uint256,uint256,bool,bool,bool)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(invocations),
          ethereum.Value.fromUnsignedBigInt(maxInvocations),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromBoolean(paused),
          ethereum.Value.fromBoolean(false)
        ]);
      // // mock projectIdToArtistAddress
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToArtistAddress",
        "projectIdToArtistAddress(uint256):(address)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromAddress(artistAddress)]);

      handleProjectUpdated(event);

      // Artist entity
      assert.fieldEquals(
        ACCOUNT_ENTITY_TYPE,
        artistAddress.toHexString(),
        "id",
        artistAddress.toHexString()
      );

      // Project fields
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "active",
        booleanToString(false)
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "artistAddress",
        artistAddress.toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "complete",
        "false"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "contract",
        TEST_CONTRACT_ADDRESS.toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "createdAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "currencyAddress",
        Address.zero().toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "currencySymbol",
        "ETH"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "dynamic",
        "true"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "externalAssetDependencyCount",
        "0"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "invocations",
        invocations.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "locked",
        "false"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "maxInvocations",
        maxInvocations.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "name",
        projectName
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "paused",
        booleanToString(paused)
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "scriptCount",
        scriptCount.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "useHashString",
        "true"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "useIpfs",
        "false"
      );
    });
  });

  describe("update", () => {
    beforeEach(() => {
      const projectId = BigInt.fromI32(0);
      const projectName = "Test Project";
      const artistAddress = randomAddressGenerator.generateRandomAddress();

      clearStore();
      addTestContractToStore(BigInt.fromI32(1));
      const project = addNewProjectToStore(
        TEST_CONTRACT_ADDRESS,
        projectId,
        projectName,
        artistAddress,
        BigInt.zero(),
        CURRENT_BLOCK_TIMESTAMP
      );

      project.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
      project.save();
    });

    test("should do nothing if project does not exist", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        BigInt.zero()
      );
      store.remove("Project", fullProjectId);

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_ACTIVE))
        )
      ];

      const projectStateDataCallReturnOverrides = new Map<string, string>();
      projectStateDataCallReturnOverrides.set("active", "true");
      mockProjectStateDataCall(projectId, projectStateDataCallReturnOverrides);

      assert.notInStore("Project", fullProjectId);

      handleProjectUpdated(event);

      assert.notInStore("Project", fullProjectId);
    });

    describe("projectStateDataUpdated", () => {
      test("should update active", () => {
        testProjectStateDataUpdated(FIELD_PROJECT_ACTIVE, "true");
      });

      test("should update maxInvocations", () => {
        testProjectStateDataUpdated(FIELD_PROJECT_MAX_INVOCATIONS, "100");
      });

      test("should update paused", () => {
        testProjectStateDataUpdated(FIELD_PROJECT_PAUSED, "false");
      });
    });

    test("should update artist address", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );
      const project: Project = changetype<Project>(Project.load(fullProjectId));
      const oldArtistAddress = project.artistAddress;
      const newArtistAddress = randomAddressGenerator.generateRandomAddress();

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_ARTIST_ADDRESS))
        )
      ];

      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToArtistAddress",
        "projectIdToArtistAddress(uint256):(address)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromAddress(newArtistAddress)]);

      assert.assertTrue(oldArtistAddress.notEqual(newArtistAddress));

      handleProjectUpdated(event);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "artistAddress",
        newArtistAddress.toHexString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    describe("projectDetailsUpdated", () => {
      test("should update artist name", () => {
        testProjectDetailsUpdated(FIELD_PROJECT_ARTIST_NAME, "New Artist Name");
      });

      test("should update description", () => {
        testProjectDetailsUpdated(FIELD_PROJECT_DESCRIPTION, "New Description");
      });

      test("should update license", () => {
        testProjectDetailsUpdated(FIELD_PROJECT_LICENSE, "New License");
      });

      test("should update name", () => {
        testProjectDetailsUpdated(FIELD_PROJECT_NAME, "New Name");
      });

      test("should update website", () => {
        testProjectDetailsUpdated(FIELD_PROJECT_WEBSITE, "New Website");
      });
    });

    describe("projectScriptDetailsUpdated", () => {
      test("should update aspectRatio", () => {
        testProjectScriptDetailsUpdated(FIELD_PROJECT_ASPECT_RATIO, "1.5");
      });

      test("should update ipfsHash", () => {
        testProjectScriptDetailsUpdated(
          FIELD_PROJECT_IPFS_HASH,
          "New IPFS Hash"
        );
      });

      test("should update scriptTypeAndVersion", () => {
        testProjectScriptDetailsUpdated(
          FIELD_PROJECT_SCRIPT_TYPE,
          "p5js@1.0.0"
        );
      });
    });

    test("should update baseUri", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );
      const project: Project = changetype<Project>(Project.load(fullProjectId));
      const oldBaseUri = project.baseUri;
      const newBaseUri = "New Base URI";

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_BASE_URI))
        )
      ];

      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectURIInfo",
        "projectURIInfo(uint256):(string)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromString(newBaseUri)]);

      assert.assertTrue(oldBaseUri != newBaseUri);

      handleProjectUpdated(event);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "baseUri",
        newBaseUri
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    test("should update complete and completedAt", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_COMPLETED))
        )
      ];

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "complete",
        "false"
      );

      handleProjectUpdated(event);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "complete",
        "true"
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "completedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    test("should add, update and remove script", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );
      const project = changetype<Project>(Project.load(fullProjectId));

      // Add script 0
      const script0Id = generateProjectScriptId(
        fullProjectId,
        BigInt.fromI32(0)
      );
      const script0 = "Script 0";

      const event0: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event0.address = TEST_CONTRACT_ADDRESS;
      event0.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
      event0.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_SCRIPT))
        )
      ];

      const projectScriptDetailsCall0ReturnOverrides = new Map<
        string,
        string
      >();
      projectScriptDetailsCall0ReturnOverrides.set("scriptCount", "1");

      mockProjectScriptDetailsCall(
        projectId,
        projectScriptDetailsCall0ReturnOverrides
      );

      mockProjectScriptByIndex(
        TEST_CONTRACT_ADDRESS,
        projectId,
        BigInt.fromI32(0),
        script0
      );

      assert.notInStore(PROJECT_SCRIPT_ENTITY_TYPE, script0Id);

      handleProjectUpdated(event0);

      assert.fieldEquals(
        PROJECT_SCRIPT_ENTITY_TYPE,
        script0Id,
        "script",
        script0
      );

      assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "script", script0);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        event0.block.timestamp.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "scriptUpdatedAt",
        event0.block.timestamp.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "scriptCount",
        "1"
      );

      // Add script 1
      const script1Id = generateProjectScriptId(
        fullProjectId,
        BigInt.fromI32(1)
      );
      const script1 = "Script 1";

      const event1: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event1.address = TEST_CONTRACT_ADDRESS;
      event1.block.timestamp = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(1));
      event1.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_SCRIPT))
        )
      ];

      const projectScriptDetailsCall1ReturnOverrides = new Map<
        string,
        string
      >();
      projectScriptDetailsCall1ReturnOverrides.set("scriptCount", "2");

      mockProjectScriptDetailsCall(
        projectId,
        projectScriptDetailsCall1ReturnOverrides
      );

      mockProjectScriptByIndex(
        TEST_CONTRACT_ADDRESS,
        projectId,
        BigInt.fromI32(1),
        script1
      );

      assert.notInStore(PROJECT_SCRIPT_ENTITY_TYPE, script1Id);

      handleProjectUpdated(event1);

      assert.fieldEquals(
        PROJECT_SCRIPT_ENTITY_TYPE,
        script1Id,
        "script",
        script1
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "script",
        script0 + script1
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        event1.block.timestamp.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "scriptUpdatedAt",
        event1.block.timestamp.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "scriptCount",
        "2"
      );

      // Update script 0
      const script0Updated = "Script 1 Updated";
      const event2: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event2.address = TEST_CONTRACT_ADDRESS;
      event2.block.timestamp = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(2));
      event2.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_SCRIPT))
        )
      ];

      const projectScriptDetailsCall2ReturnOverrides = new Map<
        string,
        string
      >();
      projectScriptDetailsCall2ReturnOverrides.set("scriptCount", "2");

      mockProjectScriptDetailsCall(
        projectId,
        projectScriptDetailsCall2ReturnOverrides
      );

      mockProjectScriptByIndex(
        TEST_CONTRACT_ADDRESS,
        projectId,
        BigInt.fromI32(0),
        script0Updated
      );

      handleProjectUpdated(event2);

      assert.fieldEquals(
        PROJECT_SCRIPT_ENTITY_TYPE,
        script0Id,
        "script",
        script0Updated
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "script",
        script0Updated + script1
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        event2.block.timestamp.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "scriptUpdatedAt",
        event2.block.timestamp.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "scriptCount",
        "2"
      );

      // Remove script 1
      const event3: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event3.address = TEST_CONTRACT_ADDRESS;
      event3.block.timestamp = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(3));
      event3.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_SCRIPT))
        )
      ];

      const projectScriptDetailsCall3ReturnOverrides = new Map<
        string,
        string
      >();
      projectScriptDetailsCall3ReturnOverrides.set("scriptCount", "1");

      mockProjectScriptDetailsCall(
        projectId,
        projectScriptDetailsCall3ReturnOverrides
      );

      handleProjectUpdated(event3);

      assert.notInStore(PROJECT_SCRIPT_ENTITY_TYPE, script1Id);

      assert.fieldEquals(
        PROJECT_SCRIPT_ENTITY_TYPE,
        script0Id,
        "script",
        script0Updated
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "script",
        script0Updated
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        event3.block.timestamp.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "scriptUpdatedAt",
        event3.block.timestamp.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "scriptCount",
        "1"
      );
    });

    test("should update royaltyPercentage", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );
      const project: Project = changetype<Project>(Project.load(fullProjectId));
      const oldRoyaltyPercentage = project.royaltyPercentage;
      const newRoyaltyPercentage = BigInt.fromI32(10);

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE)
          )
        )
      ];

      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToSecondaryMarketRoyaltyPercentage",
        "projectIdToSecondaryMarketRoyaltyPercentage(uint256):(uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromUnsignedBigInt(newRoyaltyPercentage)]);

      assert.assertTrue(
        newRoyaltyPercentage.notEqual(
          oldRoyaltyPercentage ? oldRoyaltyPercentage : BigInt.fromI32(0)
        )
      );

      handleProjectUpdated(event);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "royaltyPercentage",
        newRoyaltyPercentage.toString()
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });
  });
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export {
  handleMint,
  handleTransfer,
  handleProjectUpdated,
  handlePlatformUpdated
};
