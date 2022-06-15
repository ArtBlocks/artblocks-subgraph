import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  clearStore,
  test,
  newMockEvent,
  logStore
} from "matchstick-as/assembly/index";
import { Minter, ProjectMinterConfiguration } from "../../../generated/schema";
import {
  addNewProjectToStore,
  CURRENT_BLOCK_TIMESTAMP,
  MINTER_ENTITY_TYPE,
  ONE_ETH_IN_WEI,
  PROJECT_ENTITY_TYPE,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  RandomAddressGenerator,
  TEST_CONTRACT_ADDRESS
} from "../shared-helpers";
import {
  generateContractSpecificId,
  getProjectMinterConfigId
} from "../../../src/helpers";
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
  SetAuctionDetails as DALinV1SetAuctionDetails,
  ResetAuctionDetails as DALinV1ResetAuctionDetails,
  MinimumAuctionLengthSecondsUpdated as DALinV1MinimumAuctionLengthSecondsUpdated
} from "../../../generated/MinterDALinV1/MinterDALinV1";
import {
  handleAddManyAddressValue,
  handleAddManyBigIntValue,
  handleAddManyBytesValue,
  handleAllowHoldersOfProject,
  handleAuctionHalfLifeRangeSecondsUpdated,
  handleDAExpResetAuctionDetails,
  handleDAExpSetAuctionDetails,
  handleDALinResetAuctionDetails,
  handleDALinSetAuctionDetails,
  handleMinimumAuctionLengthSecondsUpdated,
  handlePricePerTokenInWeiUpdated,
  handleProjectCurrencyInfoUpdated,
  handlePurchaseToDisabledUpdated,
  handleRemoveBigIntManyValue,
  handleRemoveBytesManyValue,
  handleRemoveHoldersOfProject,
  handleRemoveValue,
  handleSetAddressValue,
  handleSetBigIntValue,
  handleSetBooleanValue,
  handleSetBytesValue
} from "../../../src/minter-suite-mapping";
import {
  AuctionHalfLifeRangeSecondsUpdated,
  SetAuctionDetails as DAExpV0SetAuctionDetails,
  ResetAuctionDetails as DAExpV0ResetAuctionDetails
} from "../../../generated/MinterDAExpV0/MinterDAExpV0";
import {
  AuctionHalfLifeRangeSecondsUpdated as AuctionHalfLifeRangeSecondsUpdatedV1,
  SetAuctionDetails as DAExpV1SetAuctionDetails,
  ResetAuctionDetails as DAExpV1ResetAuctionDetails
} from "../../../generated/MinterDAExpV1/MinterDAExpV1";
import {
  ConfigKeyRemoved,
  ConfigValueAddedToSet as ConfigValueAddedToSetBigInt,
  ConfigValueAddedToSet1 as ConfigValueAddedToSetAddress,
  ConfigValueAddedToSet2 as ConfigValueAddedToSetBytes,
  ConfigValueRemovedFromSet as ConfigValueRemovedFromSetBigInt,
  ConfigValueRemovedFromSet1 as ConfigValueRemovedFromSetAddress,
  ConfigValueRemovedFromSet2 as ConfigValueRemovedFromSetBytes,
  ConfigValueSet as ConfigValueSetBool,
  ConfigValueSet1 as ConfigValueSetBigInt,
  ConfigValueSet2 as ConfigValueSetAddress,
  ConfigValueSet3 as ConfigValueSetBytes
} from "../../../generated/MinterFilterV0/IFilteredMinterV1";
import {
  AllowHoldersOfProject,
  RemovedHoldersOfProject
} from "../../../generated/MinterFilterV0/MinterHolderV0";

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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "basePrice",
    newPricePerTokenInWei.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "currencyAddress",
    newCurrencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

test("handleDALinSetAuctionDetails should do nothing if project is not in store", () => {
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

  handleDALinSetAuctionDetails(daLinV0SetAuctionDetailsEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleDALinSetAuctionDetails should update project minter config auction details", () => {
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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

  handleDALinSetAuctionDetails(setAuctionDetailsEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "basePrice",
    basePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "startPrice",
    startPrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "startTime",
    startTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "endTime",
    endTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

test("handleDALinSetAuctionDetails should update project minter config auction details with v1 event", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDALinV1";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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
  const setAuctionDetailsEvent: DALinV1SetAuctionDetails = changetype<
    DALinV1SetAuctionDetails
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

  handleDALinSetAuctionDetails(setAuctionDetailsEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "basePrice",
    basePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "startPrice",
    startPrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "startTime",
    startTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "endTime",
    endTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

test("handleDALinResetAuctionDetails should do nothing if project is not in store", () => {
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

  handleDALinResetAuctionDetails(daLinV0ResetAuctionDetailsEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleDALinResetAuctionDetails should reset project minter config auction details", () => {
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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

  handleDALinResetAuctionDetails(resetAuctionDetailsEvent);

  const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
    ProjectMinterConfiguration
  >(ProjectMinterConfiguration.load(projectMinterConfig.id));

  assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startTime === null);
  assert.assertTrue(updatedProjectMinterConfig.endTime === null);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "minter",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "priceIsConfigured",
    "false"
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

test("handleDALinResetAuctionDetails should reset project minter config auction details with v1 event", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDALinV1";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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

  const resetAuctionDetailsEvent: DALinV1ResetAuctionDetails = changetype<
    DALinV1ResetAuctionDetails
  >(newMockEvent());
  resetAuctionDetailsEvent.address = minterAddress;
  resetAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  resetAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleDALinResetAuctionDetails(resetAuctionDetailsEvent);

  const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
    ProjectMinterConfiguration
  >(ProjectMinterConfiguration.load(projectMinterConfig.id));

  assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startTime === null);
  assert.assertTrue(updatedProjectMinterConfig.endTime === null);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "minter",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "priceIsConfigured",
    "false"
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

test("handleAuctionHalfLifeRangeSecondsUpdated should update minter half life range with v1 event", () => {
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minter = new Minter(minterAddress.toHexString());
  minter.type = "MinterDAExpV1";
  minter.minimumHalfLifeInSeconds = BigInt.fromI32(300);
  minter.maximumHalfLifeInSeconds = BigInt.fromI32(5000);
  minter.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  minter.save();

  const newMinimumHalfLifeInSeconds = BigInt.fromI32(600);
  const newMaximumHalfLifeInSeconds = BigInt.fromI32(1200);
  const auctionHalfLifeRangeSecondsUpdatedEvent: AuctionHalfLifeRangeSecondsUpdatedV1 = changetype<
    AuctionHalfLifeRangeSecondsUpdatedV1
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

test("handleDAExpSetAuctionDetails should do nothing if project is not in store", () => {
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

  handleDAExpSetAuctionDetails(daExpV0SetAuctionDetailsEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleDAExpSetAuctionDetails should update project minter config auction details", () => {
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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

  handleDAExpSetAuctionDetails(setAuctionDetailsEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "basePrice",
    basePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "startPrice",
    startPrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "startTime",
    startTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "halfLifeSeconds",
    halfLifeSeconds.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

test("handleDAExpSetAuctionDetails should update project minter config auction details with v1 event", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDALinV1";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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
  const setAuctionDetailsEvent: DAExpV1SetAuctionDetails = changetype<
    DAExpV1SetAuctionDetails
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

  handleDAExpSetAuctionDetails(setAuctionDetailsEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "basePrice",
    basePrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "startPrice",
    startPrice.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "startTime",
    startTime.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "halfLifeSeconds",
    halfLifeSeconds.toString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

test("handleDAExpResetAuctionDetails should do nothing if project is not in store", () => {
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

  handleDAExpResetAuctionDetails(daExpV0ResetAuctionDetailsEvent);

  assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
});

test("handleDAExpResetAuctionDetails should reset project minter config auction details", () => {
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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

  handleDAExpResetAuctionDetails(resetAuctionDetailsEvent);

  const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
    ProjectMinterConfiguration
  >(ProjectMinterConfiguration.load(projectMinterConfig.id));

  assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startTime === null);
  assert.assertTrue(updatedProjectMinterConfig.halfLifeSeconds === null);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "minter",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "priceIsConfigured",
    "false"
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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

test("handleDAExpResetAuctionDetails should reset project minter config auction details with v1 event", () => {
  clearStore();

  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterDAExpV1";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
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

  const resetAuctionDetailsEvent: DAExpV1ResetAuctionDetails = changetype<
    DAExpV1ResetAuctionDetails
  >(newMockEvent());
  resetAuctionDetailsEvent.address = minterAddress;
  resetAuctionDetailsEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];
  resetAuctionDetailsEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleDAExpResetAuctionDetails(resetAuctionDetailsEvent);

  const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
    ProjectMinterConfiguration
  >(ProjectMinterConfiguration.load(projectMinterConfig.id));

  assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
  assert.assertTrue(updatedProjectMinterConfig.startTime === null);
  assert.assertTrue(updatedProjectMinterConfig.halfLifeSeconds === null);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "minter",
    minterAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "priceIsConfigured",
    "false"
  );
  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
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
test("handleSetValue should set all values to a designated key in extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.save();

  const configValueSetEvent: ConfigValueSetBool = changetype<
    ConfigValueSetBool
  >(newMockEvent());
  configValueSetEvent.address = minterAddress;
  configValueSetEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("boolean"))
    ),
    new ethereum.EventParam("_value", ethereum.Value.fromBoolean(true))
  ];
  configValueSetEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleSetBooleanValue(configValueSetEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"boolean":true}'
  );

  const configValueSetEvent1: ConfigValueSetBigInt = changetype<
    ConfigValueSetBigInt
  >(newMockEvent());
  configValueSetEvent1.address = minterAddress;
  configValueSetEvent1.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("bigInt"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromSignedBigInt(BigInt.fromI32(100))
    )
  ];
  configValueSetEvent1.block.timestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );

  handleSetBigIntValue(configValueSetEvent1);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"boolean":true,"bigInt":100}'
  );
  const configValueSetEvent2: ConfigValueSetAddress = changetype<
    ConfigValueSetAddress
  >(newMockEvent());
  const testAddy = randomAddressGenerator.generateRandomAddress();
  configValueSetEvent2.address = minterAddress;
  configValueSetEvent2.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("address"))
    ),
    new ethereum.EventParam("_value", ethereum.Value.fromAddress(testAddy))
  ];
  configValueSetEvent2.block.timestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(20)
  );

  handleSetAddressValue(configValueSetEvent2);

  const addressString = "" + testAddy.toHexString();

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"bigInt":100,"boolean":true,"address":' + '"' + addressString + '"' + "}"
  );
  const configValueSetEvent3: ConfigValueSetBytes = changetype<
    ConfigValueSetBytes
  >(newMockEvent());
  configValueSetEvent3.address = minterAddress;
  configValueSetEvent3.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("bytes"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromBytes(Bytes.fromUTF8("im bytes"))
    )
  ];
  configValueSetEvent3.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleSetBytesValue(configValueSetEvent3);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"address":' +
      '"' +
      addressString +
      '"' +
      "," +
      '"bigInt":100,"boolean":true,"bytes":"im bytes"}'
  );
});
test("handleAddManyBigIntValue should add a value to an array at a designated key extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.save();

  const configValueSetEvent: ConfigValueAddedToSetBigInt = changetype<
    ConfigValueAddedToSetBigInt
  >(newMockEvent());
  configValueSetEvent.address = minterAddress;
  configValueSetEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("array"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromSignedBigInt(BigInt.fromI32(100))
    )
  ];
  configValueSetEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleAddManyBigIntValue(configValueSetEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"array":[100]}'
  );

  handleAddManyBigIntValue(configValueSetEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"array":[100,100]}'
  );
});
test("handleAddManyAddressValue should add a value to an array at a designated key extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.save();

  const testAddy = randomAddressGenerator.generateRandomAddress();

  const configValueSetEvent: ConfigValueAddedToSetAddress = changetype<
    ConfigValueAddedToSetAddress
  >(newMockEvent());
  configValueSetEvent.address = minterAddress;
  configValueSetEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("array"))
    ),
    new ethereum.EventParam("_value", ethereum.Value.fromAddress(testAddy))
  ];
  configValueSetEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleAddManyAddressValue(configValueSetEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"array":[' + '"' + testAddy.toHexString() + '"' + "]}"
  );
});
test("handleAddManyBytesValue should add a value to an array at a designated key extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.save();

  const configValueSetEvent: ConfigValueAddedToSetBytes = changetype<
    ConfigValueAddedToSetBytes
  >(newMockEvent());
  configValueSetEvent.address = minterAddress;
  configValueSetEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("array"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromBytes(Bytes.fromUTF8("im bytes"))
    )
  ];
  configValueSetEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleAddManyBytesValue(configValueSetEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"array":["im bytes"]}'
  );

  handleAddManyBytesValue(configValueSetEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"array":["im bytes","im bytes"]}'
  );
});
test("handleRemoveValue should remove the key/value from extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.extraMinterDetails =
    '{"addresses": "hi","removeMe": "please"}';
  projectMinterConfig.save();

  const configValueRemoveEvent: ConfigKeyRemoved = changetype<ConfigKeyRemoved>(
    newMockEvent()
  );
  configValueRemoveEvent.address = minterAddress;
  configValueRemoveEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("removeMe"))
    )
  ];
  configValueRemoveEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleRemoveValue(configValueRemoveEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"addresses":"hi"}'
  );
});
test("handleRemoveBigIntManyValue should remove the key/value from extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.extraMinterDetails =
    '{"addresses": "hi","removeMe": [100, 200]}';
  projectMinterConfig.save();

  const configValueRemoveEvent: ConfigValueRemovedFromSetBigInt = changetype<
    ConfigValueRemovedFromSetBigInt
  >(newMockEvent());
  configValueRemoveEvent.address = minterAddress;
  configValueRemoveEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("removeMe"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromSignedBigInt(BigInt.fromI32(100))
    )
  ];
  configValueRemoveEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleRemoveBigIntManyValue(configValueRemoveEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"addresses":"hi","removeMe":[200]}'
  );
});
test("handleRemoveBytesManyValue should remove the key/value from extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.extraMinterDetails =
    '{"addresses": "hi","removeMe": ["alive", "dead"]}';
  projectMinterConfig.save();

  const configValueRemoveEvent: ConfigValueRemovedFromSetBytes = changetype<
    ConfigValueRemovedFromSetBytes
  >(newMockEvent());
  configValueRemoveEvent.address = minterAddress;
  configValueRemoveEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("removeMe"))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromBytes(Bytes.fromUTF8("dead"))
    )
  ];

  configValueRemoveEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleRemoveBytesManyValue(configValueRemoveEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"addresses":"hi","removeMe":["alive"]}'
  );
});
test("handleAllowHoldersOfProject can add address + project id to extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.save();

  let testAddy = randomAddressGenerator.generateRandomAddress();

  const allowHolderEvent: AllowHoldersOfProject = changetype<
    AllowHoldersOfProject
  >(newMockEvent());
  allowHolderEvent.address = minterAddress;
  allowHolderEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_ownedNftAddress",
      ethereum.Value.fromAddress(testAddy)
    ),
    new ethereum.EventParam(
      "_ownedNftProjectId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
    )
  ];
  allowHolderEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleAllowHoldersOfProject(allowHolderEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"allowlistedAddressAndProjectId":[' +
      '"' +
      testAddy.toHexString() +
      "-" +
      "1" +
      '"' +
      "]}"
  );
});
test("handleRemoveHoldersOfProject can remove address + project id to extraMinterDetails", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = "MinterHolderV0";
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

  let testAddy = randomAddressGenerator.generateRandomAddress();

  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = project.id;
  projectMinterConfig.extraMinterDetails =
    '{"allowlistedAddressAndProjectId":' +
    "[" +
    '"' +
    testAddy.toHexString() +
    "-1" +
    '"' +
    "," +
    '"' +
    "dontremove-0" +
    '"' +
    "]}";
  projectMinterConfig.save();

  const removeHolderEvent: RemovedHoldersOfProject = changetype<
    RemovedHoldersOfProject
  >(newMockEvent());
  removeHolderEvent.address = minterAddress;
  removeHolderEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_ownedNftAddress",
      ethereum.Value.fromAddress(testAddy)
    ),
    new ethereum.EventParam(
      "_ownedNftProjectId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
    )
  ];
  removeHolderEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleRemoveHoldersOfProject(removeHolderEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"allowlistedAddressAndProjectId":["dontremove-0"]}'
  );
});
