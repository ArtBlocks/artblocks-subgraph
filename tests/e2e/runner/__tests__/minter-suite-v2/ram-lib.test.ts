import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  getAccounts,
  waitUntilSubgraphIsSynced,
  getMinterDetails,
  getBidDetails,
  getProjectMinterConfigurationDetails,
} from "../utils/helpers";
import {
  GenArt721CoreV3__factory,
  GenArt721CoreV3LibraryAddresses,
} from "../../contracts/factories/GenArt721CoreV3__factory";

import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
import { MinterRAMV0__factory } from "../../contracts/factories/MinterRAMV0__factory";
import { ethers } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
// @dev For this file specifically, two of the tests take ~10min due to hard-coded minimum
// auction duration on RAM minter
jest.setTimeout(1800 * 1000);

const config = getSubgraphConfig();

const client = createSubgraphClient();
const { deployer, artist } = getAccounts();

// set up delegation registry address
const delegationRegistryAddress = config.metadata?.delegationRegistryAddress;
if (!delegationRegistryAddress)
  throw new Error("No delegation registry address found in config metadata");

// set up contract instances and/or addresses
const coreRegistryAddress = config.metadata?.coreRegistryAddress;
if (!coreRegistryAddress)
  throw new Error("No core registry address found in config metadata");

const sharedMinterFilter = config.sharedMinterFilterContracts?.[0];
if (!sharedMinterFilter) {
  throw new Error("No shared minter filter found in config metadata");
}
const sharedMinterFilterContract = new MinterFilterV2__factory(deployer).attach(
  sharedMinterFilter.address
);

// get contract from the subgraph config
if (!config.iGenArt721CoreContractV3_BaseContracts) {
  throw new Error("No iGenArt721CoreContractV3_BaseContracts in config");
}
const genArt721CoreAddress =
  config.iGenArt721CoreContractV3_BaseContracts[0].address;

// get MinterRAMV0 contract from the subgraph config
if (!config.RAMLibContracts) {
  throw new Error("No RAMLibContracts in config");
}
const minterRAMV0Address = config.RAMLibContracts[0].address;
const minterRAMV0Contract = new MinterRAMV0__factory(deployer).attach(
  minterRAMV0Address
);
const bytecodeStorageReaderAddress =
  config.metadata?.bytecodeStorageReaderAddress;
if (!bytecodeStorageReaderAddress)
  throw new Error(
    "No bytecode storage reader address found in config metadata"
  );
const linkLibraryAddresses: GenArt721CoreV3LibraryAddresses = {
  "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
    bytecodeStorageReaderAddress,
};
const genArt721CoreContract = new GenArt721CoreV3__factory(
  linkLibraryAddresses,
  deployer
).attach(genArt721CoreAddress);

// Constants
const NUM_SLOTS = 512;
const AUCTION_BUFFER_SECONDS = 300;
const MAX_AUCTION_EXTRA_SECONDS = 3600;

describe("RAMLib event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = minterRAMV0Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      expect(minterRes.id).toBe(targetId);
    });
  });

  describe("MinAuctionDurationSecondsUpdated", () => {
    // this is a minter-level, immutable value set in the constructor,
    // so we can only inspect it by checking the Minter entity in the subgraph
    // that was created during deployment
    test("value was populated during deployment", async () => {
      // query public constant for the expected value (>0)
      const expectedValue =
        await minterRAMV0Contract.MIN_AUCTION_DURATION_SECONDS();
      expect(expectedValue.gt(0)).toBe(true);
      // validate minter's extraMinterDetails in subgraph
      const targetId = minterRAMV0Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.minAuctionDurationSeconds).toBe(
        expectedValue.toNumber()
      );
    });
  });

  describe("MinterRefundGasLimitUpdated", () => {
    // @dev no need to reset the affected value after each test
    test("updated after admin configures", async () => {
      // query public constant for the expected value (>0)
      const minterConfigInitial =
        await minterRAMV0Contract.minterConfigurationDetails();
      const newMinterRefundGasLimit =
        minterConfigInitial.minterRefundGasLimit + 1;
      await minterRAMV0Contract
        .connect(deployer)
        .updateRefundGasLimit(newMinterRefundGasLimit);
      // validate minter's extraMinterDetails in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = minterRAMV0Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.refundGasLimit).toBe(newMinterRefundGasLimit);
    });
  });

  describe("NumSlotsUpdated", () => {
    // this is a minter-level, immutable value set in the constructor,
    // so we can only inspect it by checking the Minter entity in the subgraph
    // that was created during deployment
    test("value was populated during deployment", async () => {
      // validate minter's extraMinterDetails in subgraph
      const targetId = minterRAMV0Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.numSlots).toBe(NUM_SLOTS);
    });
  });

  describe("AuctionBufferTimeParamsUpdated", () => {
    // this is a minter-level, immutable value set in the constructor,
    // so we can only inspect it by checking the Minter entity in the subgraph
    // that was created during deployment
    test("value was populated during deployment", async () => {
      // validate minter's extraMinterDetails in subgraph
      const targetId = minterRAMV0Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.auctionBufferSeconds).toBe(
        AUCTION_BUFFER_SECONDS
      );
      expect(extraMinterDetails.maxAuctionExtraSeconds).toBe(
        MAX_AUCTION_EXTRA_SECONDS
      );
    });
  });

  describe("AuctionConfigUpdated", () => {
    afterEach(async () => {
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("sets auction start time, end time, and base price in extra minter details in subgraph after event emitted", async () => {
      // artist configures the auction
      // @dev set minter as active
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterRAMV0Address // _minter
      );

      const latestBlock = await deployer.provider.getBlock("latest");
      const targetAuctionStart = latestBlock.timestamp + 60;
      const targetAuctionEnd = targetAuctionStart + 600;

      await minterRAMV0Contract.connect(artist).setAuctionDetails(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _auctionTimestampStart
        targetAuctionEnd, // _auctionTimestampEnd
        ethers.utils.parseEther("1"), // _basePrice
        true, // _allowExtraTime
        true // _adminArtistOnlyMintPeriodIfSellout
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      expect(minterConfigRes.priceIsConfigured).toBe(true);
      expect(minterConfigRes.basePrice).toBe(
        ethers.utils.parseEther("1").toString()
      );
      // validate extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.startTime).toBe(targetAuctionStart);
      expect(extraMinterDetails.auctionEndTime).toBe(targetAuctionEnd);
    });
  });

  describe("NumTokensInAuctionUpdated", () => {
    afterEach(async () => {
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("sets auction num tokens in extra minter details in subgraph after event emitted", async () => {
      // artist configures the auction
      // @dev set minter as active
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterRAMV0Address // _minter
      );

      const latestBlock = await deployer.provider.getBlock("latest");
      const targetAuctionStart = latestBlock.timestamp + 60;
      const targetAuctionEnd = targetAuctionStart + 600;

      await minterRAMV0Contract.connect(artist).setAuctionDetails(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _auctionTimestampStart
        targetAuctionEnd, // _auctionTimestampEnd
        ethers.utils.parseEther("1"), // _basePrice
        true, // _allowExtraTime
        true // _adminArtistOnlyMintPeriodIfSellout
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      // Manually limit project max invocations
      // @dev this can only happen in RAM Auction State A
      await minterRAMV0Contract
        .connect(artist)
        .manuallyLimitProjectMaxInvocations(
          0, // _projectId
          genArt721CoreAddress, // _coreContract
          1000
        );

      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.numTokensInAuction).toBe("1000");
    });
  });

  describe("BidCreated, BidToppedUp", () => {
    afterEach(async () => {
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("during live auction bids are created and topped up in subgraph after event emitted", async () => {
      // artist configures the auction
      // @dev set minter as active
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterRAMV0Address // _minter
      );

      const latestBlock = await deployer.provider.getBlock("latest");
      const targetAuctionStart = latestBlock.timestamp + 60;
      const targetAuctionEnd = targetAuctionStart + 600;
      // Set auction details
      await minterRAMV0Contract.connect(artist).setAuctionDetails(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _auctionTimestampStart
        targetAuctionEnd, // _auctionTimestampEnd
        ethers.utils.parseEther("1"), // _basePrice
        true, // _allowExtraTime
        true // _adminArtistOnlyMintPeriodIfSellout
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      // Get slot index for bid value
      const slot10price = await minterRAMV0Contract.slotIndexToBidValue(
        0, //_projectId
        genArt721CoreAddress, // _coreContract
        10 // _slotIndex
      );
      // Wait until auction starts (60s + 1s margin)
      await new Promise((resolve) => {
        setTimeout(resolve, 61 * 1000);
      });
      // Create initial bid for auction
      // @dev bids can only be created when auction is live
      const tx = await minterRAMV0Contract.connect(deployer).createBid(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        10, // _slotIndex
        {
          value: slot10price,
        }
      );
      const receipt = await tx.wait();
      const auctionBidTimestamp = (
        await artist.provider.getBlock(receipt.blockNumber)
      )?.timestamp;
      await waitUntilSubgraphIsSynced(client);
      // validate Bid entity
      const bidId = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0-1`;
      const bidRes = await getBidDetails(client, bidId);
      expect(bidRes.id).toBe(bidId);
      expect(bidRes.bidType).toBe("RAM");
      expect(bidRes.bidder.id).toBe(deployer.address.toLowerCase());
      expect(bidRes.settled).toBe(false);
      expect(bidRes.slotIndex).toBe("10");
      expect(bidRes.value).toBe(slot10price.toString());
      expect(bidRes.winningBid).toBe(false);
      expect(bidRes.timestamp).toBe(auctionBidTimestamp.toString());
      expect(bidRes.updatedAt).toBe(auctionBidTimestamp.toString());
      expect(bidRes.project.id).toBe(`${genArt721CoreAddress.toLowerCase()}-0`);
      expect(bidRes.minter.id).toBe(minterRAMV0Address.toLowerCase());

      // Top up bid for auction
      // Get slot index for bid value
      const slot12price = await minterRAMV0Contract.slotIndexToBidValue(
        0, //_projectId
        genArt721CoreAddress, // _coreContract
        12 // _slotIndex
      );
      const bidTopUpValue = slot12price.sub(slot10price);
      const tx2 = await minterRAMV0Contract.connect(deployer).topUpBid(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        1,
        12, // _slotIndex
        {
          value: bidTopUpValue,
        }
      );
      const receipt2 = await tx2.wait();
      const auctionBid2Timestamp = (
        await artist.provider.getBlock(receipt2.blockNumber)
      )?.timestamp;
      await waitUntilSubgraphIsSynced(client);
      // validate topped up Bid entity
      const toppedUpBidRes = await getBidDetails(client, bidId);
      expect(toppedUpBidRes.slotIndex).toBe("12");
      expect(toppedUpBidRes.value).toBe(slot12price.toString());
      expect(toppedUpBidRes.updatedAt).toBe(auctionBid2Timestamp.toString());
    });
  });

  // @dev This test ends with a settled auction and tokens minted
  describe("BidRemoved, AuctionTimestampEndUpdated, BidSettled, BidMinted", () => {
    afterEach(async () => {
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(1, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("during live auction bids are removed when outbid, and settled and minted in post-auction state in subgraph after event emitted", async () => {
      // Add a new project for this auction as tokens will be minted
      const currentProjectNumber = await genArt721CoreContract.nextProjectId();
      await genArt721CoreContract
        .connect(deployer)
        .addProject(
          "Test project for ISharedMinterRAMV0:BidRemoved",
          artist.address
        );
      await genArt721CoreContract
        .connect(deployer)
        .toggleProjectIsActive(currentProjectNumber);
      await genArt721CoreContract
        .connect(artist)
        .toggleProjectIsPaused(currentProjectNumber);
      // artist configures the auction
      // @dev set minter as active
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        minterRAMV0Address // _minter
      );

      const latestBlock = await deployer.provider.getBlock("latest");
      const targetAuctionStart = latestBlock.timestamp + 60;
      const reducedTargetAuctionEnd = targetAuctionStart + 620;
      const targetAuctionEnd = targetAuctionStart + 700;
      // Set auction details
      await minterRAMV0Contract.connect(artist).setAuctionDetails(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _auctionTimestampStart
        targetAuctionEnd, // _auctionTimestampEnd
        ethers.utils.parseEther("1"), // _basePrice
        true, // _allowExtraTime
        true // _adminArtistOnlyMintPeriodIfSellout
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      // Manually limit project max invocations to 2
      // @dev this can only happen in RAM Auction State A
      await minterRAMV0Contract
        .connect(artist)
        .manuallyLimitProjectMaxInvocations(
          currentProjectNumber, // _projectId
          genArt721CoreAddress, // _coreContract
          2
        );
      // Get slot index for bid value
      const slot5price = await minterRAMV0Contract.slotIndexToBidValue(
        currentProjectNumber, //_projectId
        genArt721CoreAddress, // _coreContract
        5 // _slotIndex
      );
      // Wait until auction starts (60s + 1s margin)
      await new Promise((resolve) => {
        setTimeout(resolve, 61 * 1000);
      });
      // Create bid for auction
      // @dev bids can only be created when auction is live
      const tx = await minterRAMV0Contract.connect(deployer).createBid(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        5, // _slotIndex
        {
          value: slot5price,
        }
      );
      await tx.wait();
      await waitUntilSubgraphIsSynced(client);
      // Place another bid
      const tx2 = await minterRAMV0Contract.connect(deployer).createBid(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        5, // _slotIndex
        {
          value: slot5price,
        }
      );
      await tx2.wait();
      await waitUntilSubgraphIsSynced(client);
      // Place a third, higher bid
      // Get slot index for bid value
      const slot10price = await minterRAMV0Contract.slotIndexToBidValue(
        currentProjectNumber, //_projectId
        genArt721CoreAddress, // _coreContract
        10 // _slotIndex
      );
      const tx3 = await minterRAMV0Contract.connect(deployer).createBid(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        10, // _slotIndex
        {
          value: slot10price,
        }
      );
      const receipt3 = await tx3.wait();
      const auctionBid3Timestamp = (
        await artist.provider.getBlock(receipt3.blockNumber)
      )?.timestamp;
      await waitUntilSubgraphIsSynced(client);
      // Validate the second Bid was removed
      const bidId = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}-2`;
      const bidRes = await getBidDetails(client, bidId);
      expect(bidRes.id).toBe(bidId);
      expect(bidRes.winningBid).toBe(false);
      expect(bidRes.slotIndex).toBe(null);
      expect(bidRes.value).toBe("0");
      expect(bidRes.updatedAt).toBe(auctionBid3Timestamp.toString());

      // Artist reduces auction length time
      const tx4 = await minterRAMV0Contract.connect(artist).reduceAuctionLength(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        reducedTargetAuctionEnd // _auctionTimestampEnd
      );
      await tx4.wait();
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.auctionEndTime).toBe(reducedTargetAuctionEnd);

      // Wait until auction ends
      await new Promise((resolve) => {
        setTimeout(resolve, 620 * 1000);
      });
      // Auto mint tokens to winners
      const tx5 = await minterRAMV0Contract
        .connect(artist)
        .adminArtistAutoMintTokensToWinners(
          currentProjectNumber, // _projectId
          genArt721CoreAddress, // _coreContract
          2 // _numTokensToMint
        );
      const receipt5 = await tx5.wait();
      const auctionBid5Timestamp = (
        await artist.provider.getBlock(receipt5.blockNumber)
      )?.timestamp;
      await waitUntilSubgraphIsSynced(client);
      // validate Bids settled and minted
      const winningBidTokenId = Number(currentProjectNumber) * 1000000;
      const winningBid1 = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}-1`;
      const winningBid2 = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}-3`;
      const winningBid1Res = await getBidDetails(client, winningBid1);
      const winningBid2Res = await getBidDetails(client, winningBid2);
      expect(winningBid1Res.settled).toBe(true);
      expect(winningBid1Res.winningBid).toBe(true);
      expect(winningBid1Res?.token?.id).toBe(
        `${genArt721CoreAddress.toLowerCase()}-${winningBidTokenId + 1}`
      );
      expect(winningBid1Res.updatedAt).toBe(auctionBid5Timestamp.toString());
      expect(winningBid2Res.settled).toBe(true);
      expect(winningBid2Res.winningBid).toBe(true);
      expect(winningBid2Res?.token?.id).toBe(
        `${genArt721CoreAddress.toLowerCase()}-${winningBidTokenId}`
      );
      expect(winningBid1Res.updatedAt).toBe(auctionBid5Timestamp.toString());
    });
  });

  // @dev This test ends with a settled auction, tokens minted, and bids refunded (error state)
  describe("BidRefunded", () => {
    afterEach(async () => {
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(1, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("in e1 error state if invocations < winning bids, highest + earliest bids are minted tokens and lowest bids are refunded in subgraph after event emitted", async () => {
      // Add a new project for this auction as tokens will be minted
      const currentProjectNumber = await genArt721CoreContract.nextProjectId();
      await genArt721CoreContract
        .connect(deployer)
        .addProject(
          "Test project for ISharedMinterRAMV0:BidRefunded",
          artist.address
        );
      await genArt721CoreContract
        .connect(deployer)
        .toggleProjectIsActive(currentProjectNumber);
      await genArt721CoreContract
        .connect(artist)
        .toggleProjectIsPaused(currentProjectNumber);

      // artist configures the auction
      // @dev set minter as active
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        minterRAMV0Address // _minter
      );

      const latestBlock = await deployer.provider.getBlock("latest");
      const targetAuctionStart = latestBlock.timestamp + 60;
      const targetAuctionEnd = targetAuctionStart + 600;
      // Set auction details
      await minterRAMV0Contract.connect(artist).setAuctionDetails(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _auctionTimestampStart
        targetAuctionEnd, // _auctionTimestampEnd
        ethers.utils.parseEther("1"), // _basePrice
        true, // _allowExtraTime
        true // _adminArtistOnlyMintPeriodIfSellout
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      // Manually limit project max invocations to 10
      // @dev this can only happen in RAM Auction State A
      await minterRAMV0Contract
        .connect(artist)
        .manuallyLimitProjectMaxInvocations(
          currentProjectNumber, // _projectId
          genArt721CoreAddress, // _coreContract
          10
        );
      // Get slot index for bid value
      const slot5price = await minterRAMV0Contract.slotIndexToBidValue(
        currentProjectNumber, //_projectId
        genArt721CoreAddress, // _coreContract
        5 // _slotIndex
      );
      // Wait until auction starts (60s + 1s margin)
      await new Promise((resolve) => {
        setTimeout(resolve, 61 * 1000);
      });
      // Create 5 bids for auction
      // @dev bids can only be created when auction is live
      for (let i = 0; i < 5; i++) {
        const tx = await minterRAMV0Contract.connect(deployer).createBid(
          currentProjectNumber, // _projectId
          genArt721CoreAddress, // _coreContract
          5, // _slotIndex
          {
            value: slot5price,
          }
        );
        await tx.wait();
        await waitUntilSubgraphIsSynced(client);
      }
      // Lower core contract max invocations to 2, lower than the amount of bids
      // @dev Bids are only refunded in an E1 error state
      const tx = await genArt721CoreContract
        .connect(artist)
        .updateProjectMaxInvocations(
          currentProjectNumber, // _projectId
          2 // _maxInvocations
        );
      await tx.wait();
      await waitUntilSubgraphIsSynced(client);

      // Wait til auction ends
      await new Promise((resolve) => {
        setTimeout(resolve, 620 * 1000);
      });

      // First auto-mint tokens to winners
      // Auto mint tokens to winners
      const tx2 = await minterRAMV0Contract
        .connect(artist)
        .adminArtistDirectMintTokensToWinners(
          currentProjectNumber, // _projectId
          genArt721CoreAddress, // _coreContract
          [1, 2] // _bidIds[]
        );
      const receipt2 = await tx2.wait();
      const autoMintTokenTimestamp = (
        await artist.provider.getBlock(receipt2.blockNumber)
      )?.timestamp;
      await waitUntilSubgraphIsSynced(client);

      // Call adminArtistDirectRefundWinners
      const tx3 = await minterRAMV0Contract
        .connect(artist)
        .adminArtistDirectRefundWinners(
          currentProjectNumber, // _projectId,
          genArt721CoreAddress, // _coreContract
          [3, 4, 5] // _bidIds[]
        );
      const receipt3 = await tx3.wait();
      const directRefundWinnersTimestamp = (
        await artist.provider.getBlock(receipt3.blockNumber)
      )?.timestamp;
      await waitUntilSubgraphIsSynced(client);

      // validate winning Bid entities
      const winningBid1 = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}-1`;
      const winningBid2 = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}-2`;
      const winningBidTokenId = Number(currentProjectNumber) * 1000000;
      const winningBid1Res = await getBidDetails(client, winningBid1);
      const winningBid2Res = await getBidDetails(client, winningBid2);
      expect(winningBid1Res.id).toBe(winningBid1);
      expect(winningBid1Res.bidType).toBe("RAM");
      expect(winningBid1Res.bidder.id).toBe(deployer.address.toLowerCase());
      expect(winningBid1Res.settled).toBe(true);
      expect(winningBid1Res.slotIndex).toBe("5");
      expect(winningBid1Res.value).toBe(slot5price.toString());
      expect(winningBid1Res.winningBid).toBe(true);
      expect(winningBid1Res.updatedAt).toBe(autoMintTokenTimestamp.toString());
      expect(winningBid1Res.project.id).toBe(
        `${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}`
      );
      expect(winningBid1Res.minter.id).toBe(minterRAMV0Address.toLowerCase());
      expect(winningBid1Res?.token?.id).toBe(
        `${genArt721CoreAddress.toLowerCase()}-${winningBidTokenId}`
      );
      expect(winningBid2Res.id).toBe(winningBid2);
      expect(winningBid2Res.bidType).toBe("RAM");
      expect(winningBid2Res.bidder.id).toBe(deployer.address.toLowerCase());
      expect(winningBid2Res.settled).toBe(true);
      expect(winningBid2Res.slotIndex).toBe("5");
      expect(winningBid2Res.value).toBe(slot5price.toString());
      expect(winningBid2Res.winningBid).toBe(true);
      expect(winningBid2Res.updatedAt).toBe(autoMintTokenTimestamp.toString());
      expect(winningBid2Res.project.id).toBe(
        `${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}`
      );
      expect(winningBid2Res.minter.id).toBe(minterRAMV0Address.toLowerCase());
      expect(winningBid2Res?.token?.id).toBe(
        `${genArt721CoreAddress.toLowerCase()}-${winningBidTokenId + 1}`
      );

      // validate bids were refunded + settled + have no tokens associated with them
      const refundedBid1 = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}-3`;
      const refundedBid2 = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}-4`;
      const refundedBid3 = `${minterRAMV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber}-5`;
      const refundedBid1Res = await getBidDetails(client, refundedBid1);
      const refundedBid2Res = await getBidDetails(client, refundedBid2);
      const refundedBid3Res = await getBidDetails(client, refundedBid3);

      expect(refundedBid1Res.slotIndex).toBe(null);
      expect(refundedBid1Res.winningBid).toBe(false);
      expect(refundedBid1Res.value).toBe("0");
      expect(refundedBid1Res.updatedAt).toBe(
        directRefundWinnersTimestamp.toString()
      );
      expect(refundedBid2Res.slotIndex).toBe(null);
      expect(refundedBid2Res.winningBid).toBe(false);
      expect(refundedBid2Res.value).toBe("0");
      expect(refundedBid2Res.updatedAt).toBe(
        directRefundWinnersTimestamp.toString()
      );
      expect(refundedBid3Res.slotIndex).toBe(null);
      expect(refundedBid3Res.winningBid).toBe(false);
      expect(refundedBid3Res.value).toBe("0");
      expect(refundedBid3Res.updatedAt).toBe(
        directRefundWinnersTimestamp.toString()
      );
    });
  });
});
