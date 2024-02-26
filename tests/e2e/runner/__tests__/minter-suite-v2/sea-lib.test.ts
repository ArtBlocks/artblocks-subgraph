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

import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
import { MinterSEAV1__factory } from "../../contracts/factories/MinterSEAV1__factory";

import { ethers } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
// @dev For this file specifically, one test takes >60s due to hard-coded minimum
// auction duration on SEA minter
jest.setTimeout(100 * 1000);

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

// get MinterSEAV1 contract from the subgraph config
if (!config.SEALibContracts) {
  throw new Error("No SEALibContracts in config");
}
const minterSEAV1Address = config.SEALibContracts[0].address;
const minterSEAV1Contract = new MinterSEAV1__factory(deployer).attach(
  minterSEAV1Address
);

describe("SEALib event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = minterSEAV1Address.toLowerCase();
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
        await minterSEAV1Contract.MIN_AUCTION_DURATION_SECONDS();
      expect(expectedValue.gt(0)).toBe(true);
      // validate minter's extraMinterDetails in subgraph
      const targetId = minterSEAV1Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.minAuctionDurationSeconds).toBe(
        expectedValue.toNumber()
      );
    });
  });

  describe("MinterTimeBufferUpdated", () => {
    // @dev no need to reset the affected value after each test
    test("updated after admin configures", async () => {
      // query public constant for the expected value (>0)
      const minterConfigInitial =
        await minterSEAV1Contract.minterConfigurationDetails();
      const newMinterTimeBufferSeconds =
        minterConfigInitial.minterTimeBufferSeconds + 1;
      // update the minter time buffer
      await minterSEAV1Contract
        .connect(deployer)
        .updateMinterTimeBufferSeconds(newMinterTimeBufferSeconds);
      // validate minter's extraMinterDetails in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = minterSEAV1Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.minterTimeBufferSeconds).toBe(
        newMinterTimeBufferSeconds
      );
    });
  });

  describe("MinterRefundGasLimitUpdated", () => {
    // @dev no need to reset the affected value after each test
    test("updated after admin configures", async () => {
      // query public constant for the expected value (>0)
      const minterConfigInitial =
        await minterSEAV1Contract.minterConfigurationDetails();
      const newMinterRefundGasLimit =
        minterConfigInitial.minterRefundGasLimit + 1;
      // update the minter time buffer
      await minterSEAV1Contract
        .connect(deployer)
        .updateRefundGasLimit(newMinterRefundGasLimit);
      // validate minter's extraMinterDetails in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = minterSEAV1Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.refundGasLimit).toBe(newMinterRefundGasLimit);
    });
  });

  describe("ConfiguredFutureAuctions", () => {
    afterEach(async () => {
      // clear the future auction details for the project
      try {
        await minterSEAV1Contract
          .connect(artist)
          .resetFutureAuctionDetails(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("subgraph is updated after event emitted", async () => {
      // artist configures future auctions
      // @dev must set as active minter since configuring mints a token to "next" slot
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterSEAV1Address // _minter
      );
      await minterSEAV1Contract.connect(artist).configureFutureAuctions(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        0, // _timestampStart
        600, // _auctionDurationSeconds
        ethers.utils.parseEther("1"), // _basePrice
        5 // _minBidIncrementPercentage
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterSEAV1Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate fields
      expect(minterConfigRes.priceIsConfigured).toBe(true);
      expect(minterConfigRes.basePrice).toBe(
        ethers.utils.parseEther("1").toString()
      );
      // validate extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.startTime).toBe(0);
      expect(extraMinterDetails.projectAuctionDurationSeconds).toBe(600);
      expect(extraMinterDetails.minBidIncrementPercentage).toBe(5);
    });
  });

  describe("ResetAuctionDetails", () => {
    afterEach(async () => {
      // clear the future auction details for the project
      try {
        await minterSEAV1Contract
          .connect(artist)
          .resetFutureAuctionDetails(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test success
      }
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("resets future project settings in subgraph after event emitted", async () => {
      // PART 1: configure future auction details
      // artist configures future auctions
      // @dev must set as active minter since configuring mints a token to "next" slot
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterSEAV1Address // _minter
      );
      await minterSEAV1Contract.connect(artist).configureFutureAuctions(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        0, // _timestampStart
        600, // _auctionDurationSeconds
        ethers.utils.parseEther("1"), // _basePrice
        5 // _minBidIncrementPercentage
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterSEAV1Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate fields
      expect(minterConfigRes.priceIsConfigured).toBe(true);
      expect(minterConfigRes.basePrice).toBe(
        ethers.utils.parseEther("1").toString()
      );
      // validate extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.startTime).toBe(0);
      expect(extraMinterDetails.projectAuctionDurationSeconds).toBe(600);
      expect(extraMinterDetails.minBidIncrementPercentage).toBe(5);
      // PART 2: reset the future auction details
      await minterSEAV1Contract
        .connect(artist)
        .resetFutureAuctionDetails(0, genArt721CoreAddress);
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const minterConfigResAfterReset =
        await getProjectMinterConfigurationDetails(client, targetId);
      // validate fields
      expect(minterConfigResAfterReset.priceIsConfigured).toBe(false);
      expect(minterConfigResAfterReset.basePrice).toBe("0");
      // validate extraMinterDetails
      const extraMinterDetailsAfterReset = JSON.parse(
        minterConfigResAfterReset.extraMinterDetails
      );
      expect(extraMinterDetailsAfterReset.startTime).toBe(undefined);
      expect(extraMinterDetailsAfterReset.projectAuctionDurationSeconds).toBe(
        undefined
      );
      expect(extraMinterDetailsAfterReset.minBidIncrementPercentage).toBe(
        undefined
      );
    });
  });

  // @dev A couple Auction events are tested together, in a single sequence.
  // This is because it is simpler to test the events in sequence than to try
  // to test them in isolation, since each test in this suite is not able to
  // rewind time on the locally running blockchain and subgraph
  // @dev Project 1 is used for this test, and the test ends with an active
  // auction for project 1.
  describe("AuctionInitialized, AuctionBid", () => {
    afterEach(async () => {
      // WARNING: project 1 remains with an active auction after this test,
      // because we don't want to wait until the auction ends to finish the test

      // clear the future auction details for the project
      try {
        await minterSEAV1Contract
          .connect(artist)
          .resetFutureAuctionDetails(1, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test success
      }
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(1, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("initializes auction as expected", async () => {
      // PART 1: configure future auction details
      // artist configures future auctions
      // @dev must set as active minter since configuring mints a token to "next" slot
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        1, // _projectId
        genArt721CoreAddress, // _coreContract
        minterSEAV1Address // _minter
      );
      await minterSEAV1Contract.connect(artist).configureFutureAuctions(
        1, // _projectId
        genArt721CoreAddress, // _coreContract
        0, // _timestampStart
        600, // _auctionDurationSeconds
        ethers.utils.parseEther("1"), // _basePrice
        5 // _minBidIncrementPercentage
      );

      // PART 2: AuctionInitialized indexing
      const targetTokenId = 1000000; // project 1, token 0
      const tx = await minterSEAV1Contract.connect(artist).createBid(
        targetTokenId, // _tokenId
        genArt721CoreAddress, // _coreContract
        { value: ethers.utils.parseEther("1.01") }
      );
      const receipt = await tx.wait();
      const auctionInitializedTimestamp = (
        await artist.provider.getBlock(receipt.blockNumber)
      )?.timestamp;
      if (!auctionInitializedTimestamp) {
        throw new Error("No auctionInitializedTimestamp found");
      }
      // validate project minter config's auction parameters in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterSEAV1Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-1`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate extraMinterDetails auction parameters
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.auctionCurrentBid).toBe(
        ethers.utils.parseEther("1.01").toString()
      );
      expect(extraMinterDetails.auctionCurrentBidder).toBe(
        artist.address.toLowerCase()
      );
      // @dev auction end time should be start time + duration
      expect(extraMinterDetails.auctionEndTime).toBe(
        auctionInitializedTimestamp + 600
      );
      expect(extraMinterDetails.auctionInitialized).toBe(true);
      expect(extraMinterDetails.auctionSettled).toBe(false);
      expect(extraMinterDetails.auctionTokenId).toBe(targetTokenId);
      expect(extraMinterDetails.auctionMinBidIncrementPercentage).toBe(5);

      // PART 3: AuctionBid indexing
      // @dev we also test minter time buffer seconds extension logic here
      // minter's admin sets buffer time to 600s
      await minterSEAV1Contract
        .connect(deployer)
        .updateMinterTimeBufferSeconds(600);
      // deployer bids
      const auctionBidValue = ethers.utils.parseEther("1.20");
      const tx2 = await minterSEAV1Contract.connect(deployer).createBid(
        targetTokenId, // _tokenId
        genArt721CoreAddress, // _coreContract
        { value: auctionBidValue }
      );
      const receipt2 = await tx2.wait();
      const auctionBidTimestamp = (
        await artist.provider.getBlock(receipt2.blockNumber)
      )?.timestamp;
      if (!auctionBidTimestamp) {
        throw new Error("No auctionBidTimestamp found");
      }
      // validate project minter config's auction parameters in subgraph
      await waitUntilSubgraphIsSynced(client);
      const minterConfigRes2 = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate extraMinterDetails auction parameters
      const extraMinterDetails2 = JSON.parse(
        minterConfigRes2.extraMinterDetails
      );
      expect(extraMinterDetails2.auctionCurrentBid).toBe(
        auctionBidValue.toString()
      );
      expect(extraMinterDetails2.auctionCurrentBidder).toBe(
        deployer.address.toLowerCase()
      );
      // we expect new auction end time in subgraph to be expanded due to buffer time
      expect(extraMinterDetails2.auctionEndTime).toBe(
        auctionBidTimestamp + 600
      );

      // PART 4: Bid indexing
      // Validate that the Bid entity was created
      const bidId = `${minterSEAV1Address.toLowerCase()}-${deployer.address.toLowerCase()}-${auctionBidValue.toString()}-${targetTokenId}`;
      const bidRes = await getBidDetails(client, bidId);
      expect(bidRes.id).toBe(bidId);
      expect(bidRes.bidder.id).toBe(deployer.address.toLowerCase());
      expect(bidRes.value).toBe(auctionBidValue.toString());
      expect(bidRes.winningBid).toBe(true);
      expect(bidRes.timestamp).toBe(auctionBidTimestamp.toString());
      expect(bidRes.updatedAt).toBe(auctionBidTimestamp.toString());
      expect(bidRes.project.id).toBe(`${genArt721CoreAddress.toLowerCase()}-1`);
      expect(bidRes.minter.id).toBe(minterSEAV1Address.toLowerCase());
      expect(bidRes.token?.id).toBe(
        `${genArt721CoreAddress.toLowerCase()}-${targetTokenId.toString()}`
      );

      // Create another bid
      const tx3 = await minterSEAV1Contract.connect(artist).createBid(
        targetTokenId, // _tokenId
        genArt721CoreAddress, // _coreContract
        { value: ethers.utils.parseEther("1.50") }
      );
      const receipt3 = await tx3.wait();
      const auctionBid2Timestamp = (
        await artist.provider.getBlock(receipt3.blockNumber)
      )?.timestamp;
      if (!auctionBid2Timestamp) {
        throw new Error("No auctionBid2Timestamp found");
      }
      await waitUntilSubgraphIsSynced(client);
      // Validate that the previous winning bid has been updated
      const previousWinningBidRes = await getBidDetails(client, bidId);
      expect(previousWinningBidRes.winningBid).toBe(false);
      expect(previousWinningBidRes.updatedAt).toBe(
        auctionBid2Timestamp.toString()
      );
    });
  });

  // @dev Project 2 is used for this test, and the test ends with a settled
  // auction for project 2.
  describe("AuctionSettled", () => {
    afterEach(async () => {
      // WARNING: project 2 remains with a settled auction after this test

      // clear the future auction details for the project
      try {
        await minterSEAV1Contract
          .connect(artist)
          .resetFutureAuctionDetails(2, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test success
      }
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(2, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("initializes auction as expected", async () => {
      // PART 1: configure future auction details
      // artist configures future auctions
      // @dev must set as active minter since configuring mints a token to "next" slot
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        2, // _projectId
        genArt721CoreAddress, // _coreContract
        minterSEAV1Address // _minter
      );
      await minterSEAV1Contract.connect(artist).configureFutureAuctions(
        2, // _projectId
        genArt721CoreAddress, // _coreContract
        0, // _timestampStart
        60, // _auctionDurationSeconds
        ethers.utils.parseEther("1"), // _basePrice
        5 // _minBidIncrementPercentage
      );

      // PART 2: AuctionInitialized indexing
      const targetTokenId = 2000000; // project 2, token 0
      const nextTargetTokenId = 2000001;
      const tx = await minterSEAV1Contract.connect(artist).createBid(
        targetTokenId, // _tokenId
        genArt721CoreAddress, // _coreContract
        { value: ethers.utils.parseEther("1.01") }
      );
      const receipt = await tx.wait();
      const auctionInitializedTimestamp = (
        await artist.provider.getBlock(receipt.blockNumber)
      )?.timestamp;
      if (!auctionInitializedTimestamp) {
        throw new Error("No auctionInitializedTimestamp found");
      }
      // wait until auction ends (60s + 1s margin)
      await new Promise((resolve) => {
        setTimeout(resolve, 61 * 1000);
      });
      // settle auction to emit AuctionSettled event
      await minterSEAV1Contract.connect(artist).settleAuction(
        targetTokenId, // _tokenId
        genArt721CoreAddress // _coreContract
      );
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterSEAV1Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-2`;
      let minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // Validate auction is settled in extra minter details
      let extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.auctionSettled).toBe(true);
      // Call settleAuctionAndCreateBid to initialize auction for next token ID
      const tx2 = await minterSEAV1Contract
        .connect(artist)
        .settleAuctionAndCreateBid(
          targetTokenId, // _settleTokenId
          nextTargetTokenId, // _bidTokenId
          genArt721CoreAddress, // _coreContract
          { value: ethers.utils.parseEther("1.01") }
        );
      const receipt2 = await tx2.wait();
      const auctionSettledBidCreatedTimestamp = (
        await artist.provider.getBlock(receipt2.blockNumber)
      )?.timestamp;
      // validate project minter config's auction parameters in subgraph
      await waitUntilSubgraphIsSynced(client);
      minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate extraMinterDetails auction parameters
      extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.auctionCurrentBid).toBe(
        ethers.utils.parseEther("1.01").toString()
      );
      expect(extraMinterDetails.auctionCurrentBidder).toBe(
        artist.address.toLowerCase()
      );
      // @dev auction end time should be start time + duration
      expect(extraMinterDetails.auctionEndTime).toBe(
        auctionSettledBidCreatedTimestamp + 60
      );
      expect(extraMinterDetails.auctionInitialized).toBe(true);
      expect(extraMinterDetails.auctionSettled).toBe(false);
      expect(extraMinterDetails.auctionTokenId).toBe(targetTokenId);
      expect(extraMinterDetails.auctionMinBidIncrementPercentage).toBe(5);

      // Validate bid entity was created and auction initialized on target token
      const bidId = `${minterSEAV1Address.toLowerCase()}-${artist.address.toLowerCase()}-${ethers.utils
        .parseEther("1.01")
        .toString()}-${nextTargetTokenId}`;
      const bidRes = await getBidDetails(client, bidId);
      expect(bidRes.id).toBe(bidId);
      expect(bidRes.bidder.id).toBe(artist.address.toLowerCase());
      expect(bidRes.value).toBe(ethers.utils.parseEther("1.01").toString());
      expect(bidRes.winningBid).toBe(true);
      expect(bidRes.timestamp).toBe(
        auctionSettledBidCreatedTimestamp.toString()
      );
      expect(bidRes.updatedAt).toBe(
        auctionSettledBidCreatedTimestamp.toString()
      );
      expect(bidRes.project.id).toBe(`${genArt721CoreAddress.toLowerCase()}-1`);
      expect(bidRes.minter.id).toBe(minterSEAV1Address.toLowerCase());
      expect(bidRes.token?.id).toBe(
        `${genArt721CoreAddress.toLowerCase()}-${nextTargetTokenId.toString()}`
      );
    });
  });

  describe("ProjectNextTokenUpdated", () => {
    afterEach(async () => {
      // clear the future auction details for the project
      try {
        await minterSEAV1Contract
          .connect(artist)
          .resetFutureAuctionDetails(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test success
      }
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("indexes populate next token as expected", async () => {
      // artist configures future auctions
      // @dev must set as active minter since configuring mints a token to "next" slot
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterSEAV1Address // _minter
      );
      // eject any pre-populated next token on the project
      const projectConfigDetails =
        await minterSEAV1Contract.SEAProjectConfigurationDetails(
          0,
          genArt721CoreAddress
        );
      if (projectConfigDetails.nextTokenNumberIsPopulated) {
        await minterSEAV1Contract
          .connect(deployer)
          .ejectNextTokenTo(0, genArt721CoreAddress, artist.address);
      }
      // configure future auctions to emit ProjectNextTokenUpdated
      await minterSEAV1Contract.connect(artist).configureFutureAuctions(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        0, // _timestampStart
        60, // _auctionDurationSeconds
        ethers.utils.parseEther("1"), // _basePrice
        5 // _minBidIncrementPercentage
      );
      // @dev project ID is 0, so next token ID is same as next token number
      const onChainNextTokenId = (
        await minterSEAV1Contract.SEAProjectConfigurationDetails(
          0,
          genArt721CoreAddress
        )
      ).nextTokenNumber;

      // validate subgraph effects
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterSEAV1Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.projectNextTokenId).toBe(onChainNextTokenId);
    });
  });

  describe("ProjectNextTokenEjected", () => {
    afterEach(async () => {
      // clear the future auction details for the project
      try {
        await minterSEAV1Contract
          .connect(artist)
          .resetFutureAuctionDetails(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test success
      }
      // clear the current minter for the project
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    test("indexes populate next token as expected", async () => {
      // artist configures future auctions
      // @dev must set as active minter since configuring mints a token to "next" slot
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterSEAV1Address // _minter
      );
      // eject any pre-populated next token on the project
      const projectConfigDetails =
        await minterSEAV1Contract.SEAProjectConfigurationDetails(
          0,
          genArt721CoreAddress
        );
      if (projectConfigDetails.nextTokenNumberIsPopulated) {
        await minterSEAV1Contract
          .connect(deployer)
          .ejectNextTokenTo(0, genArt721CoreAddress, artist.address);
      }
      // configure future auctions to emit ProjectNextTokenUpdated
      await minterSEAV1Contract.connect(artist).configureFutureAuctions(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        0, // _timestampStart
        60, // _auctionDurationSeconds
        ethers.utils.parseEther("1"), // _basePrice
        5 // _minBidIncrementPercentage
      );
      // @dev project ID is 0, so next token ID is same as next token number
      const onChainNextTokenId = (
        await minterSEAV1Contract.SEAProjectConfigurationDetails(
          0,
          genArt721CoreAddress
        )
      ).nextTokenNumber;

      // eject the token
      await minterSEAV1Contract.connect(artist).resetFutureAuctionDetails(
        0, // _projectId
        genArt721CoreAddress // _coreContract
      );
      await minterSEAV1Contract
        .connect(deployer)
        .ejectNextTokenTo(0, genArt721CoreAddress, artist.address);

      // validate subgraph effects
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterSEAV1Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.projectNextTokenId).toBe(undefined);
    });
  });
});
