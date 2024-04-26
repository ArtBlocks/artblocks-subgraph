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
  addTestContractToStoreOfTypeAndVersion,
  addNewProjectToStore,
  addNewTokenToStore,
  TRANSFER_ENTITY_TYPE,
  ONE_MILLION,
  booleanToString,
  TEST_CONTRACT,
  TEST_SUPER_ADMIN_ADDRESS,
  WHITELISTING_ENTITY_TYPE
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
  PlatformUpdated
} from "../../../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_Base";
import { Transfer } from "../../../generated/IERC721GenArt721CoreV3Contract/IERC721";
import { OwnershipTransferred } from "../../../generated/OwnableGenArt721CoreV3Contract/Ownable";
import { SuperAdminTransferred } from "../../../generated/AdminACLV0/IAdminACLV0";
import {
  FIELD_PROJECT_ACTIVE,
  FIELD_PROJECT_ARTIST_ADDRESS,
  FIELD_PROJECT_ARTIST_NAME,
  FIELD_PROJECT_ASPECT_RATIO,
  FIELD_PROJECT_BASE_URI,
  FIELD_PROJECT_COMPLETED,
  FIELD_PROJECT_CREATED,
  FIELD_PROJECT_DESCRIPTION,
  FIELD_PROJECT_LICENSE,
  FIELD_PROJECT_MAX_INVOCATIONS,
  FIELD_PROJECT_NAME,
  FIELD_PROJECT_PAUSED,
  FIELD_PROJECT_SCRIPT,
  FIELD_PROJECT_SCRIPT_TYPE,
  FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE,
  FIELD_PROJECT_WEBSITE,
  handleIAdminACLV0SuperAdminTransferred,
  handleMint,
  handleTransfer,
  handlePlatformUpdated,
  handleOwnershipTransferred,
  handleProjectUpdated
} from "../../../src/mapping-v3-core";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

const coreType = "GenArt721CoreV3_Engine";
const coreVersion = "v3.1.0";

test(`${coreType}: Can handle Mint`, () => {
  clearStore();
  // add contract to store
  const projectId = BigInt.fromI32(1);
  const tokenId = BigInt.fromI32(1000001);
  addTestContractToStore(projectId);
  mockTokenIdToHash(TEST_CONTRACT_ADDRESS, tokenId, TEST_TOKEN_HASH);
  mockCoreType(TEST_CONTRACT_ADDRESS, `${coreType}`);
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

test(`${coreType}: Can handle transfer`, () => {
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

test(`${coreType}: Handles OwnershipTransferred to new address and zero address, when Contract not in store`, () => {
  const newOwners = [
    Address.zero(),
    randomAddressGenerator.generateRandomAddress()
  ];
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < newOwners.length; i++) {
    clearStore();
    const newOwnerAddress = newOwners[i];
    const newOwnerSuperAdmin = randomAddressGenerator.generateRandomAddress();
    // add new contract to store
    const projectId = BigInt.fromI32(101);
    // specifically do not add new contract to store, because this event is
    // emitted by the V3 constructor, and we expect item may not be in store.
    // DO add mock contract calls, because we expect the contract to be called
    // during initial contract setup.
    mockRefreshContractCalls(projectId, coreType, null);
    // overwrite mock function to return the new admin
    createMockedFunction(
      TEST_CONTRACT_ADDRESS,
      "admin",
      "admin():(address)"
    ).returns([ethereum.Value.fromAddress(newOwnerAddress)]);
    // if transferred to new adminACLV0, then mock the adminACLV0 contract
    if (newOwnerAddress != Address.zero()) {
      createMockedFunction(
        newOwnerAddress,
        "superAdmin",
        "superAdmin():(address)"
      ).returns([ethereum.Value.fromAddress(newOwnerSuperAdmin)]);
    }

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
    if (newOwnerAddress != Address.zero()) {
      assert.fieldEquals(
        CONTRACT_ENTITY_TYPE,
        TEST_CONTRACT_ADDRESS.toHexString(),
        "admin",
        newOwnerSuperAdmin.toHexString()
      );
      assert.fieldEquals(
        WHITELISTING_ENTITY_TYPE,
        generateWhitelistingId(
          TEST_CONTRACT_ADDRESS.toHexString(),
          newOwnerSuperAdmin.toHexString()
        ),
        "account",
        newOwnerSuperAdmin.toHexString()
      );
    } else {
      assert.fieldEquals(
        CONTRACT_ENTITY_TYPE,
        TEST_CONTRACT_ADDRESS.toHexString(),
        "admin",
        Address.zero().toHexString()
      );
      assert.entityCount(WHITELISTING_ENTITY_TYPE, 0);
    }
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

test(`${coreType}: Handles OwnershipTransferred to new address and zero address, when already in store`, () => {
  const newOwners = [
    randomAddressGenerator.generateRandomAddress(),
    Address.zero()
  ];
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < newOwners.length; i++) {
    clearStore();
    const newOwnerAddress = newOwners[i];
    const newOwnerSuperAdmin = randomAddressGenerator.generateRandomAddress();
    // add new contract to store
    const projectId = BigInt.fromI32(101);
    // specifically do add new contract to store, because sometimes we do
    // expect contract entity to be in store.
    addTestContractToStore(projectId);
    // also add mock contract calls, because that will always be available.
    mockRefreshContractCalls(projectId, coreType, null);
    // overwrite mock function to return the new admin
    createMockedFunction(
      TEST_CONTRACT_ADDRESS,
      "admin",
      "admin():(address)"
    ).returns([ethereum.Value.fromAddress(newOwnerAddress)]);
    // if transferred to new adminACLV0, then mock the adminACLV0 contract
    if (newOwnerAddress != Address.zero()) {
      createMockedFunction(
        newOwnerAddress,
        "superAdmin",
        "superAdmin():(address)"
      ).returns([ethereum.Value.fromAddress(newOwnerSuperAdmin)]);
    }

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
    if (newOwnerAddress != Address.zero()) {
      assert.fieldEquals(
        CONTRACT_ENTITY_TYPE,
        TEST_CONTRACT_ADDRESS.toHexString(),
        "admin",
        newOwnerSuperAdmin.toHexString()
      );
      assert.fieldEquals(
        WHITELISTING_ENTITY_TYPE,
        generateWhitelistingId(
          TEST_CONTRACT_ADDRESS.toHexString(),
          newOwnerSuperAdmin.toHexString()
        ),
        "account",
        newOwnerSuperAdmin.toHexString()
      );
    } else {
      assert.fieldEquals(
        CONTRACT_ENTITY_TYPE,
        TEST_CONTRACT_ADDRESS.toHexString(),
        "admin",
        Address.zero().toHexString()
      );
      assert.entityCount(WHITELISTING_ENTITY_TYPE, 0);
    }
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "updatedAt",
      updatedEventBlockTimestamp.toString()
    );
  }
});

test(`${coreType}: Handles PlatformUpdated::nextProjectId`, () => {
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < 2; i++) {
    clearStore();
    // add new contract to store
    const projectId = BigInt.fromI32(i);
    addTestContractToStore(projectId);
    mockRefreshContractCalls(BigInt.fromI32(i), coreType, null);

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

test(`${coreType}: Handles PlatformUpdated::newProjectsForbidden - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "newProjectsForbidden",
    false.toString()
  );
});

test(`${coreType}: Handles PlatformUpdated::newProjectsForbidden - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

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

test(`${coreType}: Handles PlatformUpdated::nextProjectId`, () => {
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < 2; i++) {
    clearStore();
    // add new contract to store
    const projectId = BigInt.fromI32(i);
    addTestContractToStore(projectId);
    mockRefreshContractCalls(BigInt.fromI32(i), coreType, null);

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

test(`${coreType}: Handles PlatformUpdated::artblocksPrimarySalesAddress - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    TEST_CONTRACT.renderProviderAddress.toHexString()
  );
});

test(`${coreType}: Handles PlatformUpdated::providerSalesAddresses - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // update mock function return values
  const newRenderProviderPrimarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderPrimarySalesAddress",
    "renderProviderPrimarySalesAddress():(address)"
  ).returns([ethereum.Value.fromAddress(newRenderProviderPrimarySalesAddress)]);

  const newRenderProviderSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderSecondarySalesAddress",
    "renderProviderSecondarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newRenderProviderSecondarySalesAddress)
  ]);
  // @dev pre-v3.2 do not have defaultRenderProviderSecondarySalesAddress()

  const newPlatformProviderPrimarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "platformProviderPrimarySalesAddress",
    "platformProviderPrimarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newPlatformProviderPrimarySalesAddress)
  ]);

  const newPlatformProviderSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "platformProviderSecondarySalesAddress",
    "platformProviderSecondarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newPlatformProviderSecondarySalesAddress)
  ]);
  // @dev pre-v3.2 do not have defaultPlatformProviderSecondarySalesAddress()

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("providerSalesAddresses"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // all four payment addresses in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    newRenderProviderPrimarySalesAddress.toHexString()
  );
  // DEPRECATED START ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderSecondarySalesAddress",
    newRenderProviderSecondarySalesAddress.toHexString()
  );
  // DEPRECATED END ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultRenderProviderSecondarySalesAddress",
    newRenderProviderSecondarySalesAddress.toHexString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "enginePlatformProviderAddress",
    newPlatformProviderPrimarySalesAddress.toHexString()
  );
  // DEPRECATED START ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "enginePlatformProviderSecondarySalesAddress",
    newPlatformProviderSecondarySalesAddress.toHexString()
  );
  // DEPRECATED END ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultEnginePlatformProviderSecondarySalesAddress",
    newPlatformProviderSecondarySalesAddress.toHexString()
  );
});

test(`${coreType}: Handles PlatformUpdated::providerSalesAddresses - changed value - multi-project iteration`, () => {
  // this test is to ensure that the secondary sales address is updated for all projects
  // when the platform's secondary sales address is updated.
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStoreOfTypeAndVersion(projectId, coreType, coreVersion);
  mockRefreshContractCalls(
    BigInt.fromI32(2), // next project id = 2, so projects 0 and 1 exist and should be iterated over
    coreType,
    null
  );
  // add projects 0 and 1 to store
  addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(0),
    "Project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(1),
    CURRENT_BLOCK_TIMESTAMP
  );
  addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(1),
    "Project 1",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(1),
    CURRENT_BLOCK_TIMESTAMP
  );

  // update mock function return values
  const newRenderProviderPrimarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderPrimarySalesAddress",
    "renderProviderPrimarySalesAddress():(address)"
  ).returns([ethereum.Value.fromAddress(newRenderProviderPrimarySalesAddress)]);

  const newRenderProviderSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderSecondarySalesAddress",
    "renderProviderSecondarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newRenderProviderSecondarySalesAddress)
  ]);
  // @dev pre-v3.2 do not have defaultRenderProviderSecondarySalesAddress()

  const newPlatformProviderPrimarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "platformProviderPrimarySalesAddress",
    "platformProviderPrimarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newPlatformProviderPrimarySalesAddress)
  ]);

  const newPlatformProviderSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "platformProviderSecondarySalesAddress",
    "platformProviderSecondarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newPlatformProviderSecondarySalesAddress)
  ]);
  // @dev pre-v3.2 do not have defaultPlatformProviderSecondarySalesAddress()

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("providerSalesAddresses"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // all four payment addresses in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    newRenderProviderPrimarySalesAddress.toHexString()
  );
  // DEPRECATED START ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderSecondarySalesAddress",
    newRenderProviderSecondarySalesAddress.toHexString()
  );
  // DEPRECATED END ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultRenderProviderSecondarySalesAddress",
    newRenderProviderSecondarySalesAddress.toHexString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "enginePlatformProviderAddress",
    newPlatformProviderPrimarySalesAddress.toHexString()
  );
  // DEPRECATED START ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "enginePlatformProviderSecondarySalesAddress",
    newPlatformProviderSecondarySalesAddress.toHexString()
  );
  // DEPRECATED END ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultEnginePlatformProviderSecondarySalesAddress",
    newPlatformProviderSecondarySalesAddress.toHexString()
  );
  // projects should also be updated
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    generateContractSpecificId(TEST_CONTRACT_ADDRESS, BigInt.fromI32(0)),
    "renderProviderSecondarySalesAddress",
    newRenderProviderSecondarySalesAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    generateContractSpecificId(TEST_CONTRACT_ADDRESS, BigInt.fromI32(1)),
    "renderProviderSecondarySalesAddress",
    newRenderProviderSecondarySalesAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    generateContractSpecificId(TEST_CONTRACT_ADDRESS, BigInt.fromI32(0)),
    "enginePlatformProviderSecondarySalesAddress",
    newPlatformProviderSecondarySalesAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    generateContractSpecificId(TEST_CONTRACT_ADDRESS, BigInt.fromI32(1)),
    "enginePlatformProviderSecondarySalesAddress",
    newPlatformProviderSecondarySalesAddress.toHexString()
  );
});

test(`${coreType}: Handles PlatformUpdated::providerPrimaryPercentages - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // default value should be test contract value
  // DEPRECATED START ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderSecondarySalesAddress",
    TEST_CONTRACT.renderProviderSecondarySalesAddress.toHexString()
  );
  // DEPRECATED END ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultRenderProviderSecondarySalesAddress",
    TEST_CONTRACT.defaultRenderProviderSecondarySalesAddress.toHexString()
  );
});

test(`${coreType}: Handles PlatformUpdated::randomizerAddress - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "randomizerContract",
    TEST_CONTRACT.randomizerContract.toHexString()
  );
});

test(`${coreType}: Handles PlatformUpdated::randomizerAddress - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

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

test(`${coreType}: Handles PlatformUpdated::curationRegistryAddress - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // default value should be nothing
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "curationRegistry",
    TEST_CONTRACT.curationRegistry.toHexString()
  );
});

test(`${coreType}: Null curationRegistryAddress on Engine contract`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // update mock function for curation registry to revert
  const newAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksCurationRegistryAddress",
    "artblocksCurationRegistryAddress():(address)"
  ).reverts();

  // create dummy event to induce contract sync
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("dummyField"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value in store should reflect a null curation registry address
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "curationRegistry",
    "null"
  );
});

test(`${coreType}: Handles PlatformUpdated::dependencyRegistryAddress - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "dependencyRegistry",
    TEST_CONTRACT.dependencyRegistry.toHexString()
  );
});

test(`${coreType}: Handles PlatformUpdated::dependencyRegistryAddress - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

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

  // value in store should be the same
  // We allow the dependency registry to control this value
  // so we ignore the value on the core contract
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "dependencyRegistry",
    Address.zero().toHexString()
  );
});

test(`${coreType}: Populated autoApproveAtistSplitProposals on Engine contract`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // update mock function for autoApproveArtistSplitProposals to return tested value
  const valuesToTest = [true, false];
  for (let i = 0; i < valuesToTest.length; i++) {
    const val = valuesToTest[i];
    createMockedFunction(
      TEST_CONTRACT_ADDRESS,
      "autoApproveArtistSplitProposals",
      "autoApproveArtistSplitProposals():(bool)"
    ).returns([ethereum.Value.fromBoolean(val)]);

    // create dummy event to induce contract sync
    const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
    event.address = TEST_CONTRACT_ADDRESS;
    event.transaction.hash = TEST_TX_HASH;
    event.logIndex = BigInt.fromI32(0);
    event.parameters = [
      new ethereum.EventParam(
        "_field",
        ethereum.Value.fromBytes(Bytes.fromUTF8("dummyField"))
      )
    ];
    // handle event
    handlePlatformUpdated(event);

    // value in store should reflect a null curation registry address
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "autoApproveArtistSplitProposals",
      val.toString()
    );
  }
});

test(`${coreType}: Handles PlatformUpdated::providerPrimaryPercentages - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderPercentage",
    TEST_CONTRACT.renderProviderPercentage.toString()
  );
});

test(`${coreType}: Handles PlatformUpdated::providerPrimaryPercentages - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // update mock function return values
  const newRenderProviderPrimarySalesPercentage = BigInt.fromI32(13);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderPrimarySalesPercentage",
    "renderProviderPrimarySalesPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(newRenderProviderPrimarySalesPercentage)
  ]);

  const newPlatformProviderPrimarySalesPercentage = BigInt.fromI32(14);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "platformProviderPrimarySalesPercentage",
    "platformProviderPrimarySalesPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(newPlatformProviderPrimarySalesPercentage)
  ]);

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("providerPrimaryPercentages"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // values in store should be updated
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderPercentage",
    newRenderProviderPrimarySalesPercentage.toString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "enginePlatformProviderPercentage",
    newPlatformProviderPrimarySalesPercentage.toString()
  );
});

test(`${coreType}: Handles PlatformUpdated::providerSecondaryBPS - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // default value should be test contract default value
  // DEFAULT START ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderSecondarySalesBPS",
    TEST_CONTRACT.renderProviderSecondarySalesBPS.toString()
  );
  // DEFAULT END ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultRenderProviderSecondarySalesBPS",
    TEST_CONTRACT.defaultRenderProviderSecondarySalesBPS.toString()
  );
});

test(`${coreType}: Handles PlatformUpdated::providerSecondaryBPS - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);

  // update mock function return values
  const newRenderProviderSecondarySalesBPS = BigInt.fromI32(250);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderSecondarySalesBPS",
    "renderProviderSecondarySalesBPS():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(newRenderProviderSecondarySalesBPS)
  ]);
  // @dev pre-v3.2 do not have defaultRenderProviderSecondarySalesBPS()

  const newPlatformProviderSecondarySalesBPS = BigInt.fromI32(200);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "platformProviderSecondarySalesBPS",
    "platformProviderSecondarySalesBPS():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(newPlatformProviderSecondarySalesBPS)
  ]);
  // @dev pre-v3.2 do not have defaultPlatformProviderSecondarySalesBPS()

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(Bytes.fromUTF8("providerSecondaryBPS"))
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // values in store should be updated
  // DEPRECATED START ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderSecondarySalesBPS",
    newRenderProviderSecondarySalesBPS.toString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "enginePlatformProviderSecondarySalesBPS",
    newPlatformProviderSecondarySalesBPS.toString()
  );
  // DEPRECATED END ---
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultRenderProviderSecondarySalesBPS",
    newRenderProviderSecondarySalesBPS.toString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultEnginePlatformProviderSecondarySalesBPS",
    newPlatformProviderSecondarySalesBPS.toString()
  );
});

describe(`${coreType}: handleIAdminACLV0SuperAdminTransferred`, () => {
  test("should update core when super admin is transferred", () => {
    clearStore();
    // add new contract to store
    const projectId = BigInt.fromI32(0);
    addTestContractToStore(projectId);
    mockRefreshContractCalls(BigInt.fromI32(0), coreType, null);
    // mock AdminACLV0 superAdmin
    const newOwnerSuperAdmin = randomAddressGenerator.generateRandomAddress();
    createMockedFunction(
      TEST_CONTRACT.admin,
      "superAdmin",
      "superAdmin():(address)"
    ).returns([ethereum.Value.fromAddress(newOwnerSuperAdmin)]);
    // create event
    const event: SuperAdminTransferred = changetype<SuperAdminTransferred>(
      newMockEvent()
    );
    event.address = TEST_CONTRACT.admin;
    event.parameters = [
      new ethereum.EventParam(
        "previousSuperAdmin",
        ethereum.Value.fromAddress(TEST_SUPER_ADMIN_ADDRESS)
      ),
      new ethereum.EventParam(
        "newSuperAdmin",
        ethereum.Value.fromAddress(newOwnerSuperAdmin)
      ),
      new ethereum.EventParam(
        "_upgenArt721CoreAddressesToUpdatedate",
        ethereum.Value.fromAddressArray([TEST_CONTRACT_ADDRESS])
      )
    ];
    // handle event
    handleIAdminACLV0SuperAdminTransferred(event);
    // assertions
    assert.fieldEquals(
      CONTRACT_ENTITY_TYPE,
      TEST_CONTRACT_ADDRESS.toHexString(),
      "admin",
      newOwnerSuperAdmin.toHexString()
    );
    assert.fieldEquals(
      WHITELISTING_ENTITY_TYPE,
      generateWhitelistingId(
        TEST_CONTRACT_ADDRESS.toHexString(),
        newOwnerSuperAdmin.toHexString()
      ),
      "account",
      newOwnerSuperAdmin.toHexString()
    );
    // check that old super admin is removed from whitelist by confirming 1 Whitelisting entity
    assert.entityCount(WHITELISTING_ENTITY_TYPE, 1);
  });
});

describe(`${coreType}: handleProjectUpdated`, () => {
  describe("create", () => {
    beforeEach(() => {
      clearStore();
      addTestContractToStore(BigInt.fromI32(0));
      addTestContractToStoreOfTypeAndVersion(
        BigInt.fromI32(0),
        coreType,
        coreVersion
      );
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
        "projectScriptDetails(uint256):(string,string,uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
        ]);
      // mock projectStateData
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectStateData",
        "projectStateData(uint256):(uint256,uint256,bool,bool,uint256,bool)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(ONE_MILLION)),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromBoolean(true),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
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

      // mock all refresh contract calls to ensure the required contract-level royalty functions are mocked
      mockRefreshContractCalls(projectId, coreType, null);

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
        "projectScriptDetails(uint256):(string,string,uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString(""),
          ethereum.Value.fromString(""),
          ethereum.Value.fromUnsignedBigInt(scriptCount)
        ]);
      // mock projectStateData
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectStateData",
        "projectStateData(uint256):(uint256,uint256,bool,bool,uint256,bool)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(invocations),
          ethereum.Value.fromUnsignedBigInt(maxInvocations),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromBoolean(paused),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
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
      // mock projectIdToSecondaryMarketRoyaltyPercentage, return 0
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToSecondaryMarketRoyaltyPercentage",
        "projectIdToSecondaryMarketRoyaltyPercentage(uint256):(uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromI32(0)]);

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
      // default royalty upon project creation is 0 for pre-v3.2 Engine core
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "royaltyPercentage",
        "0"
      );
      // project render provider royalties should equal contract-level values for pre-v3.2 Engine core
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "renderProviderSecondarySalesAddress",
        TEST_CONTRACT.defaultRenderProviderSecondarySalesAddress.toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "renderProviderSecondarySalesBPS",
        TEST_CONTRACT.defaultRenderProviderSecondarySalesBPS.toString()
      );
      // project platform provider royalties should equal contract-level values for pre-v3.2 Engine core
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "enginePlatformProviderSecondarySalesAddress",
        TEST_CONTRACT.defaultEnginePlatformProviderSecondarySalesAddress.toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "enginePlatformProviderSecondarySalesBPS",
        TEST_CONTRACT.defaultEnginePlatformProviderSecondarySalesBPS.toString()
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
