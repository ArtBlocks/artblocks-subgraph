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
  addNewMinterToStore,
  addNewProjectMinterConfigToStore,
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
  handleAddManyAddressValueProjectConfig as handleAddManyAddressValue,
  handleAddManyBigIntValueProjectConfig as handleAddManyBigIntValue,
  handleAddManyBytesValueProjectConfig as handleAddManyBytesValue,
  handleAllowHoldersOfProjects,
  handleAuctionHalfLifeRangeSecondsUpdated,
  handleDAExpResetAuctionDetails,
  handleDAExpSetAuctionDetails,
  handleDALinResetAuctionDetails,
  handleDALinSetAuctionDetails,
  handleMinimumAuctionLengthSecondsUpdated,
  handlePricePerTokenInWeiUpdated,
  handleProjectCurrencyInfoUpdated,
  handlePurchaseToDisabledUpdated,
  handleRegisteredNFTAddress,
  handleRemoveBigIntManyValueProjectConfig as handleRemoveBigIntManyValue,
  handleRemoveBytesManyValueProjectConfig as handleRemoveBytesManyValue,
  handleRemoveHoldersOfProjects,
  handleRemoveValueProjectConfig as handleRemoveValue,
  handleSetAddressValueProjectConfig as handleSetAddressValue,
  handleSetBigIntValueProjectConfig as handleSetBigIntValue,
  handleSetBooleanValueProjectConfig as handleSetBooleanValue,
  handleSetBytesValueProjectConfig as handleSetBytesValue,
  handleUnregisteredNFTAddress
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
  AllowedHoldersOfProjects,
  RemovedHoldersOfProjects,
  RegisteredNFTAddress,
  UnregisteredNFTAddress
} from "../../../generated/MinterHolderV0/MinterHolderV0";

const randomAddressGenerator = new RandomAddressGenerator();

test("handlePricePerTokenInWeiUpdated should do nothing if project is not in store", () => {
  clearStore();

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterType = minter.type;
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

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

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterType = minter.type;
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

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
  projectMinterConfig.extraMinterDetails = "{}";
  projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.purchaseToDisabled = false;
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

  const minterType = "MinterSetPriceERC20V0";
  const minter = addNewMinterToStore(minterType);
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

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

  const minter = addNewMinterToStore("MinterSetPriceERC20V0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
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
  projectMinterConfig.extraMinterDetails = "{}";
  projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.purchaseToDisabled = false;
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

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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

  const minter = addNewMinterToStore("MinterSetPriceV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  addNewMinterToStore("MinterSetPriceV0");

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
  projectMinterConfig.extraMinterDetails = "{}";
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
  const minter = addNewMinterToStore("MinterDALinV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
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

  const minter = addNewMinterToStore("MinterDALinV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

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

  const minter = addNewMinterToStore("MinterDALinV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );

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
  projectMinterConfig.extraMinterDetails = "{}";
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

  const minter = addNewMinterToStore("MinterDALinV1");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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
  projectMinterConfig.extraMinterDetails = "{}";
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

  const minter = addNewMinterToStore("MinterDALinV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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

  const minter = addNewMinterToStore("MinterDALinV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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
  projectMinterConfig.extraMinterDetails = "{}";
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

  const minter = addNewMinterToStore("MinterDALinV1");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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
  projectMinterConfig.extraMinterDetails = "{}";
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
  const minter = addNewMinterToStore("MinterDAExpV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
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
  const minter = addNewMinterToStore("MinterDAExpV1");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
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

  const minter = addNewMinterToStore("MinterDAExpV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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

  const minter = addNewMinterToStore("MinterDALinV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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
  projectMinterConfig.extraMinterDetails = "{}";
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

  const minter = addNewMinterToStore("MinterDALinV1");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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
  projectMinterConfig.extraMinterDetails = "{}";
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

  const minter = addNewMinterToStore("MinterDAExpV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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

  const minter = addNewMinterToStore("MinterDAExpV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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
  projectMinterConfig.extraMinterDetails = "{}";
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

  const minter = addNewMinterToStore("MinterDAExpV1");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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
  projectMinterConfig.extraMinterDetails = "{}";
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
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );

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

  // If the bytes are not intended to be a human readable string
  // we should instead convert to their hex string representation
  // Always use the following hex string because valid WTF-8 but not valid
  // UTF-8, which is a somewhat common edge-case when dealing with bytes
  let eventValue = Bytes.fromHexString(
    "0x57e32bd396b7c3337dd6b4a672e6d99b47865e56"
  );
  const configValueSetEvent4: ConfigValueSetBytes = changetype<
    ConfigValueSetBytes
  >(newMockEvent());
  configValueSetEvent4.address = minterAddress;
  configValueSetEvent4.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("bytes"))
    ),
    new ethereum.EventParam("_value", ethereum.Value.fromBytes(eventValue))
  ];
  configValueSetEvent4.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleSetBytesValue(configValueSetEvent4);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"address":' +
      '"' +
      addressString +
      '"' +
      "," +
      '"bigInt":100,"boolean":true,"bytes":' +
      '"' +
      eventValue.toHexString() +
      '"' +
      "}"
  );
});
test("handleAddManyBigIntValue should add a value to an array at a designated key extraMinterDetails", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );

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
  configValueSetEvent.parameters[2] = new ethereum.EventParam(
    "_value",
    ethereum.Value.fromSignedBigInt(BigInt.fromI32(200))
  );
  handleAddManyBigIntValue(configValueSetEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"array":[100,200]}'
  );
});
test("handleAddManyBigIntValue should add a single value to an array at a designated key extraMinterDetails, when duplicate of same value is added", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );

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
    '{"array":[100]}'
  );
});
test("handleAddManyAddressValue should add a value to an array at a designated key extraMinterDetails", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );

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
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );

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

  // add another value, this time with bytes that should format to hex string
  const configValueSetEvent2: ConfigValueAddedToSetBytes = changetype<
    ConfigValueAddedToSetBytes
  >(newMockEvent());
  // Always use the following hex string because valid WTF-8 but not valid
  // UTF-8, which is a somewhat common edge-case when dealing with bytes
  let eventValue = Bytes.fromHexString(
    "0x57e32bd396b7c3337dd6b4a672e6d99b47865e56"
  );
  configValueSetEvent2.address = minterAddress;
  configValueSetEvent2.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_key",
      ethereum.Value.fromBytes(Bytes.fromUTF8("array"))
    ),
    new ethereum.EventParam("_value", ethereum.Value.fromBytes(eventValue))
  ];
  configValueSetEvent2.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleAddManyBytesValue(configValueSetEvent2);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"array":["im bytes","0x57e32bd396b7c3337dd6b4a672e6d99b47865e56"]}'
  );
});
test("handleRemoveValue should remove the key/value from extraMinterDetails", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );
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
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );
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
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );
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

test("handleAllowHoldersOfProjects can add address + project id to extraMinterDetails", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );

  let testAddy: Address = randomAddressGenerator.generateRandomAddress();

  const allowHoldersEvent: AllowedHoldersOfProjects = changetype<
    AllowedHoldersOfProjects
  >(newMockEvent());
  allowHoldersEvent.address = minterAddress;
  allowHoldersEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_ownedNFTAddresses",
      ethereum.Value.fromAddressArray([testAddy])
    ),
    new ethereum.EventParam(
      "_ownedNFTProjectIds",
      ethereum.Value.fromUnsignedBigIntArray([BigInt.fromI32(1)])
    )
  ];
  allowHoldersEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleAllowHoldersOfProjects(allowHoldersEvent);

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
test("handleAllowHoldersOfProjects can add multiple address + project id to extraMinterDetails", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );

  let testAddys: Array<Address> = [
    randomAddressGenerator.generateRandomAddress(),
    randomAddressGenerator.generateRandomAddress()
  ];

  const allowHoldersEvent: AllowedHoldersOfProjects = changetype<
    AllowedHoldersOfProjects
  >(newMockEvent());
  allowHoldersEvent.address = minterAddress;
  allowHoldersEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_ownedNFTAddresses",
      ethereum.Value.fromAddressArray(testAddys)
    ),
    new ethereum.EventParam(
      "_ownedNFTProjectIds",
      ethereum.Value.fromUnsignedBigIntArray([
        BigInt.fromI32(1),
        BigInt.fromI32(17)
      ])
    )
  ];
  allowHoldersEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleAllowHoldersOfProjects(allowHoldersEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"allowlistedAddressAndProjectId":["' +
      testAddys[0].toHexString() +
      '-1","' +
      testAddys[1].toHexString() +
      '-17"]}'
  );
});
test("handleRemoveHoldersOfProjects can remove address + project id to extraMinterDetails", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

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

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );
  projectMinterConfig.extraMinterDetails =
    '{"allowlistedAddressAndProjectId":["' +
    testAddy.toHexString() +
    '-1","dontremove-0"]}';
  projectMinterConfig.save();

  const removeHoldersEvent: RemovedHoldersOfProjects = changetype<
    RemovedHoldersOfProjects
  >(newMockEvent());
  removeHoldersEvent.address = minterAddress;
  removeHoldersEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_ownedNFTAddresses",
      ethereum.Value.fromAddressArray([testAddy])
    ),
    new ethereum.EventParam(
      "_ownedNFTProjectIds",
      ethereum.Value.fromUnsignedBigIntArray([BigInt.fromI32(1)])
    )
  ];
  removeHoldersEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleRemoveHoldersOfProjects(removeHoldersEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"allowlistedAddressAndProjectId":["dontremove-0"]}'
  );
});
test("handleRemoveHoldersOfProjects can remove multiple address + project id to extraMinterDetails", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  const minterType = minter.type;

  const projectId = BigInt.fromI32(0);
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    projectId,
    "project 0",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10))
  );

  let testAddys = [
    randomAddressGenerator.generateRandomAddress(),
    randomAddressGenerator.generateRandomAddress()
  ];

  const projectMinterConfig = addNewProjectMinterConfigToStore(
    project.id,
    minterAddress
  );
  projectMinterConfig.extraMinterDetails =
    '{"allowlistedAddressAndProjectId":["' +
    testAddys[0].toHexString() +
    '-1","' +
    testAddys[1].toHexString() +
    '-17","dontremove-0"]}';
  projectMinterConfig.save();

  const removeHoldersEvent: RemovedHoldersOfProjects = changetype<
    RemovedHoldersOfProjects
  >(newMockEvent());
  removeHoldersEvent.address = minterAddress;
  removeHoldersEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_ownedNFTAddresses",
      ethereum.Value.fromAddressArray(testAddys)
    ),
    new ethereum.EventParam(
      "_ownedNFTProjectIds",
      ethereum.Value.fromUnsignedBigIntArray([
        BigInt.fromI32(1),
        BigInt.fromI32(17)
      ])
    )
  ];
  removeHoldersEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleRemoveHoldersOfProjects(removeHoldersEvent);

  assert.fieldEquals(
    PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
    getProjectMinterConfigId(minterAddress.toHexString(), project.id),
    "extraMinterDetails",
    '{"allowlistedAddressAndProjectId":["dontremove-0"]}'
  );
});
test("handleRegisteredNFTAddress adds the address, as a string to the minter", () => {
  clearStore();
  const minter = addNewMinterToStore("MinterHolderV0");
  const minterAddress: Address = changetype<Address>(
    Address.fromHexString(minter.id)
  );
  minter.save();

  const testAddy = randomAddressGenerator.generateRandomAddress();

  const registerNFTAddressEvent: RegisteredNFTAddress = changetype<
    RegisteredNFTAddress
  >(newMockEvent());
  registerNFTAddressEvent.address = minterAddress;
  registerNFTAddressEvent.parameters = [
    new ethereum.EventParam("_NFTAddress", ethereum.Value.fromAddress(testAddy))
  ];
  registerNFTAddressEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleRegisteredNFTAddress(registerNFTAddressEvent);

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minter.id,
    "extraMinterDetails",
    '{"registeredNFTAddresses":[' + '"' + testAddy.toHexString() + '"' + "]}"
  );
});
test("handleUnRegisteredNFTAddress removes the address from the minter", () => {
  clearStore();
  const minterType = "MinterHolderV0";
  const minter = addNewMinterToStore(minterType);
  const minterAddress = Address.fromString(minter.id);

  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.type = minterType;
  minter;
  const testAddy = randomAddressGenerator.generateRandomAddress();
  minter.extraMinterDetails =
    '{"registeredNFTAddresses":' +
    "[" +
    '"' +
    testAddy.toHexString() +
    '"' +
    "," +
    '"' +
    "0x" +
    '"' +
    "]}";
  minter.save();

  const unregisterNFTAddressEvent: UnregisteredNFTAddress = changetype<
    UnregisteredNFTAddress
  >(newMockEvent());
  unregisterNFTAddressEvent.address = minterAddress;
  unregisterNFTAddressEvent.parameters = [
    new ethereum.EventParam("_NFTAddress", ethereum.Value.fromAddress(testAddy))
  ];
  unregisterNFTAddressEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  handleUnregisteredNFTAddress(unregisterNFTAddressEvent);

  assert.fieldEquals(
    MINTER_ENTITY_TYPE,
    minter.id,
    "extraMinterDetails",
    '{"registeredNFTAddresses":["0x"]}'
  );
});
