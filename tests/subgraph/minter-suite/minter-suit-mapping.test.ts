import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  clearStore,
  test,
  newMockEvent
} from "matchstick-as/assembly/index";
import { Minter, ProjectMinterConfiguration } from "../../../generated/schema";
import {
  addNewProjectToStore,
  booleanToString,
  CURRENT_BLOCK_TIMESTAMP,
  MINTER_ENTITY_TYPE,
  ONE_ETH_IN_WEI,
  PROJECT_ENTITY_TYPE,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  RandomAddressGenerator,
  TEST_CONTRACT_ADDRESS
} from "../shared-helpers";
import { generateContractSpecificId } from "../../../src/helpers";
import {
  PricePerTokenInWeiUpdated,
  ProjectCurrencyInfoUpdated,
  PurchaseToDisabledUpdated
} from "../../../generated/MinterSetPriceV0/IFilteredMinterV0";
import {
  SetAuctionDetails as DALinV0SetAuctionDetails,
  ResetAuctionDetails as DALinV0ResetAuctionDetails,
  MinimumAuctionLengthSecondsUpdated
} from "../../../generated/MinterDALinV0/MinterDALinV0";
import {
  handleAuctionHalfLifeRangeSecondsUpdated,
  handleDAExpV0ResetAuctionDetails,
  handleDAExpV0SetAuctionDetails,
  handleDALinV0ResetAuctionDetails,
  handleDALinV0SetAuctionDetails,
  handleMinimumAuctionLengthSecondsUpdated,
  handlePricePerTokenInWeiUpdated,
  handleProjectCurrencyInfoUpdated,
  handlePurchaseToDisabledUpdated
} from "../../../src/minter-suite-mapping";
import {
  AuctionHalfLifeRangeSecondsUpdated,
  SetAuctionDetails as DAExpV0SetAuctionDetails,
  ResetAuctionDetails as DAExpV0ResetAuctionDetails
} from "../../../generated/MinterDAExpV0/MinterDAExpV0";

const randomAddressGenerator = new RandomAddressGenerator();

test("handlePricePerTokenInWeiUpdated should do nothing if project is not in store", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  const pricePerTokenInWeiUpdatedEvent: PricePerTokenInWeiUpdated = changetype<
    PricePerTokenInWeiUpdated
  >(newMockEvent());
  pricePerTokenInWeiUpdatedEvent.address = minterAddress;
  pricePerTokenInWeiUpdatedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  pricePerTokenInWeiUpdatedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  handlePricePerTokenInWeiUpdated(pricePerTokenInWeiUpdatedEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handlePricePerTokenInWeiUpdated should update project minter config pricePerTokenInWei", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.save();

  const newPricePerTokenInWei = ONE_ETH_IN_WEI.div(BigInt.fromI32(5));
  const pricePerTokenInWeiUpdatedEvent: PricePerTokenInWeiUpdated = changetype<
    PricePerTokenInWeiUpdated
  >(newMockEvent());
  pricePerTokenInWeiUpdatedEvent.address = minterAddress;
  pricePerTokenInWeiUpdatedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_pricePerTokenInWei",
      ethereum.Value.fromUnsignedBigInt(newPricePerTokenInWei)
    )
  ];
  pricePerTokenInWeiUpdatedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handlePricePerTokenInWeiUpdated(pricePerTokenInWeiUpdatedEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "basePrice",
    newPricePerTokenInWei.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "priceIsConfigured",
    "true"
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleProjectCurrencyInfoUpdated should do nothing if project is not in store", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceERC20V0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  const projectCurrencyInfoUpdatedEvent: ProjectCurrencyInfoUpdated = changetype<
    ProjectCurrencyInfoUpdated
  >(newMockEvent());
  projectCurrencyInfoUpdatedEvent.address = minterAddress;
  projectCurrencyInfoUpdatedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  projectCurrencyInfoUpdatedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  handleProjectCurrencyInfoUpdated(projectCurrencyInfoUpdatedEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleProjectCurrencyInfoUpdated should update project minter config currency info", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceERC20V0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.save();

  const newCurrencyAddress = randomAddressGenerator.generateRandomAddress();
  const newCurrencySymbol = "DAI";
  const projectCurrencyInfoUpdatedEvent: ProjectCurrencyInfoUpdated = changetype<
    ProjectCurrencyInfoUpdated
  >(newMockEvent());
  projectCurrencyInfoUpdatedEvent.address = minterAddress;
  projectCurrencyInfoUpdatedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_currencyAddress",
      ethereum.Value.fromAddress(newCurrencyAddress)
    ),
    new ethereum.EventParam(
      "_currencySymbol",
      ethereum.Value.fromString(newCurrencySymbol)
    )
  ];
  projectCurrencyInfoUpdatedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  assert.assertTrue(newCurrencyAddress != projectMinterConfig.currencyAddress);

  handleProjectCurrencyInfoUpdated(projectCurrencyInfoUpdatedEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "currencyAddress",
    newCurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "currencySymbol",
    newCurrencySymbol
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handlePurchaseToDisabledUpdated should do nothing if project is not in store", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  const purchaseToDisabledUpdatedEvent: PurchaseToDisabledUpdated = changetype<
    PurchaseToDisabledUpdated
  >(newMockEvent());
  purchaseToDisabledUpdatedEvent.address = minterAddress;
  purchaseToDisabledUpdatedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_purchaseToDisabled",
      ethereum.Value.fromBoolean(true)
    )
  ];
  purchaseToDisabledUpdatedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  handlePurchaseToDisabledUpdated(purchaseToDisabledUpdatedEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handlePurchaseToDisabledUpdated should update project minter config purchaseToDisabled", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterSetPriceV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    ONE_ETH_IN_WEI.div(BigInt.fromI32(10)),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.purchaseToDisabled = false;
  projectMinterConfig.save();

  const purchaseToDisabledUpdatedEvent: PurchaseToDisabledUpdated = changetype<
    PurchaseToDisabledUpdated
  >(newMockEvent());
  purchaseToDisabledUpdatedEvent.address = minterAddress;
  purchaseToDisabledUpdatedEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_purchaseToDisabled",
      ethereum.Value.fromBoolean(true)
    )
  ];
  purchaseToDisabledUpdatedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handlePurchaseToDisabledUpdated(purchaseToDisabledUpdatedEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "purchaseToDisabled",
    "true"
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleMinimumAuctionLengthSecondsUpdated should update minter with minimumAuctionLengthSeconds", () => {
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minter = new Minter(minterAddress.toHexString());
  minter.type = "MinterDALinV0";
  minter.minimumAuctionLengthInSeconds = BigInt.fromI32(300);
  minter.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  minter.save();

  const newMinimumAuctionLengthSeconds = BigInt.fromI32(600);
  const minimumAuctionLengthInSecondsUpdatedEvent: MinimumAuctionLengthSecondsUpdated = changetype<
    MinimumAuctionLengthSecondsUpdated
  >(newMockEvent());
  minimumAuctionLengthInSecondsUpdatedEvent.address = minterAddress;
  minimumAuctionLengthInSecondsUpdatedEvent.parameters = [
    new ethereum.EventParam(
      "_minimumAuctionLengthInSeconds",
      ethereum.Value.fromUnsignedBigInt(newMinimumAuctionLengthSeconds)
    )
  ];
  minimumAuctionLengthInSecondsUpdatedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleMinimumAuctionLengthSecondsUpdated(
    minimumAuctionLengthInSecondsUpdatedEvent
  );

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "minimumAuctionLengthInSeconds",
    newMinimumAuctionLengthSeconds.toString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleDALinV0SetAuctionDetails should do nothing if project is not in store", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDALinV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  const daLinV0SetAuctionDetailsEvent: DALinV0SetAuctionDetails = changetype<
    DALinV0SetAuctionDetails
  >(newMockEvent());
  daLinV0SetAuctionDetailsEvent.address = minterAddress;
  daLinV0SetAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  daLinV0SetAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  handleDALinV0SetAuctionDetails(daLinV0SetAuctionDetailsEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleDALinV0SetAuctionDetails should update project minter config auction details", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDALinV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.basePrice = BigInt.fromI32(0);
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.purchaseToDisabled = false;
  projectMinterConfig.save();

  const basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  const startPrice = ONE_ETH_IN_WEI;
  const startTime = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(100));
  const endTime = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(200));
  const setAuctionDetailsEvent: DALinV0SetAuctionDetails = changetype<
    DALinV0SetAuctionDetails
  >(newMockEvent());
  setAuctionDetailsEvent.address = minterAddress;
  setAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_auctionTimestampStart",
      ethereum.Value.fromUnsignedBigInt(startTime)
    ),
    new ethereum.EventParam(
      "_auctionTimestampEnd",
      ethereum.Value.fromUnsignedBigInt(endTime)
    ),
    new ethereum.EventParam(
      "_startPrice",
      ethereum.Value.fromUnsignedBigInt(startPrice)
    ),
    new ethereum.EventParam(
      "_basePrice",
      ethereum.Value.fromUnsignedBigInt(basePrice)
    )
  ];
  setAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleDALinV0SetAuctionDetails(setAuctionDetailsEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "basePrice",
    basePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "startPrice",
    startPrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "startTime",
    startTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "endTime",
    endTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "priceIsConfigured",
    "true"
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleDALinV0ResetAuctionDetails should do nothing if project is not in store", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDALinV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  const daLinV0ResetAuctionDetailsEvent: DALinV0ResetAuctionDetails = changetype<
    DALinV0ResetAuctionDetails
  >(newMockEvent());
  daLinV0ResetAuctionDetailsEvent.address = minterAddress;
  daLinV0ResetAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  daLinV0ResetAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  handleDALinV0ResetAuctionDetails(daLinV0ResetAuctionDetailsEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleDALinV0ResetAuctionDetails should reset project minter config auction details", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDALinV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(100)
  );
  projectMinterConfig.endTime = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(200)
  );
  projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
  projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  projectMinterConfig.priceIsConfigured = true;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.purchaseToDisabled = false;
  projectMinterConfig.save();

  const resetAuctionDetailsEvent: DALinV0ResetAuctionDetails = changetype<
    DALinV0ResetAuctionDetails
  >(newMockEvent());
  resetAuctionDetailsEvent.address = minterAddress;
  resetAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  resetAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleDALinV0ResetAuctionDetails(resetAuctionDetailsEvent);

  const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
    ProjectMinterConfiguration
  >(ProjectMinterConfiguration.load(projectMinterConfig.id));

  assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startTime === null);
  assert.assertTrue(updatedProjectMinterConfig.endTime === null);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "minter",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "priceIsConfigured",
    "false"
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "project",
    project.id
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleAuctionHalfLifeRangeSecondsUpdated should update minter half life range", () => {
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minter = new Minter(minterAddress.toHexString());
  minter.type = "MinterDAExpV0";
  minter.minimumHalfLifeInSeconds = BigInt.fromI32(300);
  minter.maximumHalfLifeInSeconds = BigInt.fromI32(5000);
  minter.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  minter.save();

  const newMinimumHalfLifeInSeconds = BigInt.fromI32(600);
  const newMaximumHalfLifeInSeconds = BigInt.fromI32(1200);
  const auctionHalfLifeRangeSecondsUpdatedEvent: AuctionHalfLifeRangeSecondsUpdated = changetype<
    AuctionHalfLifeRangeSecondsUpdated
  >(newMockEvent());
  auctionHalfLifeRangeSecondsUpdatedEvent.address = minterAddress;
  auctionHalfLifeRangeSecondsUpdatedEvent.parameters = [
    new ethereum.EventParam(
      "_minimumPriceDecayHalfLifeSeconds",
      ethereum.Value.fromUnsignedBigInt(newMinimumHalfLifeInSeconds)
    ),
    new ethereum.EventParam(
      "_maximumPriceDecayHalfLifeSeconds",
      ethereum.Value.fromUnsignedBigInt(newMaximumHalfLifeInSeconds)
    )
  ];
  auctionHalfLifeRangeSecondsUpdatedEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleAuctionHalfLifeRangeSecondsUpdated(
    auctionHalfLifeRangeSecondsUpdatedEvent
  );

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "minimumHalfLifeInSeconds",
    newMinimumHalfLifeInSeconds.toString()
  );
  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "maximumHalfLifeInSeconds",
    newMaximumHalfLifeInSeconds.toString()
  );

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minterAddress.toHexString(),
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleDAExpV0SetAuctionDetails should do nothing if project is not in store", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDAExpV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  const daExpV0SetAuctionDetailsEvent: DAExpV0SetAuctionDetails = changetype<
    DAExpV0SetAuctionDetails
  >(newMockEvent());
  daExpV0SetAuctionDetailsEvent.address = minterAddress;
  daExpV0SetAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  daExpV0SetAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  handleDAExpV0SetAuctionDetails(daExpV0SetAuctionDetailsEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleDAExpV0SetAuctionDetails should update project minter config auction details", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDALinV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.basePrice = BigInt.fromI32(0);
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.purchaseToDisabled = false;
  projectMinterConfig.save();

  const basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  const startPrice = ONE_ETH_IN_WEI;
  const startTime = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(100));
  const halfLifeSeconds = BigInt.fromI32(400);
  const setAuctionDetailsEvent: DAExpV0SetAuctionDetails = changetype<
    DAExpV0SetAuctionDetails
  >(newMockEvent());
  setAuctionDetailsEvent.address = minterAddress;
  setAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_auctionTimestampStart",
      ethereum.Value.fromUnsignedBigInt(startTime)
    ),
    new ethereum.EventParam(
      "_priceDecayHalfLifeSeconds",
      ethereum.Value.fromUnsignedBigInt(halfLifeSeconds)
    ),
    new ethereum.EventParam(
      "_startPrice",
      ethereum.Value.fromUnsignedBigInt(startPrice)
    ),
    new ethereum.EventParam(
      "_basePrice",
      ethereum.Value.fromUnsignedBigInt(basePrice)
    )
  ];
  setAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleDAExpV0SetAuctionDetails(setAuctionDetailsEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "basePrice",
    basePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "startPrice",
    startPrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "startTime",
    startTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "halfLifeSeconds",
    halfLifeSeconds.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "priceIsConfigured",
    "true"
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});

test("handleDAExpV0ResetAuctionDetails should do nothing if project is not in store", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDAExpV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  const daExpV0ResetAuctionDetailsEvent: DAExpV0ResetAuctionDetails = changetype<
    DAExpV0ResetAuctionDetails
  >(newMockEvent());
  daExpV0ResetAuctionDetailsEvent.address = minterAddress;
  daExpV0ResetAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  daExpV0ResetAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  handleDAExpV0ResetAuctionDetails(daExpV0ResetAuctionDetailsEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleDAExpV0ResetAuctionDetails should reset project minter config auction details", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDAExpV0";
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter.save();

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(100)
  );
  projectMinterConfig.halfLifeSeconds = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(300)
  );
  projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
  projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  projectMinterConfig.priceIsConfigured = true;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.purchaseToDisabled = false;
  projectMinterConfig.save();

  const resetAuctionDetailsEvent: DAExpV0ResetAuctionDetails = changetype<
    DAExpV0ResetAuctionDetails
  >(newMockEvent());
  resetAuctionDetailsEvent.address = minterAddress;
  resetAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  resetAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleDAExpV0ResetAuctionDetails(resetAuctionDetailsEvent);

  const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
    ProjectMinterConfiguration
  >(ProjectMinterConfiguration.load(projectMinterConfig.id));

  assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startTime === null);
  assert.assertTrue(updatedProjectMinterConfig.halfLifeSeconds === null);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "minter",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "priceIsConfigured",
    "false"
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    project.id,
    "project",
    project.id
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    project.id,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
});
