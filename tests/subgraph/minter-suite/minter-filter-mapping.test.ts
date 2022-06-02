import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  clearStore,
  test,
  newMockEvent,
  createMockedFunction
} from "matchstick-as/assembly/index";
import {
  IsCanonicalMinterFilter,
  MinterApproved,
  MinterRevoked,
  ProjectMinterRegistered,
  ProjectMinterRemoved
} from "../../../generated/MinterFilterV0/MinterFilterV0";
import {
  Minter,
  MinterFilter,
  Project,
  ProjectMinterConfiguration
} from "../../../generated/schema";
import {
  handleIsCanonicalMinterFilter,
  handleMinterApproved,
  handleMinterRevoked,
  handleProjectMinterRegistered,
  handleProjectMinterRemoved
} from "../../../src/minter-filter-mapping";
import { _retrieveDecodedDataFromCallData } from "../../../src/secondary/opensea/os-v2-mapping";
import {
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
  TEST_CONTRACT_ADDRESS
} from "../shared-helpers";
import {
  mockCoreContract,
  mockGetPriceInfo,
  mockGetProjectAndMinterInfoAt,
  mockMinterFilterAddress,
  mockMinterType,
  mockPurchaseToDisabled
} from "./helpers";

const randomAddressGenerator = new RandomAddressGenerator();

test("handleIsCanonicalMinterFilter should do nothing if the core contract for the minter filter emitting the event has not been indexed", () => {
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
    "coreContract",
    TEST_CONTRACT_ADDRESS.toHexString()
  );
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    updateCallBlockTimestamp.toString()
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

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(0),
    project0.projectId,
    minterSetPriceV0Address,
    project0MinterType
  );

  mockGetPriceInfo(
    minterSetPriceV0Address,
    project0.projectId,
    project0PriceIsConfigured,
    project0BasePrice,
    project0CurrencySymbol,
    project0CurrencyAddress
  );

  mockPurchaseToDisabled(
    minterSetPriceV0Address,
    project0.projectId,
    project0PurchaseToDisabled
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

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(1),
    project1.projectId,
    minterSetPriceERC20V0Address,
    project1MinterType
  );

  mockGetPriceInfo(
    minterSetPriceERC20V0Address,
    project1.projectId,
    project1PriceIsConfigured,
    project1BasePrice,
    project1CurrencySymbol,
    project1CurrencyAddress
  );

  mockPurchaseToDisabled(
    minterSetPriceERC20V0Address,
    project1.projectId,
    project1PurchaseToDisabled
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

  mockGetPriceInfo(
    minterDALinV0Address,
    project2.projectId,
    project2PriceIsConfigured,
    project2BasePrice,
    project2CurrencySymbol,
    project2CurrencyAddress
  );

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(2),
    project2.projectId,
    minterDALinV0Address,
    project2MinterType
  );

  createMockedFunction(
    minterDALinV0Address,
    "projectAuctionParameters",
    "projectAuctionParameters(uint256):(uint256,uint256,uint256,uint256)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(project2.projectId)])
    .returns([
      ethereum.Value.fromUnsignedBigInt(project2StartTime),
      ethereum.Value.fromUnsignedBigInt(project2EndTime),
      ethereum.Value.fromUnsignedBigInt(project2StartPrice),
      ethereum.Value.fromUnsignedBigInt(project2BasePrice)
    ]);

  mockPurchaseToDisabled(
    minterDALinV0Address,
    project2.projectId,
    project2PurchaseToDisabled
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

  mockGetPriceInfo(
    minterDAExpV0Address,
    project3.projectId,
    project3PriceIsConfigured,
    project3BasePrice,
    project3CurrencySymbol,
    project3CurrencyAddress
  );

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(3),
    project3.projectId,
    minterDAExpV0Address,
    project3Mintertype
  );

  createMockedFunction(
    minterDAExpV0Address,
    "projectAuctionParameters",
    "projectAuctionParameters(uint256):(uint256,uint256,uint256,uint256)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(project3.projectId)])
    .returns([
      ethereum.Value.fromUnsignedBigInt(project3StartTime),
      ethereum.Value.fromUnsignedBigInt(project3HalfLifeSeconds),
      ethereum.Value.fromUnsignedBigInt(project3StartPrice),
      ethereum.Value.fromUnsignedBigInt(project3BasePrice)
    ]);

  mockPurchaseToDisabled(
    minterDAExpV0Address,
    project3.projectId,
    project3PurchaseToDisabled
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
    "coreContract",
    TEST_CONTRACT_ADDRESS.toHexString()
  );
  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    updateCallBlockTimestamp.toString()
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
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project0.id,
    "minterConfiguration",
    project0.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project0.id.toString(),
    "project",
    project0.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project0.id,
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
    project0.id,
    "priceIsConfigured",
    booleanToString(project0PriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project0.id,
    "basePrice",
    project0BasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project0.id,
    "currencySymbol",
    project0CurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project0.id,
    "currencyAddress",
    project0CurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project0.id,
    "purchaseToDisabled",
    booleanToString(project0PurchaseToDisabled)
  );

  // Project 1 asserts
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project1.id,
    "minterConfiguration",
    project1.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project1.id.toString(),
    "project",
    project1.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project1.id,
    "minter",
    minterSetPriceERC20V0Address.toHexString()
  );

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project1.id,
    "priceIsConfigured",
    booleanToString(project1PriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project1.id,
    "basePrice",
    project1BasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project1.id,
    "currencySymbol",
    project1CurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project1.id,
    "currencyAddress",
    project1CurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project1.id,
    "purchaseToDisabled",
    booleanToString(project1PurchaseToDisabled)
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterSetPriceERC20V0Address.toHexString(),
    "type",
    project1MinterType
  );

  // Project 2 asserts
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project2.id,
    "minterConfiguration",
    project2.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id.toString(),
    "project",
    project2.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id,
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
    project2.id,
    "priceIsConfigured",
    booleanToString(project2PriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id,
    "basePrice",
    project2BasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id,
    "currencySymbol",
    project2CurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id,
    "currencyAddress",
    project2CurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id,
    "purchaseToDisabled",
    booleanToString(project2PurchaseToDisabled)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id,
    "startTime",
    project2StartTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id,
    "endTime",
    project2EndTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project2.id,
    "startPrice",
    project2StartPrice.toString()
  );

  // Project 3 asserts
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project3.id,
    "minterConfiguration",
    project3.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id.toString(),
    "project",
    project3.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id,
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
    project3.id,
    "priceIsConfigured",
    booleanToString(project3PriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id,
    "basePrice",
    project3BasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id,
    "currencySymbol",
    project3CurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id,
    "currencyAddress",
    project3CurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id,
    "purchaseToDisabled",
    booleanToString(project3PurchaseToDisabled)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id,
    "startTime",
    project3StartTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id,
    "halfLifeSeconds",
    project3HalfLifeSeconds.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project3.id,
    "startPrice",
    project3StartPrice.toString()
  );
});

test("handleMinterApproved should do nothing if the approved minter has a different minter filter", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
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

  assert.notInStore(
    MINTER_ENTITY_TYPE,
    minterToBeApprovedAddress.toHexString()
  );
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
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
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
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );

  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleMinterRevoke should do nothing if minter is not in store", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
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

  assert.fieldEquals(
    MINTER_FILTER_ENTITY_TYPE,
    minterFilterAddress.toHexString(),
    "updatedAt",
    minterFilterUpdatedAt.toString()
  );
});

test("handleMinterRevoke should remove minter from store", () => {
  clearStore();
  const minterFilterAddress = randomAddressGenerator.generateRandomAddress();
  const minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  const minterFilterUpdatedAt = CURRENT_BLOCK_TIMESTAMP.minus(
    BigInt.fromI32(10)
  );
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const minterToBeRevokedAddress = randomAddressGenerator.generateRandomAddress();
  const minter = new Minter(minterToBeRevokedAddress.toHexString());
  minter.type = "MinterSetPriceV0";
  minter.minterFilter = minterFilterAddress.toHexString();
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
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

  assert.notInStore(MINTER_ENTITY_TYPE, minterToBeRevokedAddress.toHexString());
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
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
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
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minter = new Minter(minterAddress.toHexString());
  minter.save();

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
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minter = new Minter(minterAddress.toHexString());
  minter.save();

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

test("handleProjectMinterRegistered should populate project minter configuration for project", () => {
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
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const contract = addTestContractToStore(BigInt.fromI32(1));
  contract.minterFilter = minterFilterAddress.toHexString();
  contract.save();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.type = minterType;
  minter.save();

  mockGetProjectAndMinterInfoAt(
    minterFilterAddress,
    BigInt.fromI32(0),
    project.projectId,
    minterAddress,
    minterType
  );

  mockGetPriceInfo(
    minterAddress,
    projectId,
    projectPriceIsConfigured,
    projectBasePrice,
    projectCurrencySymbol,
    projectCurrencyAddress
  );

  mockPurchaseToDisabled(
    minterAddress,
    project.projectId,
    projectPurchaseToDisabled
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

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "minterConfiguration",
    project.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id.toString(),
    "project",
    project.id
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
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
    project.id,
    "priceIsConfigured",
    booleanToString(projectPriceIsConfigured)
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "basePrice",
    projectBasePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "currencySymbol",
    projectCurrencySymbol
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "currencyAddress",
    projectCurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
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
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.type = minterType;
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
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const contract = addTestContractToStore(BigInt.fromI32(1));

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.type = minterType;
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
  minterFilter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minterFilter.updatedAt = minterFilterUpdatedAt;
  minterFilter.save();

  const contract = addTestContractToStore(BigInt.fromI32(1));
  contract.minterFilter = minterFilterAddress.toHexString();
  contract.save();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.type = minterType;
  minter.save();

  const projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.save();

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

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, project.id);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
  project = changetype<Project>(Project.load(project.id));
  assert.assertNull(project.minterConfiguration);
});
