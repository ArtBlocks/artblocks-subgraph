import {
  assert,
  clearStore,
  test,
  createMockedFunction,
  newMockEvent
} from "matchstick-as/assembly/index";
import { BigInt, ethereum, Address } from "@graphprotocol/graph-ts";
import {
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  MINTER_ENTITY_TYPE,
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  TEST_CONTRACT_ADDRESS,
  TEST_TX_HASH,
  TEST_MINTER_FILTER_ADDRESS,
  addTestContractToStore,
  addTestMinterFilterToStore,
  addNewProjectToStore,
  MINTER_FILTER_ENTITY_TYPE,
  ONE_ETH_IN_WEI,
  booleanToString,
  assertJsonFieldEquals,
  getJSONStringFromEntries
} from "../shared-helpers";

import {
  mockRefreshContractCalls,
  mockMinterUpdatedCallsNoPreconfiguredProjects,
  mockMintersCoreContract,
  mockMintersMinterFilterAddress,
  mockMintersMinterType
} from "./helpers";

import { mockGetProjectAndMinterInfoAt } from "../minter-suite/helpers";

import { ProjectMinterConfiguration, Minter } from "../../../generated/schema";
import { MinterUpdated } from "../../../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_Base";
import { handleMinterUpdated } from "../../../src/mapping-v3-core";
import { getProjectMinterConfigId } from "../../../src/helpers";
import { toJSONValue } from "../../../src/json";

const randomAddressGenerator = new RandomAddressGenerator();

const coreType = "GenArt721CoreV3_Engine";

test(`${coreType}/MinterUpdated: should handle setting minter to zero address`, () => {
  clearStore();
  const startingProjectId = BigInt.fromI32(100);
  mockRefreshContractCalls(startingProjectId, coreType, null);
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

test(`${coreType}/MinterUpdated: should list invalid MinterFilter with different core contract as minter, but null MinterFilter`, () => {
  clearStore();
  const startingProjectId = BigInt.fromI32(100);
  mockRefreshContractCalls(startingProjectId, coreType, null);
  // override mocked minterContract to return new minter filter address
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "minterContract",
    "minterContract():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_MINTER_FILTER_ADDRESS)]);

  mockMinterUpdatedCallsNoPreconfiguredProjects(startingProjectId);
  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  // override mock to return different core contract on the minter filter
  const differentCoreAddress = randomAddressGenerator.generateRandomAddress();
  createMockedFunction(
    TEST_MINTER_FILTER_ADDRESS,
    "genArt721CoreAddress",
    "genArt721CoreAddress():(address)"
  ).returns([ethereum.Value.fromAddress(differentCoreAddress)]);

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
  // handle event (should log warning warning, but not error)
  handleMinterUpdated(event);
  // assertions
  // core's minterFilter be null because the minter filter had different core contract
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "minterFilter",
    "null"
  );
  // core should still have the minter filter in its mintWhitelisted list (because it is technically approved to mint)
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

  // minter filter should NOT be added to store for engine contracts
  assert.notInStore(
    MINTER_FILTER_ENTITY_TYPE,
    TEST_MINTER_FILTER_ADDRESS.toHexString()
  );
});

test(`${coreType}/MinterUpdated: should create Contract but NOT MinterFilter entities when not yet created, and NOT assign minterFilter`, () => {
  clearStore();
  const startingProjectId = BigInt.fromI32(100);
  mockRefreshContractCalls(startingProjectId, coreType, null);
  // override mocked minterContract to return new minter filter address
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "minterContract",
    "minterContract():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_MINTER_FILTER_ADDRESS)]);
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
    "null"
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
  assert.notInStore(
    MINTER_FILTER_ENTITY_TYPE,
    TEST_MINTER_FILTER_ADDRESS.toHexString()
  );
});

test(`${coreType}/MinterUpdated: should populate project minter configurations for all projects preconfigured on existing minter filter`, () => {
  clearStore();
  const startingProjectId = BigInt.fromI32(100);
  addTestContractToStore(startingProjectId);
  // add minter filter to store so engine contract actively indexes it
  addTestMinterFilterToStore();
  mockRefreshContractCalls(startingProjectId, coreType, null);
  mockMinterUpdatedCallsNoPreconfiguredProjects(startingProjectId);

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
  // use the test minter filter address that we have created mocked functions for
  const minterFilterAddress = TEST_MINTER_FILTER_ADDRESS;

  // random addresses may be generated for minters, we generate mocked functions below
  const minterSetPriceV2Address = randomAddressGenerator.generateRandomAddress();
  const minterSetPriceERC20V2Address = randomAddressGenerator.generateRandomAddress();
  const minterDALinV2Address = randomAddressGenerator.generateRandomAddress();
  const minterDAExpV2Address = randomAddressGenerator.generateRandomAddress();

  const event: MinterUpdated = changetype<MinterUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_currentMinter",
      ethereum.Value.fromAddress(minterFilterAddress)
    )
  ];
  event.block.timestamp = updateCallBlockTimestamp;

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
  const project0MinterType = "MinterSetPriceV2";

  const previousMinterConfig0 = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterSetPriceV2Address.toHexString(), project0.id)
  );
  previousMinterConfig0.minter = minterSetPriceV2Address.toHexString();
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
    minterSetPriceV2Address,
    project0MinterType
  );

  mockMintersMinterType(minterSetPriceV2Address, project0MinterType);
  mockMintersMinterFilterAddress(minterSetPriceV2Address, minterFilterAddress);
  mockMintersCoreContract(minterSetPriceV2Address, TEST_CONTRACT_ADDRESS);

  // Mocks for project 1
  const project1PriceIsConfigured = true;
  const project1BasePrice = BigInt.fromI64(i64(1e18));
  const project1CurrencySymbol = "DAI";
  const project1CurrencyAddress = randomAddressGenerator.generateRandomAddress();
  const project1PurchaseToDisabled = false;
  const project1MinterType = "MinterSetPriceERC20V2";

  const previousMinterConfig1 = new ProjectMinterConfiguration(
    getProjectMinterConfigId(
      minterSetPriceERC20V2Address.toHexString(),
      project1.id
    )
  );
  previousMinterConfig1.minter = minterSetPriceERC20V2Address.toHexString();
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
    minterSetPriceERC20V2Address,
    project1MinterType
  );

  mockMintersMinterType(minterSetPriceERC20V2Address, project1MinterType);
  mockMintersMinterFilterAddress(
    minterSetPriceERC20V2Address,
    minterFilterAddress
  );
  mockMintersCoreContract(minterSetPriceERC20V2Address, TEST_CONTRACT_ADDRESS);

  // Mocks for project 2
  const project2PriceIsConfigured = true;
  const project2CurrencySymbol = "ETH";
  const project2CurrencyAddress = Address.zero();
  const project2PurchaseToDisabled = false;
  const project2StartTime = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(100));
  const project2EndTime = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(3700));
  const project2StartPrice = ONE_ETH_IN_WEI;
  const project2BasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(5));
  const project2MinterType = "MinterDALinV2";

  const previousMinterConfig2 = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterDALinV2Address.toHexString(), project2.id)
  );
  previousMinterConfig2.minter = minterDALinV2Address.toHexString();
  previousMinterConfig2.project = project2.id;
  previousMinterConfig2.basePrice = project2BasePrice;
  previousMinterConfig2.priceIsConfigured = project2PriceIsConfigured;
  previousMinterConfig2.currencyAddress = project2CurrencyAddress;
  previousMinterConfig2.currencySymbol = project2CurrencySymbol;
  previousMinterConfig2.purchaseToDisabled = project2PurchaseToDisabled;
  // @dev Deprecated fields ----------------
  previousMinterConfig2.startTime = project2StartTime;
  previousMinterConfig2.endTime = project2EndTime;
  previousMinterConfig2.startPrice = project2StartPrice;
  // ---------------------------------------
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
    minterDALinV2Address,
    project2MinterType
  );

  mockMintersMinterType(minterDALinV2Address, project2MinterType);
  mockMintersMinterFilterAddress(minterDALinV2Address, minterFilterAddress);
  mockMintersCoreContract(minterDALinV2Address, TEST_CONTRACT_ADDRESS);
  createMockedFunction(
    minterDALinV2Address,
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
  const project3Mintertype = "MinterDAExpV2";

  const previousMinterConfig3 = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterDAExpV2Address.toHexString(), project3.id)
  );
  previousMinterConfig3.minter = minterDAExpV2Address.toHexString();
  previousMinterConfig3.project = project3.id;
  previousMinterConfig3.basePrice = project3BasePrice;
  previousMinterConfig3.priceIsConfigured = project3PriceIsConfigured;
  previousMinterConfig3.currencyAddress = project3CurrencyAddress;
  previousMinterConfig3.currencySymbol = project3CurrencySymbol;
  previousMinterConfig3.purchaseToDisabled = project3PurchaseToDisabled;
  // @dev Deprecated fields ----------------
  previousMinterConfig3.halfLifeSeconds = project3HalfLifeSeconds;
  previousMinterConfig3.startTime = project3StartTime;
  previousMinterConfig3.startPrice = project3StartPrice;
  // ---------------------------------------
  previousMinterConfig3.extraMinterDetails = getJSONStringFromEntries([
    { key: "startTime", value: toJSONValue(project3StartTime) },
    { key: "halfLifeSeconds", value: toJSONValue(project3HalfLifeSeconds) },
    { key: "startPrice", value: toJSONValue(project3StartPrice.toString()) }
  ]);
  previousMinterConfig3.save();

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(3),
    project3.projectId,
    minterDAExpV2Address,
    project3Mintertype
  );

  mockMintersMinterType(minterDAExpV2Address, project3Mintertype);
  mockMintersMinterFilterAddress(minterDAExpV2Address, minterFilterAddress);
  mockMintersCoreContract(minterDAExpV2Address, TEST_CONTRACT_ADDRESS);
  createMockedFunction(
    minterDAExpV2Address,
    "minimumPriceDecayHalfLifeSeconds",
    "minimumPriceDecayHalfLifeSeconds():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(300))]);
  createMockedFunction(
    minterDAExpV2Address,
    "maximumPriceDecayHalfLifeSeconds",
    "maximumPriceDecayHalfLifeSeconds():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000))]);

  // handle event
  handleMinterUpdated(event);

  // assertions
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "minterFilter",
    minterFilterAddress.toHexString()
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "mintWhitelisted",
    "[".concat(minterFilterAddress.toHexString()).concat("]")
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "id",
    minterFilterAddress.toHexString()
  );
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "coreContract",
    TEST_CONTRACT_ADDRESS.toHexString()
  );

  // Project 0 asserts

  let configId = getProjectMinterConfigId(
    minterSetPriceV2Address.toHexString(),
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
    minterSetPriceV2Address.toHexString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterSetPriceV2Address.toHexString(),
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
    minterSetPriceERC20V2Address.toHexString(),
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
    minterSetPriceERC20V2Address.toHexString()
  );

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterSetPriceERC20V2Address.toHexString(),
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

  // Project 2 asserts

  let configId2 = getProjectMinterConfigId(
    minterDALinV2Address.toHexString(),
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
    minterDALinV2Address.toHexString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterDALinV2Address.toHexString(),
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
  let updatedProjectMinterConfig = ProjectMinterConfiguration.load(configId2);
  if (updatedProjectMinterConfig == null) {
    throw new Error("project minter config should not be null");
  }
  assertJsonFieldEquals(
    updatedProjectMinterConfig.extraMinterDetails,
    "startTime",
    project2StartTime
  );
  assertJsonFieldEquals(
    updatedProjectMinterConfig.extraMinterDetails,
    "endTime",
    project2EndTime
  );
  assertJsonFieldEquals(
    updatedProjectMinterConfig.extraMinterDetails,
    "startPrice",
    project2StartPrice.toString()
  );
  // @dev Deprecated fields ----------------
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "startTime",
    project2StartTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "endTime",
    project2EndTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId2,
    "startPrice",
    project2StartPrice.toString()
  );
  // ---------------------------------------

  // Project 3 asserts

  let configId3 = getProjectMinterConfigId(
    minterDAExpV2Address.toHexString(),
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
    minterDAExpV2Address.toHexString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterDAExpV2Address.toHexString(),
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
  // @dev Deprecated fields ----------------
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "startTime",
    project3StartTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "halfLifeSeconds",
    project3HalfLifeSeconds.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    configId3,
    "startPrice",
    project3StartPrice.toString()
  );
  // ---------------------------------------
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export { handleMinterUpdated };
