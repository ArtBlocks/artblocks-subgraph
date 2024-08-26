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
  ROYALTY_SPLITTER_ENTITY_TYPE,
  ROYALTY_SPLIT_RECIPIENT_TYPE,
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
  WHITELISTING_ENTITY_TYPE,
  TEST_ARTIST_ADDRESS
} from "../shared-helpers";
import {
  mockProjectScriptDetailsCall,
  mockProjectStateDataCall,
  testProjectDetailsUpdated,
  testProjectScriptDetailsUpdated,
  testProjectStateDataUpdated,
  mockRefreshContractCalls,
  mockProjectFinance
} from "./helpers";
import { Contract, Project } from "../../../generated/schema";
import {
  Mint,
  ProjectUpdated,
  PlatformUpdated,
  ProjectRoyaltySplitterUpdated
} from "../../../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_Base";
import { Transfer } from "../../../generated/IERC721GenArt721CoreV3Contract/IERC721";
import { OwnershipTransferred } from "../../../generated/OwnableGenArt721CoreV3Contract/Ownable";
import { SuperAdminTransferred } from "../../../generated/AdminACLV0/IAdminACLV0";
import {
  FIELD_PROJECT_ACTIVE,
  ENUM_FIELD_PROJECT_ACTIVE,
  ENUM_FIELD_PROJECT_ARTIST_ADDRESS,
  FIELD_PROJECT_ARTIST_NAME,
  FIELD_PROJECT_ASPECT_RATIO,
  ENUM_FIELD_PROJECT_BASE_URI,
  ENUM_FIELD_PROJECT_COMPLETED,
  ENUM_FIELD_PROJECT_CREATED,
  FIELD_PROJECT_DESCRIPTION,
  FIELD_PROJECT_LICENSE,
  FIELD_PROJECT_MAX_INVOCATIONS,
  FIELD_PROJECT_NAME,
  FIELD_PROJECT_PAUSED,
  ENUM_FIELD_PROJECT_SCRIPT,
  FIELD_PROJECT_SCRIPT_TYPE,
  ENUM_FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE,
  FIELD_PROJECT_WEBSITE,
  ENUM_FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS,
  handleIAdminACLV0SuperAdminTransferred,
  handleMint,
  handleTransfer,
  handlePlatformUpdated,
  handleOwnershipTransferred,
  handleProjectUpdated,
  handleProjectRoyaltySplitterUpdated
} from "../../../src/mapping-v3-core";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

const coreType = "GenArt721CoreV3_Engine";
const coreVersion = "v3.2.0"; // test v3.2 contract handling
const SPLIT_PROVIDER_ADDRESS = randomAddressGenerator.generateRandomAddress();
// override mock core version
const mockCoreContractOverrides = new Map<string, string>();
mockCoreContractOverrides.set("coreVersion", coreVersion);
mockCoreContractOverrides.set(
  "splitProvider",
  SPLIT_PROVIDER_ADDRESS.toHexString()
);

test(`${coreType}-${coreVersion}: Can handle Mint`, () => {
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

test(`${coreType}-${coreVersion}: Can handle transfer`, () => {
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

test(`${coreType}-${coreVersion}: Handles OwnershipTransferred to new address and zero address, when Contract not in store`, () => {
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
    mockRefreshContractCalls(projectId, coreType, mockCoreContractOverrides);
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

test(`${coreType}-${coreVersion}: Handles OwnershipTransferred to new address and zero address, when already in store`, () => {
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
    mockRefreshContractCalls(projectId, coreType, mockCoreContractOverrides);
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

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::nextProjectId`, () => {
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < 2; i++) {
    clearStore();
    // add new contract to store
    const projectId = BigInt.fromI32(i);
    addTestContractToStore(projectId);
    mockRefreshContractCalls(
      BigInt.fromI32(i),
      coreType,
      mockCoreContractOverrides
    );

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

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::newProjectsForbidden - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "newProjectsForbidden",
    false.toString()
  );
});

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::newProjectsForbidden - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

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

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::nextProjectId`, () => {
  // test for nextProjectId of 0 and 1
  for (let i = 0; i < 2; i++) {
    clearStore();
    // add new contract to store
    const projectId = BigInt.fromI32(i);
    addTestContractToStore(projectId);
    mockRefreshContractCalls(
      BigInt.fromI32(i),
      coreType,
      mockCoreContractOverrides
    );

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

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::artblocksPrimarySalesAddress - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    TEST_CONTRACT.renderProviderAddress.toHexString()
  );
});

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::providerSalesAddresses - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStoreOfTypeAndVersion(projectId, coreType, coreVersion);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // update mock function return values
  const newRenderProviderPrimarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "renderProviderPrimarySalesAddress",
    "renderProviderPrimarySalesAddress():(address)"
  ).returns([ethereum.Value.fromAddress(newRenderProviderPrimarySalesAddress)]);

  const newRenderProviderSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
  // @dev v3.2 does not have function `renderProviderSecondarySalesAddress()`
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "defaultRenderProviderSecondarySalesAddress",
    "defaultRenderProviderSecondarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newRenderProviderSecondarySalesAddress)
  ]);

  const newPlatformProviderPrimarySalesAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "platformProviderPrimarySalesAddress",
    "platformProviderPrimarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newPlatformProviderPrimarySalesAddress)
  ]);

  const newPlatformProviderSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
  // @dev v3.2 does not have function `platformProviderSecondarySalesAddress()`
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "defaultPlatformProviderSecondarySalesAddress",
    "defaultPlatformProviderSecondarySalesAddress():(address)"
  ).returns([
    ethereum.Value.fromAddress(newPlatformProviderSecondarySalesAddress)
  ]);

  // also mock secondary BPS values
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "defaultRenderProviderSecondarySalesBPS",
    "defaultRenderProviderSecondarySalesBPS():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(
      TEST_CONTRACT.defaultRenderProviderSecondarySalesBPS
    )
  ]);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "defaultPlatformProviderSecondarySalesBPS",
    "defaultPlatformProviderSecondarySalesBPS():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(
      TEST_CONTRACT.defaultEnginePlatformProviderSecondarySalesBPS
    )
  ]);

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
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultEnginePlatformProviderSecondarySalesAddress",
    newPlatformProviderSecondarySalesAddress.toHexString()
  );
});

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::providerPrimaryPercentages - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // default value should be test contract value
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultRenderProviderSecondarySalesAddress",
    TEST_CONTRACT.defaultRenderProviderSecondarySalesAddress.toHexString()
  );
});

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::randomizerAddress - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "randomizerContract",
    TEST_CONTRACT.randomizerContract.toHexString()
  );
});

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::randomizerAddress - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

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

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::curationRegistryAddress - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // default value should be nothing
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "curationRegistry",
    TEST_CONTRACT.curationRegistry.toHexString()
  );
});

test(`${coreType}-${coreVersion}: Null curationRegistryAddress on Engine contract`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

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

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::dependencyRegistryAddress - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "dependencyRegistry",
    TEST_CONTRACT.dependencyRegistry.toHexString()
  );
});

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::dependencyRegistryAddress - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

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

test(`${coreType}: populates royaltySplitProvider on contract refresh for v3.2`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // create event
  const event: PlatformUpdated = changetype<PlatformUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_field",
      ethereum.Value.fromBytes(
        Bytes.fromUTF8("ENUM_FIELD_SPLIT_PROVIDER_BUT_ARBITRARY_FOR_HANDLER")
      )
    )
  ];
  // handle event
  handlePlatformUpdated(event);

  // value should be non-null v3.2+
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "royaltySplitProvider",
    SPLIT_PROVIDER_ADDRESS.toHexString()
  );
});

test(`${coreType}-${coreVersion}: Populated autoApproveAtistSplitProposals on Engine contract`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

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

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::providerPrimaryPercentages - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // default value should be false
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderPercentage",
    TEST_CONTRACT.renderProviderPercentage.toString()
  );
});

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::providerPrimaryPercentages - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

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

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::providerSecondaryBPS - default value`, () => {
  // default value is false
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // default value should be test contract default value
  // @dev v3.2 does not have function `renderProviderSecondarySalesBPS()`
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "defaultRenderProviderSecondarySalesBPS",
    TEST_CONTRACT.defaultRenderProviderSecondarySalesBPS.toString()
  );
});

test(`${coreType}-${coreVersion}: Handles PlatformUpdated::providerSecondaryBPS - changed value`, () => {
  clearStore();
  // add new contract to store
  const projectId = BigInt.fromI32(0);
  addTestContractToStore(projectId);
  mockRefreshContractCalls(
    BigInt.fromI32(0),
    coreType,
    mockCoreContractOverrides
  );

  // update mock function return values
  const newRenderProviderSecondarySalesBPS = BigInt.fromI32(250);
  // @dev v3.2 does not have function `renderProviderSecondarySalesBPS()`
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "defaultRenderProviderSecondarySalesBPS",
    "defaultRenderProviderSecondarySalesBPS():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(newRenderProviderSecondarySalesBPS)
  ]);

  const newPlatformProviderSecondarySalesBPS = BigInt.fromI32(200);
  // @dev v3.2 does not have function `platformProviderSecondarySalesBPS()`
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "defaultPlatformProviderSecondarySalesBPS",
    "defaultPlatformProviderSecondarySalesBPS():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(newPlatformProviderSecondarySalesBPS)
  ]);

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

describe(`${coreType}-${coreVersion}: handleIAdminACLV0SuperAdminTransferred`, () => {
  test("should update core when super admin is transferred", () => {
    clearStore();
    // add new contract to store
    const projectId = BigInt.fromI32(0);
    addTestContractToStore(projectId);
    mockRefreshContractCalls(
      BigInt.fromI32(0),
      coreType,
      mockCoreContractOverrides
    );
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

test("event enums are defined correctly", () => {
  assert.stringEquals(
    ENUM_FIELD_PROJECT_CREATED.toHexString(),
    "0x0000000000000000000000000000000000000000000000000000000000000004"
  );
});

describe(`${coreType}-${coreVersion}: handleProjectUpdated`, () => {
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_CREATED)
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
      const newBaseUri = "New Base URI";

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_CREATED)
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

      // // mock projectURIInfo
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectURIInfo",
        "projectURIInfo(uint256):(string)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromString(newBaseUri)]);

      handleProjectUpdated(event);

      assert.notInStore(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId)
      );
    });

    test("should create a project entity", () => {
      const projectId = BigInt.fromI32(0);
      const artistAddress = TEST_ARTIST_ADDRESS;
      const projectName = "Test Project";
      const invocations = BigInt.fromI32(0);
      const maxInvocations = BigInt.fromI32(ONE_MILLION);
      const paused = true;
      const scriptCount = BigInt.fromI32(0);
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_CREATED)
        )
      ];

      // mock all refresh contract calls to ensure the required contract-level royalty functions are mocked
      mockRefreshContractCalls(projectId, coreType, mockCoreContractOverrides);

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
      // mock projectIdToSecondaryMarketRoyaltyPercentage, return 5
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToSecondaryMarketRoyaltyPercentage",
        "projectIdToSecondaryMarketRoyaltyPercentage(uint256):(uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromI32(5)]);

      mockProjectFinance(
        projectId,
        BigInt.fromI32(0),
        BigInt.fromI32(0),
        BigInt.fromI32(0)
      );

      // // mock projectURIInfo
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectURIInfo",
        "projectURIInfo(uint256):(string)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromString(newBaseUri)]);

      handleProjectUpdated(event);

      const createdProject = Project.load(
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId)
      );

      if (!createdProject) {
        throw new Error("Project entity not created");
      }

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

      // No currencyAddress or currencySymbol on project for v3 and up
      assert.assertNull(createdProject.currencySymbol);
      // Excuse the funky test here, matchstick was barfing on a null check
      assert.assertTrue(
        (createdProject.currencyAddress
          ? (createdProject.currencyAddress as Address).toHexString()
          : "") === ""
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
      // default royalty upon project creation is non-zero for v3.2 Engine core
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "royaltyPercentage",
        "5"
      );
      // project render provider royalties should equal contract-level values for v3.2 Engine core
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_ACTIVE)
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_ARTIST_ADDRESS)
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_BASE_URI)
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_COMPLETED)
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_SCRIPT)
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_SCRIPT)
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_SCRIPT)
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
          ethereum.Value.fromBytes(ENUM_FIELD_PROJECT_SCRIPT)
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
            ENUM_FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE
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

    test("should update project provider secondary financials", () => {
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
          ethereum.Value.fromBytes(
            ENUM_FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS
          )
        )
      ];

      // mock all refresh contract calls to ensure the required contract-level royalty functions are mocked
      mockRefreshContractCalls(projectId, coreType, mockCoreContractOverrides);

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
      // mock projectIdToSecondaryMarketRoyaltyPercentage, return 5
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToSecondaryMarketRoyaltyPercentage",
        "projectIdToSecondaryMarketRoyaltyPercentage(uint256):(uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromI32(5)]);

      // mock projectIdToFinancials, used on v3.2 Engine core in handler
      const localDefaultRenderProviderSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
      const localDefaultRenderProviderSecondarySalesBPS = BigInt.fromI32(4);
      const localDefaultEnginePlatformProviderSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
      const localDefaultEnginePlatformProviderSecondarySalesBPS = BigInt.fromI32(
        6
      );
      // return is a struct, which solidity returns as a tuple
      let tupleArray: Array<ethereum.Value> = [
        ethereum.Value.fromAddress(Address.zero()), // additional payee primary sales (unused in this test)
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)), // secondary market royalty percentage (unused in this test)
        ethereum.Value.fromAddress(Address.zero()), // additional payee secondary sales (unused in this test)
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)), // additional payee secondary sales percentage (unused in this test)
        ethereum.Value.fromAddress(Address.zero()), // artist address (unused in this test)
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)), // additionalPayeePrimarySalesPercentage (unused in this test)
        ethereum.Value.fromAddress(
          localDefaultEnginePlatformProviderSecondarySalesAddress
        ),
        ethereum.Value.fromUnsignedBigInt(
          localDefaultEnginePlatformProviderSecondarySalesBPS
        ),
        ethereum.Value.fromAddress(
          localDefaultRenderProviderSecondarySalesAddress
        ),
        ethereum.Value.fromUnsignedBigInt(
          localDefaultRenderProviderSecondarySalesBPS
        ),
        ethereum.Value.fromAddress(Address.zero()) // royalty splitter (unused in this test)
      ];
      let tuple: ethereum.Tuple = changetype<ethereum.Tuple>(tupleArray);

      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToFinancials",
        "projectIdToFinancials(uint256):((address,uint8,address,uint8,address,uint8,address,uint16,address,uint16,address))"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromTuple(tuple)]);

      handleProjectUpdated(event);

      // Project fields
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
      // project render provider royalties should equal contract-level values for v3.2 Engine core
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "renderProviderSecondarySalesAddress",
        localDefaultRenderProviderSecondarySalesAddress.toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "renderProviderSecondarySalesBPS",
        localDefaultRenderProviderSecondarySalesBPS.toString()
      );
      // project platform provider royalties should equal contract-level values for pre-v3.2 Engine core
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "enginePlatformProviderSecondarySalesAddress",
        localDefaultEnginePlatformProviderSecondarySalesAddress.toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "enginePlatformProviderSecondarySalesBPS",
        localDefaultEnginePlatformProviderSecondarySalesBPS.toString()
      );
    });
  });

  describe("ProjectRoyaltySplitterUpdated", () => {
    test("should update royalty splitter", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );
      addTestContractToStore(projectId.plus(BigInt.fromI32(1)));
      // for v3.2, always have a populated royaltySplitProvider field
      const contractInStore = Contract.load(
        TEST_CONTRACT_ADDRESS.toHexString()
      );
      if (!contractInStore) {
        throw new Error("Contract not found in store");
      }
      contractInStore.royaltySplitProvider = randomAddressGenerator.generateRandomAddress();
      contractInStore.save();
      mockRefreshContractCalls(
        BigInt.fromI32(0),
        coreType,
        mockCoreContractOverrides
      );
      addNewProjectToStore(
        TEST_CONTRACT_ADDRESS,
        projectId,
        "Test Project",
        randomAddressGenerator.generateRandomAddress(),
        BigInt.zero(),
        CURRENT_BLOCK_TIMESTAMP
      );
      // create ProjectRoyaltySplitterUpdated event
      const event: ProjectRoyaltySplitterUpdated = changetype<
        ProjectRoyaltySplitterUpdated
      >(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      const newTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(1));
      event.block.timestamp = newTimestamp;
      const newRoyaltySplitter = randomAddressGenerator.generateRandomAddress();
      event.parameters = [
        new ethereum.EventParam(
          "projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "royaltySplitter",
          ethereum.Value.fromAddress(newRoyaltySplitter)
        )
      ];
      // mock project finance call
      mockProjectFinance(
        projectId,
        BigInt.fromI32(5),
        BigInt.fromI32(0),
        BigInt.fromI32(0)
      );

      // call handleProjectRoyaltySplitterUpdated
      handleProjectRoyaltySplitterUpdated(event);

      // assert Project entity updated
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        newTimestamp.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "erc2981SplitterAddress",
        newRoyaltySplitter.toHexString()
      );
      // assert royalty splitter in store
      assert.fieldEquals(
        ROYALTY_SPLITTER_ENTITY_TYPE,
        newRoyaltySplitter.toHexString(),
        "id",
        newRoyaltySplitter.toHexString()
      );
      assert.fieldEquals(
        ROYALTY_SPLITTER_ENTITY_TYPE,
        newRoyaltySplitter.toHexString(),
        "splitProviderCreator",
        (contractInStore.royaltySplitProvider as Bytes).toHexString()
      );
      assert.fieldEquals(
        ROYALTY_SPLITTER_ENTITY_TYPE,
        newRoyaltySplitter.toHexString(),
        "coreContract",
        TEST_CONTRACT_ADDRESS.toHexString()
      );
      assert.fieldEquals(
        ROYALTY_SPLITTER_ENTITY_TYPE,
        newRoyaltySplitter.toHexString(),
        "totalAllocation",
        "1050" // total 10.5% = 5% artist + 3.0% platform + 2.5% render provider
      );
      assert.fieldEquals(
        ROYALTY_SPLITTER_ENTITY_TYPE,
        newRoyaltySplitter.toHexString(),
        "createdAt",
        newTimestamp.toString()
      );
      // assert new split recipients in store
      assert.fieldEquals(
        ROYALTY_SPLIT_RECIPIENT_TYPE,
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_ARTIST_ADDRESS.toHexString(),
        "id",
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_ARTIST_ADDRESS.toHexString()
      );
      assert.fieldEquals(
        ROYALTY_SPLIT_RECIPIENT_TYPE,
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_ARTIST_ADDRESS.toHexString(),
        "royaltySplitterContract",
        newRoyaltySplitter.toHexString()
      );
      assert.fieldEquals(
        ROYALTY_SPLIT_RECIPIENT_TYPE,
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_ARTIST_ADDRESS.toHexString(),
        "recipientAddress",
        TEST_ARTIST_ADDRESS.toHexString()
      );
      assert.fieldEquals(
        ROYALTY_SPLIT_RECIPIENT_TYPE,
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_ARTIST_ADDRESS.toHexString(),
        "allocation",
        "500"
      );
      // only check existence and allocation of platform and render provider recipients
      assert.fieldEquals(
        ROYALTY_SPLIT_RECIPIENT_TYPE,
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_CONTRACT.defaultRenderProviderSecondarySalesAddress.toHexString(),
        "id",
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_CONTRACT.defaultRenderProviderSecondarySalesAddress.toHexString()
      );
      assert.fieldEquals(
        ROYALTY_SPLIT_RECIPIENT_TYPE,
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_CONTRACT.defaultRenderProviderSecondarySalesAddress.toHexString(),
        "allocation",
        "250"
      );
      assert.fieldEquals(
        ROYALTY_SPLIT_RECIPIENT_TYPE,
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_CONTRACT.defaultEnginePlatformProviderSecondarySalesAddress.toHexString(),
        "id",
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_CONTRACT.defaultEnginePlatformProviderSecondarySalesAddress.toHexString()
      );
      assert.fieldEquals(
        ROYALTY_SPLIT_RECIPIENT_TYPE,
        newRoyaltySplitter.toHexString() +
          "-" +
          TEST_CONTRACT.defaultEnginePlatformProviderSecondarySalesAddress.toHexString(),
        "allocation",
        "300"
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
