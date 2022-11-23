import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  clearStore,
  test,
  newMockEvent,
  describe,
  createMockedFunction
} from "matchstick-as/assembly/index";
import { ProjectMinterConfiguration, Receipt } from "../../../generated/schema";
import {
  addNewMinterToStore,
  addNewProjectMinterConfigToStore,
  addNewProjectToStore,
  CURRENT_BLOCK_TIMESTAMP,
  MINTER_ENTITY_TYPE,
  ONE_ETH_IN_WEI,
  PROJECT_ENTITY_TYPE,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  RECEIPT_ENTITY_TYPE,
  RandomAddressGenerator,
  TEST_CONTRACT_ADDRESS
} from "../shared-helpers";
import {
  generateContractSpecificId,
  getProjectMinterConfigId,
  getReceiptId
} from "../../../src/helpers";
// import events from generated minter-suite
// interfaces
import {
  PricePerTokenInWeiUpdated,
  ProjectCurrencyInfoUpdated,
  PurchaseToDisabledUpdated
} from "../../../generated/MinterSetPriceV0/IFilteredMinterV0";
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
// events not part of interfaces
import {
  SetAuctionDetails as DALinV0SetAuctionDetails,
  ResetAuctionDetails as DALinV0ResetAuctionDetails,
  MinimumAuctionLengthSecondsUpdated as DALinV0MinimumAuctionLengthSecondsUpdated
} from "../../../generated/MinterDALinV0/MinterDALinV0";
import {
  SetAuctionDetails as DALinV1SetAuctionDetails,
  ResetAuctionDetails as DALinV1ResetAuctionDetails,
  MinimumAuctionLengthSecondsUpdated as DALinV1MinimumAuctionLengthSecondsUpdated
} from "../../../generated/MinterDALinV1/MinterDALinV1";
import {
  SetAuctionDetails as DALinV2SetAuctionDetails,
  ResetAuctionDetails as DALinV2ResetAuctionDetails,
  MinimumAuctionLengthSecondsUpdated as DALinV2MinimumAuctionLengthSecondsUpdated
} from "../../../generated/MinterDALinV2/MinterDALinV2";
import {
  AuctionHalfLifeRangeSecondsUpdated as AuctionHalfLifeRangeSecondsUpdatedV0,
  SetAuctionDetails as DAExpV0SetAuctionDetails,
  ResetAuctionDetails as DAExpV0ResetAuctionDetails
} from "../../../generated/MinterDAExpV0/MinterDAExpV0";
import {
  AuctionHalfLifeRangeSecondsUpdated as AuctionHalfLifeRangeSecondsUpdatedV1,
  SetAuctionDetails as DAExpV1SetAuctionDetails,
  ResetAuctionDetails as DAExpV1ResetAuctionDetails
} from "../../../generated/MinterDAExpV1/MinterDAExpV1";
import {
  AuctionHalfLifeRangeSecondsUpdated as AuctionHalfLifeRangeSecondsUpdatedV2,
  SetAuctionDetails as DAExpV2SetAuctionDetails,
  ResetAuctionDetails as DAExpV2ResetAuctionDetails
} from "../../../generated/MinterDAExpV2/MinterDAExpV2";
import {
  AuctionHalfLifeRangeSecondsUpdated as AuctionHalfLifeRangeSecondsUpdatedRefund,
  SetAuctionDetails as DAExpRefundSetAuctionDetails,
  ResetAuctionDetails as DAExpRefundResetAuctionDetails,
  SelloutPriceUpdated,
  ReceiptUpdated,
  ArtistAndAdminRevenuesWithdrawn
} from "../../../generated/MinterDAExpRefundV0/IFilteredMinterDAExpRefundV0";
import {
  AllowedHoldersOfProjects as HolderV0AllowedHoldersOfProjects,
  RemovedHoldersOfProjects as HolderV0RemovedHoldersOfProjects,
  RegisteredNFTAddress as HolderV0RegisteredNFTAddress,
  UnregisteredNFTAddress as HolderV0UnregisteredNFTAddress
} from "../../../generated/MinterHolderV0/MinterHolderV0";
import {
  AllowedHoldersOfProjects as HolderV1AllowedHoldersOfProjects,
  RemovedHoldersOfProjects as HolderV1RemovedHoldersOfProjects,
  RegisteredNFTAddress as HolderV1RegisteredNFTAddress,
  UnregisteredNFTAddress as HolderV1UnregisteredNFTAddress
} from "../../../generated/MinterHolderV1/MinterHolderV1";
// import handlers from minter-suite-mapping
import {
  handleAddManyAddressValueProjectConfig as handleAddManyAddressValue,
  handleAddManyBigIntValueProjectConfig as handleAddManyBigIntValue,
  handleAddManyBytesValueProjectConfig as handleAddManyBytesValue,
  handleAllowHoldersOfProjectsV0,
  handleAllowHoldersOfProjectsV1,
  handleRemoveHoldersOfProjectsV0,
  handleRemoveHoldersOfProjectsV1,
  handleRegisteredNFTAddressV0,
  handleRegisteredNFTAddressV1,
  handleUnregisteredNFTAddressV0,
  handleUnregisteredNFTAddressV1,
  handleAuctionHalfLifeRangeSecondsUpdatedV0,
  handleAuctionHalfLifeRangeSecondsUpdatedV1,
  handleAuctionHalfLifeRangeSecondsUpdatedV2,
  handleDAExpResetAuctionDetailsV0,
  handleDAExpResetAuctionDetailsV1,
  handleDAExpResetAuctionDetailsV2,
  handleDAExpSetAuctionDetailsV0,
  handleDAExpSetAuctionDetailsV1,
  handleDAExpSetAuctionDetailsV2,
  handleDALinResetAuctionDetailsV0,
  handleDALinResetAuctionDetailsV1,
  handleDALinResetAuctionDetailsV2,
  handleDALinSetAuctionDetailsV0,
  handleDALinSetAuctionDetailsV1,
  handleDALinSetAuctionDetailsV2,
  handleMinimumAuctionLengthSecondsUpdatedV0,
  handleMinimumAuctionLengthSecondsUpdatedV1,
  handleMinimumAuctionLengthSecondsUpdatedV2,
  handlePricePerTokenInWeiUpdated,
  handleProjectCurrencyInfoUpdated,
  handlePurchaseToDisabledUpdated,
  handleRemoveBigIntManyValueProjectConfig as handleRemoveBigIntManyValue,
  handleRemoveBytesManyValueProjectConfig as handleRemoveBytesManyValue,
  handleRemoveValueProjectConfig as handleRemoveValue,
  handleSetAddressValueProjectConfig as handleSetAddressValue,
  handleSetBigIntValueProjectConfig as handleSetBigIntValue,
  handleSetBooleanValueProjectConfig as handleSetBooleanValue,
  handleSetBytesValueProjectConfig as handleSetBytesValue,
  handleAuctionHalfLifeRangeSecondsUpdatedRefund,
  handleDAExpRefundSetAuctionDetails,
  handleDAExpRefundResetAuctionDetails,
  handleSelloutPriceUpdated,
  handleReceiptUpdated,
  handleArtistAndAdminRevenuesWithdrawn
} from "../../../src/minter-suite-mapping";

import {
  DAExpMintersToTest,
  DALinMintersToTest,
  HolderMintersToTest
} from "./helpers";

const randomAddressGenerator = new RandomAddressGenerator();

describe("handlePricePerTokenInWeiUpdated", () => {
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

  test("should update project minter config pricePerTokenInWei", () => {
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
});

describe("handleProjectCurrencyInfoUpdated", () => {
  test("should do nothing if project is not in store", () => {
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

  test("should update project minter config currency info", () => {
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

    assert.assertTrue(
      newCurrencyAddress != projectMinterConfig.currencyAddress
    );

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
});

describe("handlePurchaseToDisabledUpdated", () => {
  test("should do nothing if project is not in store", () => {
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

  test("should update project minter config purchaseToDisabled", () => {
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
});

describe("MinterDALin-related tests", () => {
  describe("handleMinimumAuctionLengthSecondsUpdated", () => {
    test("should update minter with minimumAuctionLengthSeconds", () => {
      for (let i = 0; i < DALinMintersToTest.length; i++) {
        clearStore();
        const minter = addNewMinterToStore(DALinMintersToTest[i]);
        const minterAddress: Address = changetype<Address>(
          Address.fromHexString(minter.id)
        );
        const minterType = minter.type;
        minter.minimumAuctionLengthInSeconds = BigInt.fromI32(300);
        minter.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
        minter.save();

        const newMinimumAuctionLengthSeconds = BigInt.fromI32(600);
        const event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
          new ethereum.EventParam(
            "_minimumAuctionLengthInSeconds",
            ethereum.Value.fromUnsignedBigInt(newMinimumAuctionLengthSeconds)
          )
        ];
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        if (minterType == "MinterDALinV0") {
          handleMinimumAuctionLengthSecondsUpdatedV0(
            changetype<DALinV0MinimumAuctionLengthSecondsUpdated>(event)
          );
        } else if (minterType == "MinterDALinV1") {
          handleMinimumAuctionLengthSecondsUpdatedV1(
            changetype<DALinV1MinimumAuctionLengthSecondsUpdated>(event)
          );
        } else {
          handleMinimumAuctionLengthSecondsUpdatedV2(
            changetype<DALinV2MinimumAuctionLengthSecondsUpdated>(event)
          );
        }

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
      }
    });
  });

  describe("handleDALinSetAuctionDetails", () => {
    test("handleDALinSetAuctionDetails should do nothing if project is not in store", () => {
      for (let i = 0; i < DALinMintersToTest.length; i++) {
        clearStore();

        const minter = addNewMinterToStore(DALinMintersToTest[i]);
        const minterAddress: Address = changetype<Address>(
          Address.fromHexString(minter.id)
        );
        const minterType = minter.type;

        const projectId = BigInt.fromI32(0);
        const fullProjectId = generateContractSpecificId(
          TEST_CONTRACT_ADDRESS,
          projectId
        );

        const event = newMockEvent();
        const daLinV0SetAuctionDetailsEvent: DALinV0SetAuctionDetails = changetype<
          DALinV0SetAuctionDetails
        >(newMockEvent());
        event.address = minterAddress;
        event.parameters = [
          new ethereum.EventParam(
            "_projectId",
            ethereum.Value.fromUnsignedBigInt(projectId)
          )
        ];
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

        if (minterType == "MinterDALinV0") {
          handleDALinSetAuctionDetailsV0(
            changetype<DALinV0SetAuctionDetails>(event)
          );
        } else if (minterType == "MinterDALinV1") {
          handleDALinSetAuctionDetailsV1(
            changetype<DALinV1SetAuctionDetails>(event)
          );
        } else {
          handleDALinSetAuctionDetailsV2(
            changetype<DALinV2SetAuctionDetails>(event)
          );
        }

        assert.notInStore(
          PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
          fullProjectId
        );
      }
    });

    test("should update project minter config auction details", () => {
      for (let i = 0; i < DALinMintersToTest.length; i++) {
        clearStore();

        const minter = addNewMinterToStore(DALinMintersToTest[i]);
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
        const event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
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
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        if (minterType == "MinterDALinV0") {
          handleDALinSetAuctionDetailsV0(
            changetype<DALinV0SetAuctionDetails>(event)
          );
        } else if (minterType == "MinterDALinV1") {
          handleDALinSetAuctionDetailsV1(
            changetype<DALinV1SetAuctionDetails>(event)
          );
        } else {
          handleDALinSetAuctionDetailsV2(
            changetype<DALinV2SetAuctionDetails>(event)
          );
        }

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
      }
    });

    describe("handleDALinResetAuctionDetails", () => {
      test("should do nothing if project is not in store", () => {
        for (let i = 0; i < DALinMintersToTest.length; i++) {
          clearStore();
          const minter = addNewMinterToStore(DALinMintersToTest[i]);
          const minterAddress: Address = changetype<Address>(
            Address.fromHexString(minter.id)
          );
          const minterType = minter.type;

          const projectId = BigInt.fromI32(0);
          const fullProjectId = generateContractSpecificId(
            TEST_CONTRACT_ADDRESS,
            projectId
          );

          const event = newMockEvent();
          event.address = minterAddress;
          event.parameters = [
            new ethereum.EventParam(
              "_projectId",
              ethereum.Value.fromUnsignedBigInt(projectId)
            )
          ];
          event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

          assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

          if (minterType == "MinterDALinV0") {
            handleDALinResetAuctionDetailsV0(
              changetype<DALinV0ResetAuctionDetails>(event)
            );
          } else if (minterType == "MinterDALinV1") {
            handleDALinResetAuctionDetailsV1(
              changetype<DALinV1ResetAuctionDetails>(event)
            );
          } else {
            handleDALinResetAuctionDetailsV2(
              changetype<DALinV2ResetAuctionDetails>(event)
            );
          }

          assert.notInStore(
            PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
            fullProjectId
          );
        }
      });

      test("should reset project minter config auction details", () => {
        for (let i = 0; i < DALinMintersToTest.length; i++) {
          clearStore();

          const minter = addNewMinterToStore(DALinMintersToTest[i]);
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
          projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(
            BigInt.fromI32(10)
          );
          projectMinterConfig.priceIsConfigured = true;
          projectMinterConfig.currencyAddress = Address.zero();
          projectMinterConfig.currencySymbol = "ETH";
          projectMinterConfig.purchaseToDisabled = false;
          projectMinterConfig.save();

          const event = newMockEvent();
          event.address = minterAddress;
          event.parameters = [
            new ethereum.EventParam(
              "_projectId",
              ethereum.Value.fromUnsignedBigInt(projectId)
            )
          ];
          event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

          if (minterType == "MinterDALinV0") {
            handleDALinResetAuctionDetailsV0(
              changetype<DALinV0ResetAuctionDetails>(event)
            );
          } else if (minterType == "MinterDALinV1") {
            handleDALinResetAuctionDetailsV1(
              changetype<DALinV1ResetAuctionDetails>(event)
            );
          } else {
            handleDALinResetAuctionDetailsV2(
              changetype<DALinV2ResetAuctionDetails>(event)
            );
          }

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
        }
      });
    });
  });
});
describe("MinterDAExp-related tests", () => {
  describe("handleAuctionHalfLifeRangeSecondsUpdated", () => {
    test("should update minter half life range", () => {
      for (let i = 0; i < DAExpMintersToTest.length; i++) {
        clearStore();
        const minter = addNewMinterToStore(DAExpMintersToTest[i]);
        const minterAddress: Address = changetype<Address>(
          Address.fromHexString(minter.id)
        );
        const minterType = minter.type;
        minter.minimumHalfLifeInSeconds = BigInt.fromI32(300);
        minter.maximumHalfLifeInSeconds = BigInt.fromI32(5000);
        minter.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
        minter.save();

        const newMinimumHalfLifeInSeconds = BigInt.fromI32(600);
        const newMaximumHalfLifeInSeconds = BigInt.fromI32(1200);
        let event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
          new ethereum.EventParam(
            "_minimumPriceDecayHalfLifeSeconds",
            ethereum.Value.fromUnsignedBigInt(newMinimumHalfLifeInSeconds)
          ),
          new ethereum.EventParam(
            "_maximumPriceDecayHalfLifeSeconds",
            ethereum.Value.fromUnsignedBigInt(newMaximumHalfLifeInSeconds)
          )
        ];
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        if (minterType === "MinterDAExpV0") {
          handleAuctionHalfLifeRangeSecondsUpdatedV0(
            changetype<AuctionHalfLifeRangeSecondsUpdatedV0>(event)
          );
        } else if (minterType === "MinterDAExpV1") {
          handleAuctionHalfLifeRangeSecondsUpdatedV1(
            changetype<AuctionHalfLifeRangeSecondsUpdatedV1>(event)
          );
        } else if (minterType === "MinterDAExpV2") {
          handleAuctionHalfLifeRangeSecondsUpdatedV2(
            changetype<AuctionHalfLifeRangeSecondsUpdatedV2>(event)
          );
        } else {
          handleAuctionHalfLifeRangeSecondsUpdatedRefund(
            changetype<AuctionHalfLifeRangeSecondsUpdatedRefund>(event)
          );
        }

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
      }
    });
  });

  describe("handleDAExpSetAuctionDetails", () => {
    test("should do nothing if project is not in store", () => {
      for (let i = 0; i < DAExpMintersToTest.length; i++) {
        clearStore();
        const minter = addNewMinterToStore(DAExpMintersToTest[i]);
        const minterAddress: Address = changetype<Address>(
          Address.fromHexString(minter.id)
        );
        const minterType = minter.type;

        const projectId = BigInt.fromI32(0);
        const fullProjectId = generateContractSpecificId(
          TEST_CONTRACT_ADDRESS,
          projectId
        );

        const event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
          new ethereum.EventParam(
            "_projectId",
            ethereum.Value.fromUnsignedBigInt(projectId)
          )
        ];
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

        if (minterType === "MinterDAExpV0") {
          handleDAExpSetAuctionDetailsV0(
            changetype<DAExpV0SetAuctionDetails>(event)
          );
        } else if (minterType === "MinterDAExpV1") {
          handleDAExpSetAuctionDetailsV1(
            changetype<DAExpV1SetAuctionDetails>(event)
          );
        } else if (minterType === "MinterDAExpV2") {
          handleDAExpSetAuctionDetailsV2(
            changetype<DAExpV2SetAuctionDetails>(event)
          );
        } else {
          handleDAExpRefundSetAuctionDetails(
            changetype<DAExpRefundSetAuctionDetails>(event)
          );
        }

        assert.notInStore(
          PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
          fullProjectId
        );
      }
    });

    test("should update project minter config auction details", () => {
      for (let i = 0; i < DAExpMintersToTest.length; i++) {
        clearStore();

        const minter = addNewMinterToStore(DAExpMintersToTest[i]);
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
        const event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
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
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        if (minterType === "MinterDAExpV0") {
          handleDAExpSetAuctionDetailsV0(
            changetype<DAExpV0SetAuctionDetails>(event)
          );
        } else if (minterType === "MinterDAExpV1") {
          handleDAExpSetAuctionDetailsV1(
            changetype<DAExpV1SetAuctionDetails>(event)
          );
        } else if (minterType === "MinterDAExpV2") {
          handleDAExpSetAuctionDetailsV2(
            changetype<DAExpV2SetAuctionDetails>(event)
          );
        } else {
          handleDAExpRefundSetAuctionDetails(
            changetype<DAExpRefundSetAuctionDetails>(event)
          );
        }

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
      }
    });

    test("should update project minter config auction details with v1 event", () => {
      for (let i = 0; i < DAExpMintersToTest.length; i++) {
        clearStore();

        const minter = addNewMinterToStore(DAExpMintersToTest[i]);
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
        const event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
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
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        if (minterType === "MinterDAExpV0") {
          handleDAExpSetAuctionDetailsV0(
            changetype<DAExpV0SetAuctionDetails>(event)
          );
        } else if (minterType === "MinterDAExpV1") {
          handleDAExpSetAuctionDetailsV1(
            changetype<DAExpV1SetAuctionDetails>(event)
          );
        } else if (minterType === "MinterDAExpV2") {
          handleDAExpSetAuctionDetailsV2(
            changetype<DAExpV2SetAuctionDetails>(event)
          );
        } else {
          handleDAExpRefundSetAuctionDetails(
            changetype<DAExpRefundSetAuctionDetails>(event)
          );
        }

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
      }
    });
  });

  describe("handleDAExpResetAuctionDetails", () => {
    test("should do nothing if project is not in store", () => {
      for (let i = 0; i < DAExpMintersToTest.length; i++) {
        clearStore();

        const minter = addNewMinterToStore(DAExpMintersToTest[i]);
        const minterAddress: Address = changetype<Address>(
          Address.fromHexString(minter.id)
        );
        const minterType = minter.type;

        const projectId = BigInt.fromI32(0);
        const fullProjectId = generateContractSpecificId(
          TEST_CONTRACT_ADDRESS,
          projectId
        );

        const event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
          new ethereum.EventParam(
            "projectId",
            ethereum.Value.fromUnsignedBigInt(projectId)
          )
        ];
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

        if (minterType == "MinterDAExpV0") {
          handleDAExpResetAuctionDetailsV0(
            changetype<DAExpV0ResetAuctionDetails>(event)
          );
        } else if (minterType == "MinterDAExpV1") {
          handleDAExpResetAuctionDetailsV1(
            changetype<DAExpV1ResetAuctionDetails>(event)
          );
        } else if (minterType == "MinterDAExpV2") {
          handleDAExpResetAuctionDetailsV2(
            changetype<DAExpV2ResetAuctionDetails>(event)
          );
        } else {
          // fully populate event for refundable minter
          event.parameters.push(
            new ethereum.EventParam(
              "numPurchases",
              ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(5))
            )
          );
          event.parameters.push(
            new ethereum.EventParam(
              "latestPurchasePrice",
              ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000000))
            )
          );
          // handle refundable minter event
          handleDAExpRefundResetAuctionDetails(
            changetype<DAExpRefundResetAuctionDetails>(event)
          );
        }

        assert.notInStore(
          PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
          fullProjectId
        );
      }
    });

    test("should reset project minter config auction details", () => {
      for (let i = 0; i < DAExpMintersToTest.length; i++) {
        clearStore();

        const minter = addNewMinterToStore(DAExpMintersToTest[i]);
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

        const event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
          new ethereum.EventParam(
            "_projectId",
            ethereum.Value.fromUnsignedBigInt(projectId)
          )
        ];
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        if (minterType == "MinterDAExpV0") {
          handleDAExpResetAuctionDetailsV0(
            changetype<DAExpV0ResetAuctionDetails>(event)
          );
        } else if (minterType == "MinterDAExpV1") {
          handleDAExpResetAuctionDetailsV1(
            changetype<DAExpV1ResetAuctionDetails>(event)
          );
        } else if (minterType == "MinterDAExpV2") {
          handleDAExpResetAuctionDetailsV2(
            changetype<DAExpV2ResetAuctionDetails>(event)
          );
        } else {
          // fully populate event for refundable minter
          event.parameters.push(
            new ethereum.EventParam(
              "numPurchases",
              ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(5))
            )
          );
          event.parameters.push(
            new ethereum.EventParam(
              "latestPurchasePrice",
              ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000000))
            )
          );
          // handle refundable minter event
          handleDAExpRefundResetAuctionDetails(
            changetype<DAExpRefundResetAuctionDetails>(event)
          );
        }

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
      }
    });

    test("should reset project minter config auction details with v1 event", () => {
      for (let i = 0; i < DAExpMintersToTest.length; i++) {
        clearStore();

        const minter = addNewMinterToStore(DAExpMintersToTest[i]);
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

        const event = newMockEvent();
        event.address = minterAddress;
        event.parameters = [
          new ethereum.EventParam(
            "_projectId",
            ethereum.Value.fromUnsignedBigInt(projectId)
          )
        ];
        event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

        if (minterType == "MinterDAExpV0") {
          handleDAExpResetAuctionDetailsV0(
            changetype<DAExpV0ResetAuctionDetails>(event)
          );
        } else if (minterType == "MinterDAExpV1") {
          handleDAExpResetAuctionDetailsV1(
            changetype<DAExpV1ResetAuctionDetails>(event)
          );
        } else if (minterType == "MinterDAExpV2") {
          handleDAExpResetAuctionDetailsV2(
            changetype<DAExpV2ResetAuctionDetails>(event)
          );
        } else {
          // fully populate event for refundable minter
          event.parameters.push(
            new ethereum.EventParam(
              "numPurchases",
              ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(5))
            )
          );
          event.parameters.push(
            new ethereum.EventParam(
              "latestPurchasePrice",
              ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000000))
            )
          );
          // handle refundable minter event
          handleDAExpRefundResetAuctionDetails(
            changetype<DAExpRefundResetAuctionDetails>(event)
          );
        }

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
      }
    });
  });
});

describe("DAExpRefundMinters", () => {
  test("reflects updated receipt values after one receipt", () => {
    clearStore();
    const minter = addNewMinterToStore("MinterDAExpRefundV0");
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

    // define purchaser and net paid, qty purchased
    const purchaser = randomAddressGenerator.generateRandomAddress();
    const netPaid = ONE_ETH_IN_WEI;
    const actualPurchasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(2));
    let numPurchased = BigInt.fromI32(1);

    const event = newMockEvent();
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "_purchaser",
        ethereum.Value.fromAddress(purchaser)
      ),
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_netPaid",
        ethereum.Value.fromUnsignedBigInt(netPaid)
      ),
      new ethereum.EventParam(
        "_numPurchased",
        ethereum.Value.fromUnsignedBigInt(numPurchased)
      )
    ];
    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    // mock the minter functions used in handler
    // return latest purchase price of 100 wei
    createMockedFunction(
      minterAddress,
      "getProjectLatestPurchasePrice",
      "getProjectLatestPurchasePrice(uint256):(uint256)"
    )
      .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
      .returns([ethereum.Value.fromUnsignedBigInt(actualPurchasePrice)]);
    // return qty of refundable invocations of 1
    createMockedFunction(
      minterAddress,
      "getNumRefundableInvocations",
      "getNumRefundableInvocations(uint256):(uint256)"
    )
      .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
      .returns([ethereum.Value.fromI32(1)]);

    // handle refundable minter event
    handleReceiptUpdated(changetype<ReceiptUpdated>(event));

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      getProjectMinterConfigId(minterAddress.toHexString(), project.id),
      "extraMinterDetails",
      `{"refundableNetPrice":${actualPurchasePrice.toString()},"numRefundableInvocations":${1}}`
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "project",
      project.id
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "project",
      project.id
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "minter",
      minterAddress.toHexString()
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "account",
      purchaser.toHexString()
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "netPaid",
      netPaid.toString()
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "numPurchased",
      numPurchased.toString()
    );
  });

  test("reflects updated receipt values after two receipts", () => {
    clearStore();
    const minter = addNewMinterToStore("MinterDAExpRefundV0");
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

    // define purchaser and net paid, qty purchased
    const purchaser = randomAddressGenerator.generateRandomAddress();
    let netPaid = ONE_ETH_IN_WEI;
    let actualPurchasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(2));
    let numPurchased = BigInt.fromI32(1);

    const event = newMockEvent();
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "_purchaser",
        ethereum.Value.fromAddress(purchaser)
      ),
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_netPaid",
        ethereum.Value.fromUnsignedBigInt(netPaid)
      ),
      new ethereum.EventParam(
        "_numPurchased",
        ethereum.Value.fromUnsignedBigInt(numPurchased)
      )
    ];
    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    // mock the minter functions used in handler
    // return latest purchase price of 100 wei
    createMockedFunction(
      minterAddress,
      "getProjectLatestPurchasePrice",
      "getProjectLatestPurchasePrice(uint256):(uint256)"
    )
      .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
      .returns([ethereum.Value.fromUnsignedBigInt(actualPurchasePrice)]);
    // return qty of refundable invocations of 1
    createMockedFunction(
      minterAddress,
      "getNumRefundableInvocations",
      "getNumRefundableInvocations(uint256):(uint256)"
    )
      .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
      .returns([ethereum.Value.fromI32(1)]);

    // handle refundable minter event
    handleReceiptUpdated(changetype<ReceiptUpdated>(event));

    // mock the minter functions used in second handler call
    // update price and num purchased
    actualPurchasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(3));
    numPurchased = BigInt.fromI32(2);
    // return latest purchase price of 100 wei
    createMockedFunction(
      minterAddress,
      "getProjectLatestPurchasePrice",
      "getProjectLatestPurchasePrice(uint256):(uint256)"
    )
      .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
      .returns([ethereum.Value.fromUnsignedBigInt(actualPurchasePrice)]);
    // return qty of refundable invocations of 1
    createMockedFunction(
      minterAddress,
      "getNumRefundableInvocations",
      "getNumRefundableInvocations(uint256):(uint256)"
    )
      .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
      .returns([ethereum.Value.fromUnsignedBigInt(numPurchased)]);
    // update event values
    // net paid is now 1.5 eth
    netPaid = ONE_ETH_IN_WEI.plus(ONE_ETH_IN_WEI.div(BigInt.fromI32(2)));
    event.parameters = [
      new ethereum.EventParam(
        "_purchaser",
        ethereum.Value.fromAddress(purchaser)
      ),
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_netPaid",
        ethereum.Value.fromUnsignedBigInt(netPaid)
      ),
      new ethereum.EventParam(
        "_numPurchased",
        ethereum.Value.fromUnsignedBigInt(numPurchased)
      )
    ];

    // handle refundable minter event
    handleReceiptUpdated(changetype<ReceiptUpdated>(event));

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      getProjectMinterConfigId(minterAddress.toHexString(), project.id),
      "extraMinterDetails",
      `{"numRefundableInvocations":${numPurchased.toString()},"refundableNetPrice":${actualPurchasePrice.toString()}}`
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "project",
      project.id
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "project",
      project.id
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "minter",
      minterAddress.toHexString()
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "account",
      purchaser.toHexString()
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "netPaid",
      netPaid.toString()
    );
    assert.fieldEquals(
      RECEIPT_ENTITY_TYPE,
      getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
      "numPurchased",
      numPurchased.toString()
    );
  });
});

describe("Generic minter details", () => {
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
      '{"bigInt":100,"boolean":true,"address":' +
        '"' +
        addressString +
        '"' +
        "}"
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

    const configValueRemoveEvent: ConfigKeyRemoved = changetype<
      ConfigKeyRemoved
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
});

describe("MinterHolder-specific tests", () => {
  test("handleAllowHoldersOfProjects, can add address + project id to extraMinterDetails", () => {
    for (let i = 0; i < HolderMintersToTest.length; i++) {
      clearStore();
      const minter = addNewMinterToStore(HolderMintersToTest[i]);
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

      let event: ethereum.Event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
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
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

      if (minterType == "MinterHolderV0") {
        handleAllowHoldersOfProjectsV0(
          changetype<HolderV0AllowedHoldersOfProjects>(event)
        );
      } else {
        handleAllowHoldersOfProjectsV1(
          changetype<HolderV1AllowedHoldersOfProjects>(event)
        );
      }

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
    }
  });

  test("handleAllowHoldersOfProjects can add multiple address + project id to extraMinterDetails", () => {
    for (let i = 0; i < HolderMintersToTest.length; i++) {
      clearStore();
      const minter = addNewMinterToStore(HolderMintersToTest[i]);
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

      const event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
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
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

      if (minterType == "MinterHolderV0") {
        handleAllowHoldersOfProjectsV0(
          changetype<HolderV0AllowedHoldersOfProjects>(event)
        );
      } else {
        handleAllowHoldersOfProjectsV1(
          changetype<HolderV1AllowedHoldersOfProjects>(event)
        );
      }

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
    }
  });

  test("handleRemoveHoldersOfProjects can remove address + project id to extraMinterDetails", () => {
    for (let i = 0; i < HolderMintersToTest.length; i++) {
      clearStore();
      const minter = addNewMinterToStore(HolderMintersToTest[i]);
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

      const event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
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
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

      if (minterType == "MinterHolderV0") {
        handleRemoveHoldersOfProjectsV0(
          changetype<HolderV0RemovedHoldersOfProjects>(event)
        );
      } else {
        handleRemoveHoldersOfProjectsV1(
          changetype<HolderV1RemovedHoldersOfProjects>(event)
        );
      }

      assert.fieldEquals(
        PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
        getProjectMinterConfigId(minterAddress.toHexString(), project.id),
        "extraMinterDetails",
        '{"allowlistedAddressAndProjectId":["dontremove-0"]}'
      );
    }
  });

  test("handleRemoveHoldersOfProjects can remove multiple address + project id to extraMinterDetails", () => {
    for (let i = 0; i < HolderMintersToTest.length; i++) {
      clearStore();
      const minter = addNewMinterToStore(HolderMintersToTest[i]);
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

      const event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
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
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

      if (minterType == "MinterHolderV0") {
        handleRemoveHoldersOfProjectsV0(
          changetype<HolderV0RemovedHoldersOfProjects>(event)
        );
      } else {
        handleRemoveHoldersOfProjectsV1(
          changetype<HolderV1RemovedHoldersOfProjects>(event)
        );
      }

      assert.fieldEquals(
        PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
        getProjectMinterConfigId(minterAddress.toHexString(), project.id),
        "extraMinterDetails",
        '{"allowlistedAddressAndProjectId":["dontremove-0"]}'
      );
    }
  });

  test("handleRegisteredNFTAddress adds the address, as a string to the minter", () => {
    for (let i = 0; i < HolderMintersToTest.length; i++) {
      clearStore();
      const minter = addNewMinterToStore(HolderMintersToTest[i]);
      const minterAddress: Address = changetype<Address>(
        Address.fromHexString(minter.id)
      );
      const minterType = minter.type;
      minter.save();

      const testAddy = randomAddressGenerator.generateRandomAddress();

      const event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
        new ethereum.EventParam(
          "_NFTAddress",
          ethereum.Value.fromAddress(testAddy)
        )
      ];
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

      if (minterType == "MinterHolderV0") {
        handleRegisteredNFTAddressV0(
          changetype<HolderV0RegisteredNFTAddress>(event)
        );
      } else {
        handleRegisteredNFTAddressV1(
          changetype<HolderV1RegisteredNFTAddress>(event)
        );
      }

      assert.fieldEquals(
        MINTER_ENTITY_TYPE,
        minter.id,
        "extraMinterDetails",
        '{"registeredNFTAddresses":[' +
          '"' +
          testAddy.toHexString() +
          '"' +
          "]}"
      );
    }
  });

  test("handleUnRegisteredNFTAddress removes the address from the minter", () => {
    for (let i = 0; i < HolderMintersToTest.length; i++) {
      clearStore();
      const minterType = HolderMintersToTest[i];
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

      const event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
        new ethereum.EventParam(
          "_NFTAddress",
          ethereum.Value.fromAddress(testAddy)
        )
      ];
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

      if (minterType == "MinterHolderV0") {
        handleUnregisteredNFTAddressV0(
          changetype<HolderV0UnregisteredNFTAddress>(event)
        );
      } else {
        handleUnregisteredNFTAddressV1(
          changetype<HolderV1UnregisteredNFTAddress>(event)
        );
      }

      assert.fieldEquals(
        MINTER_ENTITY_TYPE,
        minter.id,
        "extraMinterDetails",
        '{"registeredNFTAddresses":["0x"]}'
      );
    }
  });
});
