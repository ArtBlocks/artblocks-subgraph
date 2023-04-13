import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  clearStore,
  test,
  newMockEvent,
  describe,
  createMockedFunction,
  beforeEach
} from "matchstick-as/assembly/index";
import { ProjectMinterConfiguration, Minter } from "../../../generated/schema";
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
  TEST_CONTRACT_ADDRESS,
  assertJsonFieldEquals,
  getJsonStringFromInputs
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
} from "../../../generated/MinterSetPrice/IFilteredMinterV2";
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
} from "../../../generated/MinterFilterV0/IFilteredMinterV2";

import {
  SetAuctionDetails as DALinSetAuctionDetails,
  ResetAuctionDetails as DALinResetAuctionDetails,
  MinimumAuctionLengthSecondsUpdated
} from "../../../generated/MinterDALin/IFilteredMinterDALinV1";

import {
  AuctionHalfLifeRangeSecondsUpdated,
  SetAuctionDetails as DAExpSetAuctionDetails,
  ResetAuctionDetails as DAExpResetAuctionDetails
} from "../../../generated/MinterDAExp/IFilteredMinterDAExpV1";

import {
  AllowedHoldersOfProjects,
  RemovedHoldersOfProjects,
  RegisteredNFTAddress as HolderRegisteredNFTAddress,
  UnregisteredNFTAddress as HolderUnregisteredNFTAddress,
  DelegationRegistryUpdated as MinterHolderDelegationRegistryUpdated
} from "../../../generated/MinterHolder/IFilteredMinterHolderV2";

import { DelegationRegistryUpdated as MinterMerkleDelegationRegistryUpdated } from "../../../generated/MinterMerkle/IFilteredMinterMerkleV2";

import {
  ResetAuctionDetails as DAExpSettlementResetAuctionDetails,
  SelloutPriceUpdated,
  ReceiptUpdated,
  ArtistAndAdminRevenuesWithdrawn
} from "../../../generated/MinterDAExpSettlement/IFilteredMinterDAExpSettlementV1";

import {
  AuctionDurationSecondsRangeUpdated,
  MinterMinBidIncrementPercentageUpdated,
  MinterTimeBufferUpdated,
  ConfiguredFutureAuctions,
  ResetAuctionDetails,
  AuctionInitialized,
  AuctionBid,
  AuctionSettled,
  ProjectNextTokenUpdated,
  ProjectNextTokenEjected
} from "../../../generated/MinterSEA/IFilteredMinterSEAV0";

import { ProjectMaxInvocationsLimitUpdated } from "../../../generated/MinterSetPrice/IFilteredMinterV2";

// import handlers from minter-suite-mapping
import {
  handleAddManyAddressValueProjectConfig as handleAddManyAddressValue,
  handleAddManyBigIntValueProjectConfig as handleAddManyBigIntValue,
  handleAddManyBytesValueProjectConfig as handleAddManyBytesValue,
  handleAllowHoldersOfProjects,
  handleRemoveHoldersOfProjects,
  handleRegisteredNFTAddress,
  handleUnregisteredNFTAddress,
  handleMerkleDelegationRegistryUpdated,
  handleHolderDelegationRegistryUpdated,
  handleAuctionHalfLifeRangeSecondsUpdated,
  handleDAExpResetAuctionDetails,
  handleDAExpSetAuctionDetails,
  handleDALinResetAuctionDetails,
  handleDALinSetAuctionDetails,
  handleMinimumAuctionLengthSecondsUpdated,
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
  handleDAExpSettlementResetAuctionDetails,
  handleSelloutPriceUpdated,
  handleReceiptUpdated,
  handleArtistAndAdminRevenuesWithdrawn,
  handleProjectMaxInvocationsLimitUpdated,
  handleAuctionDurationSecondsRangeUpdated,
  handleMinterMinBidIncrementPercentageUpdated,
  handleMinterTimeBufferUpdated,
  handleConfiguredFutureAuctions,
  handleResetAuctionDetails,
  handleAuctionInitialized,
  handleAuctionBid,
  handleAuctionSettled,
  handleProjectNextTokenUpdated,
  handleProjectNextTokenEjected
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
        // @dev Deprecated fields ----------------
        minter.minimumAuctionLengthInSeconds = BigInt.fromI32(300);
        // ---------------------------------------
        minter.extraMinterDetails = getJsonStringFromInputs(
          ["minimumAuctionLengthInSeconds"],
          [BigInt.fromI32(300).toString()]
        );
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

        handleMinimumAuctionLengthSecondsUpdated(
          changetype<MinimumAuctionLengthSecondsUpdated>(event)
        );

        // assert expected updates to extraMinterDetails
        let updatedMinter = Minter.load(minterAddress.toHexString());
        if (updatedMinter == null) {
          throw new Error("minter config should not be null");
        }
        assertJsonFieldEquals(
          updatedMinter.extraMinterDetails,
          "minimumAuctionLengthInSeconds",
          newMinimumAuctionLengthSeconds.toString()
        );
        // @dev Deprecated fields ----------------
        assert.fieldEquals(
          MINTER_ENTITY_TYPE,
          minterAddress.toHexString(),
          "minimumAuctionLengthInSeconds",
          newMinimumAuctionLengthSeconds.toString()
        );
        // ---------------------------------------

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
        const daLinV0SetAuctionDetailsEvent: DALinSetAuctionDetails = changetype<
          DALinSetAuctionDetails
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

        handleDALinSetAuctionDetails(changetype<DALinSetAuctionDetails>(event));

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

        handleDALinSetAuctionDetails(changetype<DALinSetAuctionDetails>(event));

        assert.fieldEquals(
          PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
          getProjectMinterConfigId(minterAddress.toHexString(), project.id),
          "basePrice",
          basePrice.toString()
        );

        // assert expected updates to extraMinterDetails
        let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
          getProjectMinterConfigId(minterAddress.toHexString(), project.id)
        );
        if (updatedProjectMinterConfig == null) {
          throw new Error("project minter config should not be null");
        }
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "startPrice",
          startPrice.toString()
        );
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "startTime",
          startTime.toString()
        );
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "endTime",
          endTime.toString()
        );

        // @dev Deprecated fields ----------------
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
        // ---------------------------------------

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

          handleDALinResetAuctionDetails(
            changetype<DALinResetAuctionDetails>(event)
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

          const _startTime = CURRENT_BLOCK_TIMESTAMP.plus(
            BigInt.fromI32(100)
          ).toString();
          const _endTime = CURRENT_BLOCK_TIMESTAMP.plus(
            BigInt.fromI32(200)
          ).toString();
          const _startPrice = ONE_ETH_IN_WEI.toString();
          projectMinterConfig.extraMinterDetails = getJsonStringFromInputs(
            ["startPrice", "startTime", "endTime"],
            [_startPrice, _startTime, _endTime]
          );
          // @dev Deprecated fields ----------------
          projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
            BigInt.fromI32(100)
          );
          projectMinterConfig.endTime = CURRENT_BLOCK_TIMESTAMP.plus(
            BigInt.fromI32(200)
          );
          projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
          // ---------------------------------------

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

          handleDALinResetAuctionDetails(
            changetype<DALinResetAuctionDetails>(event)
          );

          const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
            ProjectMinterConfiguration
          >(ProjectMinterConfiguration.load(projectMinterConfig.id));

          assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
          assert.assertTrue(
            updatedProjectMinterConfig.extraMinterDetails == "{}"
          );

          // @dev Deprecated fields ----------------
          assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
          assert.assertTrue(updatedProjectMinterConfig.startTime === null);
          assert.assertTrue(updatedProjectMinterConfig.endTime === null);
          // ---------------------------------------

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
        // @dev Deprecated fields ----------------
        minter.minimumHalfLifeInSeconds = BigInt.fromI32(300);
        minter.maximumHalfLifeInSeconds = BigInt.fromI32(5000);
        // ---------------------------------------
        minter.extraMinterDetails = getJsonStringFromInputs(
          ["minimumHalfLifeInSeconds", "maximumHalfLifeInSeconds"],
          ["300", "5000"]
        );
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

        handleAuctionHalfLifeRangeSecondsUpdated(
          changetype<AuctionHalfLifeRangeSecondsUpdated>(event)
        );

        // assert expected updates to extraMinterDetails
        let updatedMinter = Minter.load(minterAddress.toHexString());
        if (updatedMinter == null) {
          throw new Error("minter config should not be null");
        }
        assertJsonFieldEquals(
          updatedMinter.extraMinterDetails,
          "minimumHalfLifeInSeconds",
          newMinimumHalfLifeInSeconds.toString()
        );
        assertJsonFieldEquals(
          updatedMinter.extraMinterDetails,
          "maximumHalfLifeInSeconds",
          newMaximumHalfLifeInSeconds.toString()
        );

        // @dev Deprecated fields ----------------
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
        // ---------------------------------------

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

        handleDAExpSetAuctionDetails(changetype<DAExpSetAuctionDetails>(event));

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

        handleDAExpSetAuctionDetails(changetype<DAExpSetAuctionDetails>(event));

        assert.fieldEquals(
          PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
          getProjectMinterConfigId(minterAddress.toHexString(), project.id),
          "basePrice",
          basePrice.toString()
        );

        // assert expected updates to extraMinterDetails
        let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
          getProjectMinterConfigId(minterAddress.toHexString(), project.id)
        );
        if (updatedProjectMinterConfig == null) {
          throw new Error("project minter config should not be null");
        }
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "startPrice",
          startPrice.toString()
        );
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "startTime",
          startTime.toString()
        );
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "halfLifeSeconds",
          halfLifeSeconds.toString()
        );
        // approx DA length calculated separately via calculator
        const approxDAExpLength = BigInt.fromI32(1360);
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "approximateDAExpEndTime",
          startTime.plus(approxDAExpLength).toString()
        );

        // @dev Deprecated fields ----------------
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
        // ---------------------------------------

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

        handleDAExpSetAuctionDetails(changetype<DAExpSetAuctionDetails>(event));

        assert.fieldEquals(
          PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
          getProjectMinterConfigId(minterAddress.toHexString(), project.id),
          "basePrice",
          basePrice.toString()
        );
        // assert expected updates to extraMinterDetails
        let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
          getProjectMinterConfigId(minterAddress.toHexString(), project.id)
        );
        if (updatedProjectMinterConfig == null) {
          throw new Error("project minter config should not be null");
        }
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "startPrice",
          startPrice.toString()
        );
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "startTime",
          startTime.toString()
        );
        assertJsonFieldEquals(
          updatedProjectMinterConfig.extraMinterDetails,
          "halfLifeSeconds",
          halfLifeSeconds.toString()
        );

        // @dev Deprecated fields ----------------
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
        // ---------------------------------------

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

        if (!minterType.startsWith("MinterDAExpSettlement")) {
          handleDAExpResetAuctionDetails(
            changetype<DAExpResetAuctionDetails>(event)
          );
        } else {
          // fully populate event for settlement minter
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
          // handle settlement minter event
          handleDAExpSettlementResetAuctionDetails(
            changetype<DAExpSettlementResetAuctionDetails>(event)
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
        const _startTime = CURRENT_BLOCK_TIMESTAMP.plus(
          BigInt.fromI32(100)
        ).toString();
        const _halfLifeSeconds = BigInt.fromI32(300).toString();
        const _startPrice = ONE_ETH_IN_WEI.toString();
        projectMinterConfig.extraMinterDetails = getJsonStringFromInputs(
          ["startPrice", "startTime", "halfLifeSeconds"],
          [_startPrice, _startTime, _halfLifeSeconds]
        );
        // @dev Deprecated fields ----------------
        projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
          BigInt.fromI32(100)
        );
        projectMinterConfig.halfLifeSeconds = BigInt.fromI32(300);
        projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
        // ---------------------------------------
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

        if (!minterType.startsWith("MinterDAExpSettlement")) {
          handleDAExpResetAuctionDetails(
            changetype<DAExpResetAuctionDetails>(event)
          );
        } else {
          // fully populate event for settlement minter
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
          // handle settlement minter event
          handleDAExpSettlementResetAuctionDetails(
            changetype<DAExpSettlementResetAuctionDetails>(event)
          );
        }

        const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
          ProjectMinterConfiguration
        >(ProjectMinterConfiguration.load(projectMinterConfig.id));

        assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
        assert.assertTrue(
          updatedProjectMinterConfig.extraMinterDetails == "{}"
        );
        // @dev Deprecated fields ----------------
        assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
        assert.assertTrue(updatedProjectMinterConfig.startTime === null);
        assert.assertTrue(updatedProjectMinterConfig.halfLifeSeconds === null);
        // ---------------------------------------

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
        const _startTime = CURRENT_BLOCK_TIMESTAMP.plus(
          BigInt.fromI32(100)
        ).toString();
        const _halfLifeSeconds = BigInt.fromI32(300).toString();
        const _startPrice = ONE_ETH_IN_WEI.toString();
        projectMinterConfig.extraMinterDetails = getJsonStringFromInputs(
          ["startPrice", "startTime", "halfLifeSeconds"],
          [_startPrice, _startTime, _halfLifeSeconds]
        );
        // @dev Deprecated fields ----------------
        projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
          BigInt.fromI32(100)
        );
        projectMinterConfig.halfLifeSeconds = BigInt.fromI32(300);
        projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
        // ---------------------------------------
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

        if (!minterType.startsWith("MinterDAExpSettlement")) {
          handleDAExpResetAuctionDetails(
            changetype<DAExpResetAuctionDetails>(event)
          );
        } else {
          // fully populate event for settlement minter
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
          // handle settlement minter event
          handleDAExpSettlementResetAuctionDetails(
            changetype<DAExpSettlementResetAuctionDetails>(event)
          );
        }

        const updatedProjectMinterConfig: ProjectMinterConfiguration = changetype<
          ProjectMinterConfiguration
        >(ProjectMinterConfiguration.load(projectMinterConfig.id));

        assert.assertTrue(updatedProjectMinterConfig.basePrice === null);
        assert.assertTrue(
          updatedProjectMinterConfig.extraMinterDetails == "{}"
        );
        // @dev Deprecated fields ----------------
        assert.assertTrue(updatedProjectMinterConfig.startPrice === null);
        assert.assertTrue(updatedProjectMinterConfig.startTime === null);
        assert.assertTrue(updatedProjectMinterConfig.halfLifeSeconds === null);
        // ---------------------------------------

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

describe("DAExpSettlementMinters", () => {
  describe("ReceiptUpdated handler", () => {
    test("reflects updated receipt values after one receipt", () => {
      clearStore();
      const minter = addNewMinterToStore("MinterDAExpSettlementV0");
      const minterAddress: Address = changetype<Address>(
        Address.fromHexString(minter.id)
      );
      const minterType = minter.type;

      const projectId = BigInt.fromI32(1);
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
      const _startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      ).toString();
      const _halfLifeSeconds = BigInt.fromI32(300).toString();
      const _startPrice = ONE_ETH_IN_WEI.toString();
      projectMinterConfig.extraMinterDetails = getJsonStringFromInputs(
        ["startPrice", "startTime", "halfLifeSeconds"],
        [_startPrice, _startTime, _halfLifeSeconds]
      );
      // @dev Deprecated fields ----------------
      projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      );
      projectMinterConfig.halfLifeSeconds = BigInt.fromI32(300);
      projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
      // ---------------------------------------
      projectMinterConfig.halfLifeSeconds = BigInt.fromI32(300);
      projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
      projectMinterConfig.priceIsConfigured = true;
      projectMinterConfig.currencyAddress = Address.zero();
      projectMinterConfig.currencySymbol = "ETH";
      projectMinterConfig.purchaseToDisabled = false;
      projectMinterConfig.save();

      // define purchaser and net paid, qty purchased
      const purchaser = randomAddressGenerator.generateRandomAddress();
      const netPosted = ONE_ETH_IN_WEI;
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
          "_numPurchased",
          ethereum.Value.fromUnsignedBigInt(numPurchased)
        ),
        new ethereum.EventParam(
          "_netPosted",
          ethereum.Value.fromUnsignedBigInt(netPosted)
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
      // return qty of settleable invocations of 1
      createMockedFunction(
        minterAddress,
        "getNumSettleableInvocations",
        "getNumSettleableInvocations(uint256):(uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromI32(1)]);

      // handle settlement minter event
      handleReceiptUpdated(changetype<ReceiptUpdated>(event));

      // assert expected updates to extraMinterDetails
      let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
        getProjectMinterConfigId(minterAddress.toHexString(), project.id)
      );
      if (updatedProjectMinterConfig == null) {
        throw new Error("project minter config should not be null");
      }
      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "currentSettledPrice",
        actualPurchasePrice.toString()
      );
      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "numSettleableInvocations",
        "1"
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
        "netPosted",
        netPosted.toString()
      );
      assert.fieldEquals(
        RECEIPT_ENTITY_TYPE,
        getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
        "numPurchased",
        numPurchased.toString()
      );
      assert.fieldEquals(
        RECEIPT_ENTITY_TYPE,
        getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    test("reflects updated receipt values after two receipts", () => {
      clearStore();
      const minter = addNewMinterToStore("MinterDAExpSettlementV0");
      const minterAddress: Address = changetype<Address>(
        Address.fromHexString(minter.id)
      );
      const minterType = minter.type;

      const projectId = BigInt.fromI32(1);
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
      const _startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      ).toString();
      const _halfLifeSeconds = BigInt.fromI32(300).toString();
      const _startPrice = ONE_ETH_IN_WEI.toString();
      projectMinterConfig.extraMinterDetails = getJsonStringFromInputs(
        ["startPrice", "startTime", "halfLifeSeconds"],
        [_startPrice, _startTime, _halfLifeSeconds]
      );
      // @dev Deprecated fields ----------------
      projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      );
      projectMinterConfig.halfLifeSeconds = BigInt.fromI32(300);
      projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
      // ---------------------------------------
      projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
      projectMinterConfig.priceIsConfigured = true;
      projectMinterConfig.currencyAddress = Address.zero();
      projectMinterConfig.currencySymbol = "ETH";
      projectMinterConfig.purchaseToDisabled = false;
      projectMinterConfig.save();

      // define purchaser and net paid, qty purchased
      const purchaser = randomAddressGenerator.generateRandomAddress();
      let netPosted = ONE_ETH_IN_WEI;
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
          "_numPurchased",
          ethereum.Value.fromUnsignedBigInt(numPurchased)
        ),
        new ethereum.EventParam(
          "_netPosted",
          ethereum.Value.fromUnsignedBigInt(netPosted)
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
      // return qty of settleable invocations of 1
      createMockedFunction(
        minterAddress,
        "getNumSettleableInvocations",
        "getNumSettleableInvocations(uint256):(uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromI32(1)]);

      // handle settleable minter event
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
      // return qty of settleable invocations of 1
      createMockedFunction(
        minterAddress,
        "getNumSettleableInvocations",
        "getNumSettleableInvocations(uint256):(uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromUnsignedBigInt(numPurchased)]);
      // update event values
      // net paid is now 1.5 eth
      netPosted = ONE_ETH_IN_WEI.plus(ONE_ETH_IN_WEI.div(BigInt.fromI32(2)));
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
          "_numPurchased",
          ethereum.Value.fromUnsignedBigInt(numPurchased)
        ),
        new ethereum.EventParam(
          "_netPosted",
          ethereum.Value.fromUnsignedBigInt(netPosted)
        )
      ];
      const newBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(1));
      event.block.timestamp = newBlockTimestamp;

      // handle settleable minter event
      handleReceiptUpdated(changetype<ReceiptUpdated>(event));

      // assert expected updates
      let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
        getProjectMinterConfigId(minterAddress.toHexString(), project.id)
      );
      if (updatedProjectMinterConfig == null) {
        throw new Error("project minter config should not be null");
      }
      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "currentSettledPrice",
        actualPurchasePrice.toString()
      );
      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "numSettleableInvocations",
        numPurchased.toString()
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
        "netPosted",
        netPosted.toString()
      );
      assert.fieldEquals(
        RECEIPT_ENTITY_TYPE,
        getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
        "numPurchased",
        numPurchased.toString()
      );
      assert.fieldEquals(
        RECEIPT_ENTITY_TYPE,
        getReceiptId(minterAddress.toHexString(), project.projectId, purchaser),
        "updatedAt",
        newBlockTimestamp.toString()
      );
    });
  });

  describe("SelloutPriceUpdated handler", () => {
    test("reflects updated net settlement price after event", () => {
      clearStore();
      const minter = addNewMinterToStore("MinterDAExpSettlementV0");
      const minterAddress: Address = changetype<Address>(
        Address.fromHexString(minter.id)
      );
      const minterType = minter.type;

      const projectId = BigInt.fromI32(1);
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
      const _startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      ).toString();
      const _halfLifeSeconds = BigInt.fromI32(300).toString();
      const _startPrice = ONE_ETH_IN_WEI.toString();
      projectMinterConfig.extraMinterDetails = getJsonStringFromInputs(
        ["startPrice", "startTime", "halfLifeSeconds"],
        [_startPrice, _startTime, _halfLifeSeconds]
      );
      // @dev Deprecated fields ----------------
      projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      );
      projectMinterConfig.halfLifeSeconds = BigInt.fromI32(300);
      projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
      // ---------------------------------------
      projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
      projectMinterConfig.priceIsConfigured = true;
      projectMinterConfig.currencyAddress = Address.zero();
      projectMinterConfig.currencySymbol = "ETH";
      projectMinterConfig.purchaseToDisabled = false;
      projectMinterConfig.save();

      // define relevant variables
      let selloutPrice = ONE_ETH_IN_WEI;

      const event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_selloutPrice",
          ethereum.Value.fromUnsignedBigInt(selloutPrice)
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
        .returns([ethereum.Value.fromUnsignedBigInt(selloutPrice)]);

      // handle settlement minter event
      handleSelloutPriceUpdated(changetype<SelloutPriceUpdated>(event));

      // assert expected updates
      let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
        getProjectMinterConfigId(minterAddress.toHexString(), project.id)
      );
      if (updatedProjectMinterConfig == null) {
        throw new Error("project minter config should not be null");
      }

      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "currentSettledPrice",
        selloutPrice.toString()
      );
    });

    test("reflects updated net settlement price after multiple events", () => {
      clearStore();
      const minter = addNewMinterToStore("MinterDAExpSettlementV0");
      const minterAddress: Address = changetype<Address>(
        Address.fromHexString(minter.id)
      );
      const minterType = minter.type;

      const projectId = BigInt.fromI32(1);
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
      const _startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      ).toString();
      const _halfLifeSeconds = BigInt.fromI32(300).toString();
      const _startPrice = ONE_ETH_IN_WEI.toString();
      projectMinterConfig.extraMinterDetails = getJsonStringFromInputs(
        ["startPrice", "startTime", "halfLifeSeconds"],
        [_startPrice, _startTime, _halfLifeSeconds]
      );
      // @dev Deprecated fields ----------------
      projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      );
      projectMinterConfig.halfLifeSeconds = BigInt.fromI32(300);
      projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
      // ---------------------------------------
      projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
      projectMinterConfig.priceIsConfigured = true;
      projectMinterConfig.currencyAddress = Address.zero();
      projectMinterConfig.currencySymbol = "ETH";
      projectMinterConfig.purchaseToDisabled = false;
      projectMinterConfig.save();

      // define relevant variables
      let selloutPrice = ONE_ETH_IN_WEI;

      const event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_selloutPrice",
          ethereum.Value.fromUnsignedBigInt(selloutPrice)
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
        .returns([ethereum.Value.fromUnsignedBigInt(selloutPrice)]);

      // handle settlement minter event
      handleSelloutPriceUpdated(changetype<SelloutPriceUpdated>(event));

      // update mocks, event, and handle a second event
      selloutPrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(2));
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_selloutPrice",
          ethereum.Value.fromUnsignedBigInt(selloutPrice)
        )
      ];
      createMockedFunction(
        minterAddress,
        "getProjectLatestPurchasePrice",
        "getProjectLatestPurchasePrice(uint256):(uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromUnsignedBigInt(selloutPrice)]);
      // handle second settlement minter event
      handleSelloutPriceUpdated(changetype<SelloutPriceUpdated>(event));

      // assert settlement net price reflects the second event's value
      let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
        getProjectMinterConfigId(minterAddress.toHexString(), project.id)
      );
      if (updatedProjectMinterConfig == null) {
        throw new Error("project minter config should not be null");
      }

      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "currentSettledPrice",
        selloutPrice.toString()
      );
      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "halfLifeSeconds",
        _halfLifeSeconds.toString()
      );
      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "startPrice",
        _startPrice.toString()
      );
      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "startTime",
        _startTime.toString()
      );
    });
  });

  describe("ArtistAndAdminRevenuesWithdrawn handler", () => {
    test("reflects updated state after artist and admin withdraw", () => {
      clearStore();
      const minter = addNewMinterToStore("MinterDAExpSettlementV0");
      const minterAddress: Address = changetype<Address>(
        Address.fromHexString(minter.id)
      );
      const minterType = minter.type;

      const projectId = BigInt.fromI32(1);
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
      const _startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      ).toString();
      const _halfLifeSeconds = BigInt.fromI32(300).toString();
      const _startPrice = ONE_ETH_IN_WEI.toString();
      projectMinterConfig.extraMinterDetails = getJsonStringFromInputs(
        ["startPrice", "startTime", "halfLifeSeconds"],
        [_startPrice, _startTime, _halfLifeSeconds]
      );
      // @dev Deprecated fields ----------------
      projectMinterConfig.startTime = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(100)
      );
      projectMinterConfig.halfLifeSeconds = BigInt.fromI32(300);
      projectMinterConfig.startPrice = ONE_ETH_IN_WEI;
      // ---------------------------------------
      projectMinterConfig.basePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
      projectMinterConfig.priceIsConfigured = true;
      projectMinterConfig.currencyAddress = Address.zero();
      projectMinterConfig.currencySymbol = "ETH";
      projectMinterConfig.purchaseToDisabled = false;
      projectMinterConfig.save();

      // define purchaser and net paid, qty purchased
      const updatedLatestPurchasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(2));
      let numPurchased = BigInt.fromI32(1);

      const event = newMockEvent();
      event.address = minterAddress;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
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
        .returns([
          ethereum.Value.fromUnsignedBigInt(updatedLatestPurchasePrice)
        ]);

      // handle settlement minter event
      handleArtistAndAdminRevenuesWithdrawn(
        changetype<ArtistAndAdminRevenuesWithdrawn>(event)
      );

      // assert expected updates
      let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
        getProjectMinterConfigId(minterAddress.toHexString(), project.id)
      );
      if (updatedProjectMinterConfig == null) {
        throw new Error("project minter config should not be null");
      }

      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "currentSettledPrice",
        updatedLatestPurchasePrice.toString()
      );
      assertJsonFieldEquals(
        updatedProjectMinterConfig.extraMinterDetails,
        "auctionRevenuesCollected",
        "true"
      );
    });
  });
});

describe("MinterSEAV tests", () => {
  test("handleAuctionDurationSecondsRangeUpdated updates store", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterSEAV0");
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    const testMinAuctionDurationSeconds = BigInt.fromI32(100);
    const testMaxAuctionDurationSeconds = BigInt.fromI32(200);

    const event: AuctionDurationSecondsRangeUpdated = changetype<
      AuctionDurationSecondsRangeUpdated
    >(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "minAuctionDurationSeconds",
        ethereum.Value.fromUnsignedBigInt(testMinAuctionDurationSeconds)
      ),
      new ethereum.EventParam(
        "maxAuctionDurationSeconds",
        ethereum.Value.fromUnsignedBigInt(testMaxAuctionDurationSeconds)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleAuctionDurationSecondsRangeUpdated(event);

    // assert store is updated
    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "extraMinterDetails",
      '{"minAuctionDurationSeconds":' +
        testMinAuctionDurationSeconds.toString() +
        ',"maxAuctionDurationSeconds":' +
        testMaxAuctionDurationSeconds.toString() +
        "}"
    );
    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
  });

  test("handleMinterMinBidIncrementPercentageUpdated updates store", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterSEAV0");
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    const testMinterMinBidIncrementPercentage = BigInt.fromI32(6);

    const event: MinterMinBidIncrementPercentageUpdated = changetype<
      MinterMinBidIncrementPercentageUpdated
    >(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "minterMinBidIncrementPercentage",
        ethereum.Value.fromUnsignedBigInt(testMinterMinBidIncrementPercentage)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleMinterMinBidIncrementPercentageUpdated(event);

    // assert store is updated
    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "extraMinterDetails",
      '{"minterMinBidIncrementPercentage":' +
        testMinterMinBidIncrementPercentage.toString() +
        "}"
    );
    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
  });

  test("handleMinterTimeBufferUpdated updates store", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterSEAV0");
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    const testMinterTimeBuffer = BigInt.fromI32(300);

    const event: MinterTimeBufferUpdated = changetype<MinterTimeBufferUpdated>(
      newMockEvent()
    );
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "minterTimeBufferSeconds",
        ethereum.Value.fromUnsignedBigInt(testMinterTimeBuffer)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleMinterTimeBufferUpdated(event);

    // assert store is updated
    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "extraMinterDetails",
      '{"minterTimeBufferSeconds":' + testMinterTimeBuffer.toString() + "}"
    );
    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
  });

  test("handleConfiguredFutureAuctions updates store", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterSEAV0");
    const testProjectId = BigInt.fromI32(42);
    const project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      testProjectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI32(0),
      null
    );
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    // update values
    const testTimestampStart = BigInt.fromI32(999);
    const testAuctionDurationSeconds = BigInt.fromI32(10000);
    const testBasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));

    const event: ConfiguredFutureAuctions = changetype<
      ConfiguredFutureAuctions
    >(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "projectId",
        ethereum.Value.fromUnsignedBigInt(testProjectId)
      ),
      new ethereum.EventParam(
        "timestampStart",
        ethereum.Value.fromUnsignedBigInt(testTimestampStart)
      ),
      new ethereum.EventParam(
        "auctionDurationSeconds",
        ethereum.Value.fromUnsignedBigInt(testAuctionDurationSeconds)
      ),
      new ethereum.EventParam(
        "basePrice",
        ethereum.Value.fromUnsignedBigInt(testBasePrice)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleConfiguredFutureAuctions(event);

    // assert store is updated
    const projectEntityId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      testProjectId
    );
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    const projectMinterConfigEntityId = getProjectMinterConfigId(
      minter.id,
      projectEntityId
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "priceIsConfigured",
      "true"
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "basePrice",
      testBasePrice.toString()
    );
    // assert expected extra minter details
    let updatedProjectMinterConfig = ProjectMinterConfiguration.load(
      projectMinterConfigEntityId
    );
    if (updatedProjectMinterConfig == null) {
      throw new Error("project minter config should not be null");
    }
    assertJsonFieldEquals(
      updatedProjectMinterConfig.extraMinterDetails,
      "startTime",
      testTimestampStart.toString()
    );
    assertJsonFieldEquals(
      updatedProjectMinterConfig.extraMinterDetails,
      "projectAuctionDurationSeconds",
      testAuctionDurationSeconds.toString()
    );
  });

  test("handleResetAuctionDetails updates store when not initially populated", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterSEAV0");
    const testProjectId = BigInt.fromI32(42);
    const project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      testProjectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI32(0),
      null
    );
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    const event: ResetAuctionDetails = changetype<ResetAuctionDetails>(
      newMockEvent()
    );
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "projectId",
        ethereum.Value.fromUnsignedBigInt(testProjectId)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleResetAuctionDetails(event);

    // assert store is updated
    const projectEntityId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      testProjectId
    );
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    const projectMinterConfigEntityId = getProjectMinterConfigId(
      minter.id,
      projectEntityId
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "priceIsConfigured",
      "false"
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "basePrice",
      "0"
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "extraMinterDetails",
      "{}"
    );
    // @dev Deprecated fields ----------------
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "startTime",
      "0"
    );
    // ---------------------------------------
  });

  test("handleResetAuctionDetails clears store when pre-populated", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterSEAV0");
    const testProjectId = BigInt.fromI32(42);
    const project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      testProjectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI32(0),
      null
    );
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();
    // POPULATE PROJECT MINTER CONFIG
    // update values
    const testTimestampStart = BigInt.fromI32(999);
    const testAuctionDurationSeconds = BigInt.fromI32(10000);
    const testBasePrice = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));

    const event: ConfiguredFutureAuctions = changetype<
      ConfiguredFutureAuctions
    >(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "projectId",
        ethereum.Value.fromUnsignedBigInt(testProjectId)
      ),
      new ethereum.EventParam(
        "timestampStart",
        ethereum.Value.fromUnsignedBigInt(testTimestampStart)
      ),
      new ethereum.EventParam(
        "auctionDurationSeconds",
        ethereum.Value.fromUnsignedBigInt(testAuctionDurationSeconds)
      ),
      new ethereum.EventParam(
        "basePrice",
        ethereum.Value.fromUnsignedBigInt(testBasePrice)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleConfiguredFutureAuctions(event);
    const projectEntityId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      testProjectId
    );
    const projectMinterConfigEntityId = getProjectMinterConfigId(
      minter.id,
      projectEntityId
    );
    // check that configuring did successfully update store
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "priceIsConfigured",
      "true"
    );

    // RESET PROJECT MINTER CONFIG VALUES
    const event2: ResetAuctionDetails = changetype<ResetAuctionDetails>(
      newMockEvent()
    );
    event2.address = minterAddress;
    event2.parameters = [
      new ethereum.EventParam(
        "projectId",
        ethereum.Value.fromUnsignedBigInt(testProjectId)
      )
    ];

    const newBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(1));
    event2.block.timestamp = newBlockTimestamp;

    handleResetAuctionDetails(event2);

    // assert store is updated
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      newBlockTimestamp.toString()
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "priceIsConfigured",
      "false"
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "basePrice",
      "0"
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "extraMinterDetails",
      "{}"
    );
    // @dev Deprecated fields ----------------
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "startTime",
      "0"
    );
    // ---------------------------------------
  });

  test("handleAuctionInitialized updates extra minter details", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterSEAV0");
    const testProjectId = BigInt.fromI32(42);
    const project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      testProjectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI32(0),
      null
    );
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    // update values
    const testTokenId = BigInt.fromI32(42000001);
    const testBidderAddress = randomAddressGenerator.generateRandomAddress();
    const testBidAmount = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
    const testAuctionEndTime = BigInt.fromI32(9999999);

    const event: AuctionInitialized = changetype<AuctionInitialized>(
      newMockEvent()
    );
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "tokenId",
        ethereum.Value.fromUnsignedBigInt(testTokenId)
      ),
      new ethereum.EventParam(
        "bidder",
        ethereum.Value.fromAddress(testBidderAddress)
      ),
      new ethereum.EventParam(
        "bidAmount",
        ethereum.Value.fromUnsignedBigInt(testBidAmount)
      ),
      new ethereum.EventParam(
        "endTime",
        ethereum.Value.fromUnsignedBigInt(testAuctionEndTime)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
    // add project minter config to store that contains only a next token ID,
    // since that should be cleared when auction is initialized
    const projectEntityId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      testProjectId
    );
    const projectMinterConfigEntityId = getProjectMinterConfigId(
      minter.id,
      projectEntityId
    );
    addNewProjectMinterConfigToStore(projectEntityId, minterAddress);
    const projectMinterConfigEntity = ProjectMinterConfiguration.load(
      projectMinterConfigEntityId
    );
    if (projectMinterConfigEntity == null) {
      throw new Error("Project minter config entity not found");
    }
    projectMinterConfigEntity.extraMinterDetails = "{projectNextTokenId:0}";
    projectMinterConfigEntity.save();

    handleAuctionInitialized(event);

    // assert store is updated as expected
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    // @dev - note that projectNextTokenId key is ensured to be removed in this assertion
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "extraMinterDetails",
      '{"auctionCurrentBid":' +
        testBidAmount.toString() +
        ',"auctionCurrentBidder":"' +
        testBidderAddress.toHexString() +
        '","auctionEndTime":' +
        testAuctionEndTime.toString() +
        ',"auctionInitialized":true,"auctionSettled":false,"auctionTokenId":' +
        testTokenId.toString() +
        "}"
    );
  });

  test("handleAuctionBid updates store", () => {
    // mock, pass event to handler, etc
    const minter = addNewMinterToStore("MinterSEAV0");
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    const blockTimestamp1 = BigInt.fromI32(100);

    // ADMIN CONFIGURES BUFFER TIME

    const testMinterTimeBuffer = BigInt.fromI32(100);

    const event: MinterTimeBufferUpdated = changetype<MinterTimeBufferUpdated>(
      newMockEvent()
    );
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "minterTimeBufferSeconds",
        ethereum.Value.fromUnsignedBigInt(testMinterTimeBuffer)
      )
    ];

    event.block.timestamp = blockTimestamp1;

    handleMinterTimeBufferUpdated(event);

    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "extraMinterDetails",
      '{"minterTimeBufferSeconds":' + testMinterTimeBuffer.toString() + "}"
    );

    // INITIALIZE AUCTION
    const testProjectId = BigInt.fromI32(42);
    const project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      testProjectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI32(0),
      null
    );

    // configure values
    const testTokenId = BigInt.fromI32(42000001);
    const testBidderAddress = randomAddressGenerator.generateRandomAddress();
    const testBidAmount = ONE_ETH_IN_WEI.div(BigInt.fromI32(10));
    const testAuctionEndTime = BigInt.fromI32(500);

    const event2: AuctionInitialized = changetype<AuctionInitialized>(
      newMockEvent()
    );
    event2.address = minterAddress;
    event2.parameters = [
      new ethereum.EventParam(
        "tokenId",
        ethereum.Value.fromUnsignedBigInt(testTokenId)
      ),
      new ethereum.EventParam(
        "bidder",
        ethereum.Value.fromAddress(testBidderAddress)
      ),
      new ethereum.EventParam(
        "bidAmount",
        ethereum.Value.fromUnsignedBigInt(testBidAmount)
      ),
      new ethereum.EventParam(
        "endTime",
        ethereum.Value.fromUnsignedBigInt(testAuctionEndTime)
      )
    ];

    const blockTimestamp2 = blockTimestamp1.plus(BigInt.fromI32(1));
    event2.block.timestamp = blockTimestamp2;

    handleAuctionInitialized(event2);

    // assert store is updated as expected
    const projectEntityId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      testProjectId
    );
    const projectMinterConfigEntityId = getProjectMinterConfigId(
      minter.id,
      projectEntityId
    );
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      blockTimestamp2.toString()
    );

    // HANDLE SUBSEQUENT BID that does NOT extend auction
    const testBidderAddress2 = randomAddressGenerator.generateRandomAddress();
    const testBidAmount2 = ONE_ETH_IN_WEI.div(BigInt.fromI32(2));
    const blockTimestamp3 = BigInt.fromI32(200); // not within buffer time

    const event3: AuctionBid = changetype<AuctionBid>(newMockEvent());
    event3.address = minterAddress;
    event3.parameters = [
      new ethereum.EventParam(
        "tokenId",
        ethereum.Value.fromUnsignedBigInt(testTokenId)
      ),
      new ethereum.EventParam(
        "bidder",
        ethereum.Value.fromAddress(testBidderAddress2)
      ),
      new ethereum.EventParam(
        "bidAmount",
        ethereum.Value.fromUnsignedBigInt(testBidAmount2)
      )
    ];

    event3.block.timestamp = blockTimestamp3;

    handleAuctionBid(event3);

    // store should be updated, but auctionEndTime should not change since bid not in buffer time
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      blockTimestamp3.toString()
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "extraMinterDetails",
      '{"auctionCurrentBid":' +
        testBidAmount2.toString() +
        ',"auctionCurrentBidder":"' +
        testBidderAddress2.toHexString() +
        '","auctionEndTime":' +
        testAuctionEndTime.toString() +
        ',"auctionInitialized":true,"auctionSettled":false,"auctionTokenId":' +
        testTokenId.toString() +
        "}"
    );

    // HANDLE SUBSEQUENT BID that DOES extend auction
    const testBidderAddress3 = randomAddressGenerator.generateRandomAddress();
    const testBidAmount3 = ONE_ETH_IN_WEI;
    const blockTimestamp4 = BigInt.fromI32(450); // not within buffer time

    const event4: AuctionBid = changetype<AuctionBid>(newMockEvent());
    event4.address = minterAddress;
    event4.parameters = [
      new ethereum.EventParam(
        "tokenId",
        ethereum.Value.fromUnsignedBigInt(testTokenId)
      ),
      new ethereum.EventParam(
        "bidder",
        ethereum.Value.fromAddress(testBidderAddress3)
      ),
      new ethereum.EventParam(
        "bidAmount",
        ethereum.Value.fromUnsignedBigInt(testBidAmount3)
      )
    ];

    event4.block.timestamp = blockTimestamp4;

    handleAuctionBid(event4);

    // store should be updated, including the newly extended auction end time
    const targetAuctionEndTime = blockTimestamp4.plus(testMinterTimeBuffer);
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      blockTimestamp4.toString()
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "extraMinterDetails",
      '{"auctionCurrentBid":' +
        testBidAmount3.toString() +
        ',"auctionCurrentBidder":"' +
        testBidderAddress3.toHexString() +
        '","auctionEndTime":' +
        targetAuctionEndTime.toString() +
        ',"auctionInitialized":true,"auctionSettled":false,"auctionTokenId":' +
        testTokenId.toString() +
        "}"
    );
  });

  test("handleAuctionSettled updates store", () => {
    // mock, pass event to handler, etc
    const minter = addNewMinterToStore("MinterSEAV0");
    const testProjectId = BigInt.fromI32(42);
    const project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      testProjectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI32(0),
      null
    );
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    // update values
    const testTokenId = BigInt.fromI32(42000001);

    // handle auction settled event
    const testWinnerAddress = randomAddressGenerator.generateRandomAddress();
    const testWinnerBidAmount = ONE_ETH_IN_WEI;

    const event: AuctionSettled = changetype<AuctionSettled>(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "tokenId",
        ethereum.Value.fromUnsignedBigInt(testTokenId)
      ),
      new ethereum.EventParam(
        "winner",
        ethereum.Value.fromAddress(testWinnerAddress)
      ),
      new ethereum.EventParam(
        "price",
        ethereum.Value.fromUnsignedBigInt(testWinnerBidAmount)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleAuctionSettled(event);

    // store should be updated to reflect settled auction
    const projectEntityId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      testProjectId
    );
    const projectMinterConfigEntityId = getProjectMinterConfigId(
      minter.id,
      projectEntityId
    );
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "extraMinterDetails",
      '{"auctionSettled":true}'
    );
  });

  test("handleProjectNextTokenUpdated updates store", () => {
    // mock, pass event to handler, etc
    const minter = addNewMinterToStore("MinterSEAV0");
    const testProjectId = BigInt.fromI32(42);
    const project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      testProjectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI32(0),
      null
    );
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    // update values
    const testTokenId = BigInt.fromI32(42000001);

    const event: ProjectNextTokenUpdated = changetype<ProjectNextTokenUpdated>(
      newMockEvent()
    );
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "projectId",
        ethereum.Value.fromUnsignedBigInt(testProjectId)
      ),
      new ethereum.EventParam(
        "tokenId",
        ethereum.Value.fromUnsignedBigInt(testTokenId)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleProjectNextTokenUpdated(event);

    // store should be updated to reflect settled auction
    const projectEntityId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      testProjectId
    );
    const projectMinterConfigEntityId = getProjectMinterConfigId(
      minter.id,
      projectEntityId
    );
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "extraMinterDetails",
      '{"projectNextTokenId":' + testTokenId.toString() + "}"
    );
  });

  test("handleProjectNextTokenEjected updates store", () => {
    // mock, pass event to handler, etc
    const minter = addNewMinterToStore("MinterSEAV0");
    const testProjectId = BigInt.fromI32(42);
    const project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      testProjectId,
      "Test Project",
      randomAddressGenerator.generateRandomAddress(),
      BigInt.fromI32(0),
      null
    );
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    // update values
    const testTokenId = BigInt.fromI32(42000001);

    // add project minter config to store that contains only a next token ID,
    // since that should be cleared when auction is initialized
    const projectEntityId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      testProjectId
    );
    const projectMinterConfigEntityId = getProjectMinterConfigId(
      minter.id,
      projectEntityId
    );
    addNewProjectMinterConfigToStore(projectEntityId, minterAddress);
    const projectMinterConfigEntity = ProjectMinterConfiguration.load(
      projectMinterConfigEntityId
    );
    if (projectMinterConfigEntity == null) {
      throw new Error("Project minter config entity not found");
    }
    projectMinterConfigEntity.extraMinterDetails =
      "{projectNextTokenId:42000001}";
    projectMinterConfigEntity.save();

    const event: ProjectNextTokenEjected = changetype<ProjectNextTokenEjected>(
      newMockEvent()
    );
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "projectId",
        ethereum.Value.fromUnsignedBigInt(testProjectId)
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleProjectNextTokenEjected(event);

    // store should be updated to reflect settled auction
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      projectEntityId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigEntityId,
      "extraMinterDetails",
      "{}"
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
        handleAllowHoldersOfProjects(
          changetype<AllowedHoldersOfProjects>(event)
        );
      } else if (minterType == "MinterHolderV1") {
        handleAllowHoldersOfProjects(
          changetype<AllowedHoldersOfProjects>(event)
        );
      } else {
        handleAllowHoldersOfProjects(
          changetype<AllowedHoldersOfProjects>(event)
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
        handleAllowHoldersOfProjects(
          changetype<AllowedHoldersOfProjects>(event)
        );
      } else {
        handleAllowHoldersOfProjects(
          changetype<AllowedHoldersOfProjects>(event)
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
        handleRemoveHoldersOfProjects(
          changetype<RemovedHoldersOfProjects>(event)
        );
      } else {
        handleRemoveHoldersOfProjects(
          changetype<RemovedHoldersOfProjects>(event)
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
        handleRemoveHoldersOfProjects(
          changetype<RemovedHoldersOfProjects>(event)
        );
      } else if (minterType == "MinterHolderV1") {
        handleRemoveHoldersOfProjects(
          changetype<RemovedHoldersOfProjects>(event)
        );
      } else {
        handleRemoveHoldersOfProjects(
          changetype<RemovedHoldersOfProjects>(event)
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
        handleRegisteredNFTAddress(
          changetype<HolderRegisteredNFTAddress>(event)
        );
      } else if (minterType == "MinterHolderV1") {
        handleRegisteredNFTAddress(
          changetype<HolderRegisteredNFTAddress>(event)
        );
      } else {
        handleRegisteredNFTAddress(
          changetype<HolderRegisteredNFTAddress>(event)
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
        handleUnregisteredNFTAddress(
          changetype<HolderUnregisteredNFTAddress>(event)
        );
      } else if (minterType == "MinterHolderV1") {
        handleUnregisteredNFTAddress(
          changetype<HolderUnregisteredNFTAddress>(event)
        );
      } else {
        handleUnregisteredNFTAddress(
          changetype<HolderUnregisteredNFTAddress>(event)
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

  test("handleMerkleDelegationRegistryUpdated adds the delegationRegistry address to extraMinterDetails", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterMerkleV3");
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    const testAddy = randomAddressGenerator.generateRandomAddress();

    const event: MinterMerkleDelegationRegistryUpdated = changetype<
      MinterMerkleDelegationRegistryUpdated
    >(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "delegationRegistryAddress",
        ethereum.Value.fromAddress(testAddy)
      ),
      new ethereum.EventParam(
        "_key",
        ethereum.Value.fromBytes(Bytes.fromUTF8("address"))
      ),
      new ethereum.EventParam("_value", ethereum.Value.fromAddress(testAddy))
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleMerkleDelegationRegistryUpdated(
      changetype<MinterMerkleDelegationRegistryUpdated>(event)
    );

    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "extraMinterDetails",
      '{"delegationRegistryAddress":' + '"' + testAddy.toHexString() + '"' + "}"
    );
  });

  test("handleHolderDelegationRegistryUpdated adds the delegationRegistry address to extraMinterDetails", () => {
    // mock, pass event to handler, etc
    clearStore();
    const minter = addNewMinterToStore("MinterHolderV2");
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );
    minter.save();

    const testAddy = randomAddressGenerator.generateRandomAddress();

    const event: MinterHolderDelegationRegistryUpdated = changetype<
      MinterHolderDelegationRegistryUpdated
    >(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "delegationRegistryAddress",
        ethereum.Value.fromAddress(testAddy)
      ),
      new ethereum.EventParam(
        "_key",
        ethereum.Value.fromBytes(Bytes.fromUTF8("address"))
      ),
      new ethereum.EventParam("_value", ethereum.Value.fromAddress(testAddy))
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleHolderDelegationRegistryUpdated(
      changetype<MinterHolderDelegationRegistryUpdated>(event)
    );

    assert.fieldEquals(
      MINTER_ENTITY_TYPE,
      minter.id,
      "extraMinterDetails",
      '{"delegationRegistryAddress":' + '"' + testAddy.toHexString() + '"' + "}"
    );
  });
});

describe("handleProjectMaxInvocationsLimitUpdated", () => {
  beforeEach(() => {
    clearStore();
  });
  test("should do nothing if project is not in store", () => {
    const minterType = "MinterSetPriceV3";
    const minter = addNewMinterToStore(minterType);
    const minterAddress: Address = changetype<Address>(
      Address.fromHexString(minter.id)
    );

    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );

    const event: ProjectMaxInvocationsLimitUpdated = changetype<
      ProjectMaxInvocationsLimitUpdated
    >(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_maxInvocations",
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100))
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

    handleProjectMaxInvocationsLimitUpdated(event);

    assert.notInStore(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, fullProjectId);
  });
  test("should update project minter config maxInvocations", () => {
    const minter = addNewMinterToStore("MinterSetPriceV3");
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
    const projectMinterConfigId = getProjectMinterConfigId(
      minterAddress.toHexString(),
      project.id
    );

    const projectMinterConfig = new ProjectMinterConfiguration(
      projectMinterConfigId
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

    const event: ProjectMaxInvocationsLimitUpdated = changetype<
      ProjectMaxInvocationsLimitUpdated
    >(newMockEvent());
    event.address = minterAddress;
    event.parameters = [
      new ethereum.EventParam(
        "_projectId",
        ethereum.Value.fromUnsignedBigInt(projectId)
      ),
      new ethereum.EventParam(
        "_maxInvocations",
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100))
      )
    ];

    event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

    handleProjectMaxInvocationsLimitUpdated(
      changetype<ProjectMaxInvocationsLimitUpdated>(event)
    );

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      projectMinterConfigId,
      "maxInvocations",
      "100"
    );
  });
});
