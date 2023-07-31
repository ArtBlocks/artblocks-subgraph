import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  clearStore,
  test,
  newMockEvent,
  createMockedFunction,
  logStore
} from "matchstick-as/assembly/index";
// IsCanonicalMinterFilter only emitted by MinterFilterV0
import { IsCanonicalMinterFilter } from "../../../generated/MinterFilterV0/MinterFilterV0";
// IMinterFilterV0 is the interface for MinterFilterV0 and MinterFilterV1
import {
  Deployed,
  MinterApproved,
  MinterRevoked,
  ProjectMinterRegistered,
  ProjectMinterRemoved
} from "../../../generated/MinterFilterV0/IMinterFilterV0";
import {
  Minter,
  MinterFilter,
  Project,
  ProjectMinterConfiguration
} from "../../../generated/schema";
import { getProjectMinterConfigId } from "../../../src/helpers";
import {
  handleDeployed,
  handleIsCanonicalMinterFilter,
  handleMinterApproved,
  handleMinterRevoked,
  handleProjectMinterRegistered,
  handleProjectMinterRemoved
} from "../../../src/legacy-minter-filter-mapping";
import {
  addNewMinterToStore,
  addNewLegacyProjectMinterConfigToStore,
  addNewProjectToStore,
  addTestContractToStore,
  booleanToString,
  CONTRACT_ENTITY_TYPE,
  CURRENT_BLOCK_TIMESTAMP,
  MINTER_ENTITY_TYPE,
  MINTER_FILTER_ENTITY_TYPE,
  ONE_ETH_IN_WEI,
  PROJECT_ENTITY_TYPE,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  RandomAddressGenerator,
  TEST_CONTRACT_ADDRESS,
  assertJsonFieldEquals,
  getJSONStringFromEntries
} from "../shared-helpers";
import {
  mockCoreContract,
  mockGetPriceInfo,
  mockGetProjectAndMinterInfoAt,
  mockMinterFilterAddress,
  mockMinterType,
  mockDAExpHalfLifeMinMax,
  mockDALinMinAuctionLength,
  mockPurchaseToDisabled,
  DAExpMintersToTest,
  DALinMintersToTest
} from "./helpers";
import { toJSONValue } from "../../../src/json";

const randomAddressGenerator = new RandomAddressGenerator();

test("handleDeployed should add V0 MinterFilter to the store", () => {
  clearStore();
  addTestContractToStore(BigInt.fromI32(0));

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const deployedEvent: Deployed = changetype<Deployed>(newMockEvent());
  deployedEvent.address = minterFilterAddress;
  deployedEvent.parameters = [];
  deployedEvent.block.timestamp = updateCallBlockTimestamp;

  // mock function called when adding a new minter
  createMockedFunction(
    minterFilterAddress,
    "genArt721CoreAddress",
    "genArt721CoreAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)]);

  // MinterFilterV0 does not have this function and should revert.
  // In this case we assume the type is MinterFilterV0
  createMockedFunction(
    minterFilterAddress,
    "minterFilterType",
    "minterFilterType():(string)"
  ).reverts();

  assert.notInStore(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString()
  );

  handleDeployed(deployedEvent);

  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "id",
    minterFilterAddress.toHexString()
  );
  const coreRegistryId = TEST_CONTRACT_ADDRESS.toHexString();
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "coreRegistry",
    coreRegistryId
  );
  // core contract doesn't update its registeredOn field when a minter filter is deployed,
  // it only updates it when it updates its minter filter
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "registeredOn",
    "null"
  );

  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "type",
    "MinterFilterV0"
  );

  clearStore();
});

test("handleIsCanonicalMinterFilter should do nothing if the core contract for the minter filter emitting the event has not been indexed", () => {
  clearStore();
  const coreContractAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();

  const isCanoncialMinterFilterEvent: IsCanonicalMinterFilter = changetype<
    IsCanonicalMinterFilter
  >(newMockEvent());
  isCanoncialMinterFilterEvent.address = minterFilterAddress;
  isCanoncialMinterFilterEvent.parameters = [
    new ethereum.EventParam(
      "_coreContractAddress",
      ethereum.Value.fromAddress(coreContractAddress)
    )
  ];

  assert.notInStore(CONTRACT_ENTITY_TYPE, coreContractAddress.toHexString());

  handleIsCanonicalMinterFilter(isCanoncialMinterFilterEvent);

  assert.notInStore(CONTRACT_ENTITY_TYPE, coreContractAddress.toHexString());
  assert.notInStore(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString()
  );

  clearStore();
});

test("handleIsCanonicalMinterFilter should create a minter filter and associate it with the minter filter's core contract", () => {
  addTestContractToStore(BigInt.fromI32(0));

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const isCanoncialMinterFilterEvent: IsCanonicalMinterFilter = changetype<
    IsCanonicalMinterFilter
  >(newMockEvent());
  isCanoncialMinterFilterEvent.address = minterFilterAddress;
  isCanoncialMinterFilterEvent.parameters = [
    new ethereum.EventParam(
      "_coreContractAddress",
      ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
    )
  ];
  isCanoncialMinterFilterEvent.block.timestamp = updateCallBlockTimestamp;

  createMockedFunction(
    minterFilterAddress,
    "getNumProjectsWithMinters",
    "getNumProjectsWithMinters():(uint256)"
  ).returns([ethereum.Value.fromI32(0)]);

  handleIsCanonicalMinterFilter(isCanoncialMinterFilterEvent);

  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "id",
    minterFilterAddress.toHexString()
  );
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
  const coreRegistryId = TEST_CONTRACT_ADDRESS.toHexString();
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "coreRegistry",
    coreRegistryId
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "registeredOn",
    coreRegistryId
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "minterFilter",
    minterFilterAddress.toHexString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("handleIsCanonicalMinterFilter should populate project minter configurations for all projects preconfigured on the minter filter", () => {
  clearStore();
  addTestContractToStore(BigInt.fromI32(2));

  const project0 = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(0),
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI64(i64(1e18)),
    CURRENT_BLOCK_TIMESTAMP
  );

  const project1 = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(1),
    "project 1",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI64(i64(1e18)),
    CURRENT_BLOCK_TIMESTAMP
  );

  const project2 = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(2),
    "project 2",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI64(i64(1e18)),
    CURRENT_BLOCK_TIMESTAMP
  );

  const project3 = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(3),
    "project 3",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI64(i64(1e18)),
    CURRENT_BLOCK_TIMESTAMP
  );

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterSetPriceV0Address = randomAddressGenerator.generateRandomAddress();
  const minterSetPriceERC20V0Address = randomAddressGenerator.generateRandomAddress();
  const minterDALinV0Address = randomAddressGenerator.generateRandomAddress();
  const minterDAExpV0Address = randomAddressGenerator.generateRandomAddress();
  const isCanoncialMinterFilterEvent: IsCanonicalMinterFilter = changetype<
    IsCanonicalMinterFilter
  >(newMockEvent());
  isCanoncialMinterFilterEvent.address = minterFilterAddress;
  isCanoncialMinterFilterEvent.parameters = [
    new ethereum.EventParam(
      "_coreContractAddress",
      ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
    )
  ];
  isCanoncialMinterFilterEvent.block.timestamp = updateCallBlockTimestamp;

  createMockedFunction(
    minterFilterAddress,
    "getNumProjectsWithMinters",
    "getNumProjectsWithMinters():(uint256)"
  ).returns([ethereum.Value.fromI32(4)]);

  // Mocks for project 0
  const project0PriceIsConfigured = false;
  const project0BasePrice = BigInt.fromI32(0);
  const project0CurrencySymbol = "ETH";
  const project0CurrencyAddress = Address.zero();
  const project0PurchaseToDisabled = true;
  const project0MinterType = "MinterSetPriceV0";

  const previousMinterConfig0 = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterSetPriceV0Address.toHexString(), project0.id)
  );
  previousMinterConfig0.minter = minterSetPriceV0Address.toHexString();
  previousMinterConfig0.project = project0.id;
  previousMinterConfig0.basePrice = project0BasePrice;
  previousMinterConfig0.priceIsConfigured = project0PriceIsConfigured;
  previousMinterConfig0.currencyAddress = project0CurrencyAddress;
  previousMinterConfig0.currencySymbol = project0CurrencySymbol;
  previousMinterConfig0.purchaseToDisabled = project0PurchaseToDisabled;
  previousMinterConfig0.extraMinterDetails = "{}";

  previousMinterConfig0.save();

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(0),
    project0.projectId,
    minterSetPriceV0Address,
    project0MinterType
  );

  mockMinterType(minterSetPriceV0Address, project0MinterType);
  mockMinterFilterAddress(minterSetPriceV0Address, minterFilterAddress);
  mockCoreContract(minterSetPriceV0Address, TEST_CONTRACT_ADDRESS);

  // Mocks for project 1
  const project1PriceIsConfigured = true;
  const project1BasePrice = BigInt.fromI64(i64(1e18));
  const project1CurrencySymbol = "DAI";
  const project1CurrencyAddress = randomAddressGenerator.generateRandomAddress();
  const project1PurchaseToDisabled = false;
  const project1MinterType = "MinterSetPriceERC20V0";

  const previousMinterConfig1 = new ProjectMinterConfiguration(
    getProjectMinterConfigId(
      minterSetPriceERC20V0Address.toHexString(),
      project1.id
    )
  );
  previousMinterConfig1.minter = minterSetPriceERC20V0Address.toHexString();
  previousMinterConfig1.project = project1.id;
  previousMinterConfig1.basePrice = project1BasePrice;
  previousMinterConfig1.priceIsConfigured = project1PriceIsConfigured;
  previousMinterConfig1.currencyAddress = project1CurrencyAddress;
  previousMinterConfig1.currencySymbol = project1CurrencySymbol;
  previousMinterConfig1.purchaseToDisabled = project1PurchaseToDisabled;
  previousMinterConfig1.extraMinterDetails = "{}";

  previousMinterConfig1.save();

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(1),
    project1.projectId,
    minterSetPriceERC20V0Address,
    project1MinterType
  );

  mockMinterType(minterSetPriceERC20V0Address, project1MinterType);
  mockMinterFilterAddress(minterSetPriceERC20V0Address, minterFilterAddress);
  mockCoreContract(minterSetPriceERC20V0Address, TEST_CONTRACT_ADDRESS);

  // Mocks for project 2
  const project2PriceIsConfigured = true;
  const project2CurrencySymbol = "ETH";
  const project2CurrencyAddress = Address.zero();
  const project2PurchaseToDisabled = false;
  const project2StartTime = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(100));
  const project2EndTime = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(3700));
  const project2StartPrice = ONE_ETH_IN_WEI;
  const project2BasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(5));
  const project2MinterType = "MinterDALinV0";

  const previousMinterConfig2 = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterDALinV0Address.toHexString(), project2.id)
  );
  previousMinterConfig2.minter = minterDALinV0Address.toHexString();
  previousMinterConfig2.project = project2.id;
  previousMinterConfig2.basePrice = project2BasePrice;
  previousMinterConfig2.priceIsConfigured = project2PriceIsConfigured;
  previousMinterConfig2.currencyAddress = project2CurrencyAddress;
  previousMinterConfig2.currencySymbol = project2CurrencySymbol;
  previousMinterConfig2.purchaseToDisabled = project2PurchaseToDisabled;
  previousMinterConfig2.extraMinterDetails = getJSONStringFromEntries([
    { key: "startTime", value: toJSONValue(project2StartTime) },
    { key: "endTime", value: toJSONValue(project2EndTime) },
    { key: "startPrice", value: toJSONValue(project2StartPrice.toString()) }
  ]);
  previousMinterConfig2.save();

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(2),
    project2.projectId,
    minterDALinV0Address,
    project2MinterType
  );

  mockMinterType(minterDALinV0Address, project2MinterType);
  mockMinterFilterAddress(minterDALinV0Address, minterFilterAddress);
  mockCoreContract(minterDALinV0Address, TEST_CONTRACT_ADDRESS);
  createMockedFunction(
    minterDALinV0Address,
    "minimumAuctionLengthSeconds",
    "minimumAuctionLengthSeconds():(uint256)"
  ).returns([ethereum.Value.fromI32(3600)]);

  // Mocks for project 3
  const project3PriceIsConfigured = true;
  const project3CurrencySymbol = "ETH";
  const project3CurrencyAddress = Address.zero();
  const project3PurchaseToDisabled = false;
  const project3StartTime = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(100));
  const project3HalfLifeSeconds = BigInt.fromI32(500);
  const project3StartPrice = ONE_ETH_IN_WEI.times(BigInt.fromI32(2));
  const project3BasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  const project3Mintertype = "MinterDAExpV0";

  const previousMinterConfig3 = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterDAExpV0Address.toHexString(), project3.id)
  );
  previousMinterConfig3.minter = minterDAExpV0Address.toHexString();
  previousMinterConfig3.project = project3.id;
  previousMinterConfig3.basePrice = project3BasePrice;
  previousMinterConfig3.priceIsConfigured = project3PriceIsConfigured;
  previousMinterConfig3.currencyAddress = project3CurrencyAddress;
  previousMinterConfig3.currencySymbol = project3CurrencySymbol;
  previousMinterConfig3.purchaseToDisabled = project3PurchaseToDisabled;
  previousMinterConfig3.extraMinterDetails = getJSONStringFromEntries([
    { key: "halfLifeSeconds", value: toJSONValue(project3HalfLifeSeconds) },
    { key: "startTime", value: toJSONValue(project3StartTime) },
    { key: "startPrice", value: toJSONValue(project3StartPrice.toString()) }
  ]);
  previousMinterConfig3.save();

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(3),
    project3.projectId,
    minterDAExpV0Address,
    project3Mintertype
  );

  mockMinterType(minterDAExpV0Address, project3Mintertype);
  mockMinterFilterAddress(minterDAExpV0Address, minterFilterAddress);
  mockCoreContract(minterDAExpV0Address, TEST_CONTRACT_ADDRESS);
  createMockedFunction(
    minterDAExpV0Address,
    "minimumPriceDecayHalfLifeSeconds",
    "minimumPriceDecayHalfLifeSeconds():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(300))]);
  createMockedFunction(
    minterDAExpV0Address,
    "maximumPriceDecayHalfLifeSeconds",
    "maximumPriceDecayHalfLifeSeconds():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000))]);

  handleIsCanonicalMinterFilter(isCanoncialMinterFilterEvent);

  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "id",
    minterFilterAddress.toHexString()
  );
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
  const coreRegistryId = TEST_CONTRACT_ADDRESS.toHexString();
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "coreRegistry",
    coreRegistryId
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "registeredOn",
    coreRegistryId
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "minterFilter",
    minterFilterAddress.toHexString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );

  // Project 0 asserts

  let configId = getProjectMinterConfigId(
    minterSetPriceV0Address.toHexString(),
    project0.id
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project0.id,
    "minterConfiguration",
    configId
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "project",
    project0.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "minter",
    minterSetPriceV0Address.toHexString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterSetPriceV0Address.toHexString(),
    "type",
    project0MinterType
  );

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "priceIsConfigured",
    booleanToString(project0PriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "basePrice",
    project0BasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "currencySymbol",
    project0CurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "currencyAddress",
    project0CurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "purchaseToDisabled",
    booleanToString(project0PurchaseToDisabled)
  );

  // Project 1 asserts
  let configId1 = getProjectMinterConfigId(
    minterSetPriceERC20V0Address.toHexString(),
    project1.id
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project1.id,
    "minterConfiguration",
    configId1
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId1,
    "project",
    project1.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId1,
    "minter",
    minterSetPriceERC20V0Address.toHexString()
  );

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterSetPriceERC20V0Address.toHexString(),
    "type",
    project1MinterType
  );

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId1,
    "priceIsConfigured",
    booleanToString(project1PriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId1,
    "basePrice",
    project1BasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId1,
    "currencySymbol",
    project1CurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId1,
    "currencyAddress",
    project1CurrencyAddress.toHexString()
  );

  //project 2 asserts

  let configId2 = getProjectMinterConfigId(
    minterDALinV0Address.toHexString(),
    project2.id
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project2.id,
    "minterConfiguration",
    configId2
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "project",
    project2.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "minter",
    minterDALinV0Address.toHexString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterDALinV0Address.toHexString(),
    "type",
    project2MinterType
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "priceIsConfigured",
    booleanToString(project2PriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "basePrice",
    project2BasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "currencySymbol",
    project2CurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "currencyAddress",
    project2CurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "purchaseToDisabled",
    booleanToString(project2PurchaseToDisabled)
  );

  // assert expected updates to extraMinterDetails
  let updatedProjectMinterConfig2 = ProjectMinterConfiguration.load(configId2);
  if (updatedProjectMinterConfig2 == null) {
    throw new Error("project minter config should not be null");
  }
  assertJsonFieldEquals(
    updatedProjectMinterConfig2.extraMinterDetails,
    "startTime",
    project2StartTime
  );
  assertJsonFieldEquals(
    updatedProjectMinterConfig2.extraMinterDetails,
    "endTime",
    project2EndTime
  );
  assertJsonFieldEquals(
    updatedProjectMinterConfig2.extraMinterDetails,
    "startPrice",
    project2StartPrice.toString()
  );

  // Project 3 asserts

  let configId3 = getProjectMinterConfigId(
    minterDAExpV0Address.toHexString(),
    project3.id.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project3.id,
    "minterConfiguration",
    configId3
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "project",
    project3.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "minter",
    minterDAExpV0Address.toHexString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterDAExpV0Address.toHexString(),
    "type",
    project3Mintertype
  );

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "priceIsConfigured",
    booleanToString(project3PriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "basePrice",
    project3BasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "currencySymbol",
    project3CurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "currencyAddress",
    project3CurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "purchaseToDisabled",
    booleanToString(project3PurchaseToDisabled)
  );
  // assert expected updates to extraMinterDetails
  let updatedProjectMinterConfig3 = ProjectMinterConfiguration.load(configId3);
  if (updatedProjectMinterConfig3 == null) {
    throw new Error("project minter config should not be null");
  }
  assertJsonFieldEquals(
    updatedProjectMinterConfig3.extraMinterDetails,
    "startTime",
    project3StartTime
  );
  assertJsonFieldEquals(
    updatedProjectMinterConfig3.extraMinterDetails,
    "halfLifeSeconds",
    project3HalfLifeSeconds
  );
  assertJsonFieldEquals(
    updatedProjectMinterConfig3.extraMinterDetails,
    "startPrice",
    project3StartPrice.toString()
  );
});

test("handleMinterApproved should not add minter to minterGlobalAllowlist if the approved minter has a different minter filter", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const otherMinterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterToBeApprovedAddress = randomAddressGenerator.generateRandomAddress();
  mockMinterType(minterToBeApprovedAddress, "MinterSetPriceV0");
  mockMinterFilterAddress(minterToBeApprovedAddress, otherMinterFilterAddress);
  mockCoreContract(minterToBeApprovedAddress, TEST_CONTRACT_ADDRESS);

  assert.assertTrue(
    otherMinterFilterAddress.toHexString() != minterFilterAddress.toHexString()
  );

  const minterApprovedEvent: MinterApproved = changetype<MinterApproved>(
    newMockEvent()
  );
  minterApprovedEvent.address = minterFilterAddress;
  minterApprovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  minterApprovedEvent.parameters = [
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterToBeApprovedAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString("MinterSetPriceV0")
    )
  ];

  handleMinterApproved(minterApprovedEvent);

  // MinterFilter minterGlobalAllowlist should still be empty array
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "minterGlobalAllowlist",
    "[]"
  );
  // MinterFilter should not have been updated
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    minterFilterUpdatedAt.toString()
  );
});

test("handleMinterApproved should add new minter to store", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const minterToBeApprovedAddress = randomAddressGenerator.generateRandomAddress();
  const minterToBeApprovedType = "MinterSetPriceV0";
  mockMinterType(minterToBeApprovedAddress, minterToBeApprovedType);
  mockMinterFilterAddress(minterToBeApprovedAddress, minterFilterAddress);
  mockCoreContract(minterToBeApprovedAddress, TEST_CONTRACT_ADDRESS);

  const minterApprovedEvent: MinterApproved = changetype<MinterApproved>(
    newMockEvent()
  );
  minterApprovedEvent.address = minterFilterAddress;
  minterApprovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  minterApprovedEvent.parameters = [
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterToBeApprovedAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString(minterToBeApprovedType)
    )
  ];

  handleMinterApproved(minterApprovedEvent);

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString(),
    "type",
    minterToBeApprovedType
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString(),
    "isGloballyAllowlistedOnMinterFilter",
    "true"
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
  // MinterFilter minterGlobalAllowlist should include the approved minter
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "minterGlobalAllowlist",
    `[${minterToBeApprovedAddress.toHexString()}]`
  );

  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleMinterApproved should handle the same minter being approved more than once", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const minterToBeApprovedAddress = randomAddressGenerator.generateRandomAddress();
  const minterToBeApprovedType = "MinterSetPriceV0";
  mockMinterType(minterToBeApprovedAddress, minterToBeApprovedType);
  mockMinterFilterAddress(minterToBeApprovedAddress, minterFilterAddress);
  mockCoreContract(minterToBeApprovedAddress, TEST_CONTRACT_ADDRESS);

  const minterApprovedEvent: MinterApproved = changetype<MinterApproved>(
    newMockEvent()
  );
  minterApprovedEvent.address = minterFilterAddress;
  minterApprovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  minterApprovedEvent.parameters = [
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterToBeApprovedAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString(minterToBeApprovedType)
    )
  ];

  handleMinterApproved(minterApprovedEvent);
  handleMinterApproved(minterApprovedEvent);

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString(),
    "type",
    minterToBeApprovedType
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
  // MinterFilter minterGlobalAllowlist should include the approved minter
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "minterGlobalAllowlist",
    `[${minterToBeApprovedAddress.toHexString()}]`
  );

  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleMinterApproved should populate DA Exp default half life ranges", () => {
  for (let i = 0; i < DAExpMintersToTest.length; i++) {
    clearStore();
    const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
    const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
    // dummy coreRegistry is set to core contract address
    minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
    const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
      BigInt.fromI32(10)
    );
    minterFilter.updatedAt = minterFilterUpdatedAt;
    minterFilter.minterGlobalAllowlist = [];
    minterFilter.type = "MinterFilterV1";
    minterFilter.save();

    const minterToBeApprovedAddress = randomAddressGenerator.generateRandomAddress();
    const minterToBeApprovedType = DAExpMintersToTest[i];
    mockMinterType(minterToBeApprovedAddress, minterToBeApprovedType);
    mockDAExpHalfLifeMinMax(
      minterToBeApprovedAddress,
      BigInt.fromI32(300),
      BigInt.fromI32(3600)
    );
    mockMinterFilterAddress(minterToBeApprovedAddress, minterFilterAddress);
    mockCoreContract(minterToBeApprovedAddress, TEST_CONTRACT_ADDRESS);

    const minterApprovedEvent: MinterApproved = changetype<MinterApproved>(
      newMockEvent()
    );
    minterApprovedEvent.address = minterFilterAddress;
    minterApprovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
    minterApprovedEvent.parameters = [
      new ethereum.EventParam(
        "_minterAddress",
        ethereum.Value.fromAddress(minterToBeApprovedAddress)
      ),
      new ethereum.EventParam(
        "_minterType",
        ethereum.Value.fromString(minterToBeApprovedType)
      )
    ];

    handleMinterApproved(minterApprovedEvent);

    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minterToBeApprovedAddress.toHexString(),
      "type",
      minterToBeApprovedType
    );
    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minterToBeApprovedAddress.toHexString(),
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    // assert expected updates to extraMinterDetails
    let updatedMinter = Minter.load(minterToBeApprovedAddress.toHexString());
    if (updatedMinter == null) {
      throw new Error("minter config should not be null");
    }
    assertJsonFieldEquals(
      updatedMinter.extraMinterDetails,
      "minimumHalfLifeInSeconds",
      BigInt.fromI32(300)
    );
    assertJsonFieldEquals(
      updatedMinter.extraMinterDetails,
      "maximumHalfLifeInSeconds",
      BigInt.fromI32(3600)
    );
  }
});

test("handleMinterApproved should populate DA Lin min auction time", () => {
  for (let i = 0; i < DALinMintersToTest.length; i++) {
    clearStore();
    const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
    const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
    // dummy coreRegistry is set to core contract address
    minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
    const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
      BigInt.fromI32(10)
    );
    minterFilter.updatedAt = minterFilterUpdatedAt;
    minterFilter.minterGlobalAllowlist = [];
    minterFilter.type = "MinterFilterV1";
    minterFilter.save();

    const minterToBeApprovedAddress = randomAddressGenerator.generateRandomAddress();
    const minterToBeApprovedType = DALinMintersToTest[i];
    mockMinterType(minterToBeApprovedAddress, minterToBeApprovedType);
    mockDALinMinAuctionLength(minterToBeApprovedAddress, BigInt.fromI32(3600));
    mockMinterFilterAddress(minterToBeApprovedAddress, minterFilterAddress);
    mockCoreContract(minterToBeApprovedAddress, TEST_CONTRACT_ADDRESS);

    const minterApprovedEvent: MinterApproved = changetype<MinterApproved>(
      newMockEvent()
    );
    minterApprovedEvent.address = minterFilterAddress;
    minterApprovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
    minterApprovedEvent.parameters = [
      new ethereum.EventParam(
        "_minterAddress",
        ethereum.Value.fromAddress(minterToBeApprovedAddress)
      ),
      new ethereum.EventParam(
        "_minterType",
        ethereum.Value.fromString(minterToBeApprovedType)
      )
    ];

    handleMinterApproved(minterApprovedEvent);

    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minterToBeApprovedAddress.toHexString(),
      "type",
      minterToBeApprovedType
    );
    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minterToBeApprovedAddress.toHexString(),
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    // assert expected updates to extraMinterDetails
    let updatedMinter = Minter.load(minterToBeApprovedAddress.toHexString());
    if (updatedMinter == null) {
      throw new Error("minter config should not be null");
    }
    assertJsonFieldEquals(
      updatedMinter.extraMinterDetails,
      "minimumAuctionLengthInSeconds",
      BigInt.fromString("3600")
    );
  }
});

test("handleMinterRevoke should do nothing to MinterFilter if minter is not in store", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const minterToBeRevokedAddress = randomAddressGenerator.generateRandomAddress();

  const minterRevokedEvent: MinterRevoked = changetype<MinterRevoked>(
    newMockEvent()
  );
  minterRevokedEvent.address = minterFilterAddress;
  minterRevokedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  minterRevokedEvent.parameters = [
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterToBeRevokedAddress)
    )
  ];

  handleMinterRevoked(minterRevokedEvent);

  // Minter should not be in store because it was never created before this event
  assert.assertNull(Minter.load(minterToBeRevokedAddress.toHexString()));
  // MinterFilter should not have been updated
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    minterFilterUpdatedAt.toString()
  );
});

test("handleMinterRevoke should remove minter from MinterFilter's minterGlobalAllowlist, but keep Minter as an associated minter", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterType = minter.type;
  const minterToBeApprovedAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterToBeRevokedAddress = minterToBeApprovedAddress;
  minter.minterFilter = minterFilterAddress.toHexString();
  minter.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  minter.save();

  // approve minter event
  const minterApprovedEvent: MinterApproved = changetype<MinterApproved>(
    newMockEvent()
  );
  minterApprovedEvent.address = minterFilterAddress;
  minterApprovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  minterApprovedEvent.parameters = [
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterToBeApprovedAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString(minterType)
    )
  ];

  // revoke minter event
  const minterRevokedEvent: MinterRevoked = changetype<MinterRevoked>(
    newMockEvent()
  );
  minterRevokedEvent.address = minterFilterAddress;
  minterRevokedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  minterRevokedEvent.parameters = [
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterToBeRevokedAddress)
    )
  ];

  handleMinterApproved(minterApprovedEvent);
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString(),
    "isGloballyAllowlistedOnMinterFilter",
    "true"
  );
  handleMinterRevoked(minterRevokedEvent);

  // MinterFilter minterGlobalAllowlist should be empty array
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "minterGlobalAllowlist",
    "[]"
  );
  // Minter should remain in store (to persist any populated fields)
  assert.assertNotNull(Minter.load(minter.id));
  // MinterFilter should still recognize the revoked Minter as an associated minter
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "knownMinters",
    `[${minterToBeRevokedAddress.toHexString()}]`
  );
  // MinterFilter should have been updated
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
  // Minter should have been updated
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString(),
    "isGloballyAllowlistedOnMinterFilter",
    "false"
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleMinterRevoke should handle revoking a minter more than once", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterToBeRevokedAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  minter.minterFilter = minterFilterAddress.toHexString();
  minter.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  minter.save();

  const minterRevokedEvent: MinterRevoked = changetype<MinterRevoked>(
    newMockEvent()
  );
  minterRevokedEvent.address = minterFilterAddress;
  minterRevokedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  minterRevokedEvent.parameters = [
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterToBeRevokedAddress)
    )
  ];

  handleMinterRevoked(minterRevokedEvent);
  handleMinterRevoked(minterRevokedEvent);

  // MinterFilter minterGlobalAllowlist should still be empty array
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "minterGlobalAllowlist",
    "[]"
  );
  // Minter should remain in store (to persist any populated fields)
  assert.assertNotNull(Minter.load(minter.id));
  // MinterFilter should still recognize the revoked Minter as an associated minter
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "knownMinters",
    `[${minterToBeRevokedAddress.toHexString()}]`
  );
  // MinterFilter should have been updated
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleProjectMinterRegistered should do nothing if the minter being registered is not in the store", () => {
  clearStore();

  const projectId = BigInt.fromI32(0);
  const projectUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    projectUpdatedAt
  );

  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const minterAddress = randomAddressGenerator.generateRandomAddress();

  const projectMinterRegisteredEvent: ProjectMinterRegistered = changetype<
    ProjectMinterRegistered
  >(newMockEvent());
  projectMinterRegisteredEvent.address = minterFilterAddress;
  projectMinterRegisteredEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  projectMinterRegisteredEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString("MinterSetPriceV0")
    )
  ];

  assert.notInStore(MINTER_ENTITY_TYPE, minterAddress.toHexString());

  handleProjectMinterRegistered(projectMinterRegisteredEvent);

  assert.notInStore(MINTER_ENTITY_TYPE, minterAddress.toHexString());
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    projectUpdatedAt.toString()
  );
});

test("handleProjectMinterRegistered should do nothing if the minter filter's core contract is not in the store", () => {
  clearStore();

  const projectId = BigInt.fromI32(0);
  const projectUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    projectUpdatedAt
  );

  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

  const projectMinterRegisteredEvent: ProjectMinterRegistered = changetype<
    ProjectMinterRegistered
  >(newMockEvent());
  projectMinterRegisteredEvent.address = minterFilterAddress;
  projectMinterRegisteredEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  projectMinterRegisteredEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString("MinterSetPriceV0")
    )
  ];

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "id",
    minterAddress.toHexString()
  );
  assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHexString());

  handleProjectMinterRegistered(projectMinterRegisteredEvent);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    projectUpdatedAt.toString()
  );
});

test("handleProjectMinterRegistered should do nothing if the minter filter is not the minter filter for the core contract", () => {
  clearStore();

  const projectId = BigInt.fromI32(0);
  const projectUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    projectUpdatedAt
  );

  const contract = addTestContractToStore(BigInt.fromI32(1));

  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

  const projectMinterRegisteredEvent: ProjectMinterRegistered = changetype<
    ProjectMinterRegistered
  >(newMockEvent());
  projectMinterRegisteredEvent.address = minterFilterAddress;
  projectMinterRegisteredEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  projectMinterRegisteredEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString("MinterSetPriceV0")
    )
  ];

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "id",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "id",
    TEST_CONTRACT_ADDRESS.toHexString()
  );
  assert.assertNull(contract.minterFilter);

  handleProjectMinterRegistered(projectMinterRegisteredEvent);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    projectUpdatedAt.toString()
  );
});

test("handleProjectMinterRegistered should populate project from prior minter configuration for project", () => {
  clearStore();

  const projectId = BigInt.fromI32(0);
  const projectUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  const projectPriceIsConfigured = true;
  const projectBasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  const projectCurrencySymbol = "ETH";
  const projectCurrencyAddress = Address.zero();
  const projectPurchaseToDisabled = false;
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    projectUpdatedAt
  );

  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const contract = addTestContractToStore(BigInt.fromI32(1));
  contract.minterFilter = minterFilterAddress.toHexString();
  contract.save();

  const minterType = "MinterSetPriceV0";
  const minter = addNewMinterToStore(minterType);
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

  const previousMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  previousMinterConfig.minter = minter.id;
  previousMinterConfig.project = project.id;
  previousMinterConfig.basePrice = projectBasePrice;
  previousMinterConfig.priceIsConfigured = projectPriceIsConfigured;
  previousMinterConfig.currencyAddress = projectCurrencyAddress;
  previousMinterConfig.currencySymbol = projectCurrencySymbol;
  previousMinterConfig.purchaseToDisabled = projectPurchaseToDisabled;
  previousMinterConfig.extraMinterDetails = "{}";

  previousMinterConfig.save();

  const projectMinterRegisteredEvent: ProjectMinterRegistered = changetype<
    ProjectMinterRegistered
  >(newMockEvent());
  projectMinterRegisteredEvent.address = minterFilterAddress;
  projectMinterRegisteredEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  projectMinterRegisteredEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString("MinterSetPriceV0")
    )
  ];

  handleProjectMinterRegistered(projectMinterRegisteredEvent);

  const configId = getProjectMinterConfigId(
    minterAddress.toHexString(),
    project.id
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "minterConfiguration",
    configId
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "project",
    project.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "minter",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "type",
    minterType
  );

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "priceIsConfigured",
    booleanToString(projectPriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "basePrice",
    projectBasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "currencySymbol",
    projectCurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "currencyAddress",
    projectCurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "purchaseToDisabled",
    booleanToString(projectPurchaseToDisabled)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});
test("handleProjectMinterRegistered should populate project from scratch for project", () => {
  clearStore();

  const projectId = BigInt.fromI32(0);
  const projectUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    projectUpdatedAt
  );

  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const contract = addTestContractToStore(BigInt.fromI32(1));
  contract.minterFilter = minterFilterAddress.toHexString();
  contract.save();

  const minterType = "MinterSetPriceV0";
  const minter = addNewMinterToStore(minterType);
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

  const projectMinterRegisteredEvent: ProjectMinterRegistered = changetype<
    ProjectMinterRegistered
  >(newMockEvent());
  projectMinterRegisteredEvent.address = minterFilterAddress;
  projectMinterRegisteredEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  projectMinterRegisteredEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_minterAddress",
      ethereum.Value.fromAddress(minterAddress)
    ),
    new ethereum.EventParam(
      "_minterType",
      ethereum.Value.fromString("MinterSetPriceV0")
    )
  ];

  handleProjectMinterRegistered(projectMinterRegisteredEvent);

  const configId = getProjectMinterConfigId(
    minterAddress.toHexString(),
    project.id
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "minterConfiguration",
    configId
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "project",
    project.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "minter",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "type",
    minterType
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId,
    "priceIsConfigured",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleProjectMinterRemoved should do nothing if core contract is not in store", () => {
  clearStore();

  const projectUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(0),
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    projectUpdatedAt
  );

  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const minterType = "MinterSetPriceV0";
  const minter = addNewMinterToStore(minterType);
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

  const projectMinterRemovedEvent: ProjectMinterRemoved = changetype<
    ProjectMinterRemoved
  >(newMockEvent());
  projectMinterRemovedEvent.address = minterFilterAddress;
  projectMinterRemovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  projectMinterRemovedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
    )
  ];

  assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHexString());

  handleProjectMinterRemoved(projectMinterRemovedEvent);

  assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHexString());
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    projectUpdatedAt.toString()
  );
});

test("handleProjectMinterRemoved should do nothing if core contract does not have minter filter set to event address", () => {
  clearStore();

  const projectUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(0),
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    projectUpdatedAt
  );

  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const contract = addTestContractToStore(BigInt.fromI32(1));

  const minter = addNewMinterToStore("MinterSetPriceV0");
  minter.save();

  const projectMinterRemovedEvent: ProjectMinterRemoved = changetype<
    ProjectMinterRemoved
  >(newMockEvent());
  projectMinterRemovedEvent.address = minterFilterAddress;
  projectMinterRemovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  projectMinterRemovedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
    )
  ];

  assert.assertTrue(contract.minterFilter != minterFilterAddress.toHexString());

  handleProjectMinterRemoved(projectMinterRemovedEvent);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    projectUpdatedAt.toString()
  );
});

test("handleProjectMinterRemoved should remove minter configuration from project", () => {
  clearStore();

  const projectUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  let project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    BigInt.fromI32(0),
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    projectUpdatedAt
  );
  project.minterConfiguration = project.id;
  project.save();

  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  // dummy coreRegistry is set to core contract address
  minterFilter.coreRegistry = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.type = "MinterFilterV1";
  minterFilter.save();

  const contract = addTestContractToStore(BigInt.fromI32(1));
  contract.minterFilter = minterFilterAddress.toHexString();
  contract.save();

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;
  minter.save();

  const projectMinterConfig = addNewLegacyProjectMinterConfigToStore(
    project.id,
    minterAddress
  );

  const projectMinterRemovedEvent: ProjectMinterRemoved = changetype<
    ProjectMinterRemoved
  >(newMockEvent());
  projectMinterRemovedEvent.address = minterFilterAddress;
  projectMinterRemovedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  projectMinterRemovedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(project.projectId)
    )
  ];

  handleProjectMinterRemoved(projectMinterRemovedEvent);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
  project = changetype<Project>(Project.load(project.id));
  assert.assertNull(project.minterConfiguration);
});
