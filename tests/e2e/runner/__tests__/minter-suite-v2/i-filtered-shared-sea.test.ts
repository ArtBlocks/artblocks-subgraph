import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  getAccounts,
  waitUntilSubgraphIsSynced,
  getMinterDetails,
  getProjectMinterConfigurationDetails,
} from "../utils/helpers";

import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
import { MinterSEAV1__factory } from "../../contracts/factories/MinterSEAV1__factory";

import { ethers } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

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
if (!config.iSharedSEAContracts) {
  throw new Error("No iSharedSEAContracts in config");
}
const minterSEAV1Address = config.iSharedSEAContracts[0].address;
const minterSEAV1Contract = new MinterSEAV1__factory(deployer).attach(
  minterSEAV1Address
);

describe("iFilteredSharedMerkle event handling", () => {
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
        minterConfigInitial.minterTimeBufferSeconds_ + 1;
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
        minterConfigInitial.minterRefundGasLimit_ + 1;
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

  // TODO: fix this test
  // describe("ConfiguredFutureAuctions", () => {
  //   afterEach(async () => {
  //     // clear the future auction details for the project
  //     try {
  //       await minterSEAV1Contract
  //         .connect(artist)
  //         .resetFutureAuctionDetails(0, genArt721CoreAddress);
  //     } catch (error) {
  //       // swallow error in case of test failure
  //     }
  //   });

  //   test("subgraph is updated after event emitted", async () => {
  //     // artist configures future auctions
  //     await minterSEAV1Contract.connect(artist).configureFutureAuctions(
  //       0, // _projectId
  //       genArt721CoreAddress, // _coreContract
  //       0, // _timestampStart
  //       600, // _auctionDurationSeconds
  //       ethers.utils.parseEther("1"), // _basePrice
  //       5 // _minBidIncrementPercentage
  //     );
  //     // validate project minter config in subgraph
  //     await waitUntilSubgraphIsSynced(client);
  //     const targetId = `${minterSEAV1Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
  //     const minterConfigRes = await getProjectMinterConfigurationDetails(
  //       client,
  //       targetId
  //     );
  //     // validate fields
  //     expect(minterConfigRes.priceIsConfigured).toBe(true);
  //     expect(minterConfigRes.basePrice).toBe("0");
  //     // validate extraMinterDetails
  //     const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
  //     expect(extraMinterDetails.startTime).toBe(0);
  //     expect(extraMinterDetails.projectAuctionDurationSeconds).toBe(600);
  //     expect(extraMinterDetails.minBidIncrementPercentage).toBe(5);
  //   });
  // });

  // TODO: ResetAuctionDetails

  // TODO: AuctionInitialized

  // TODO: AuctionBid

  // TODO: AuctionSettled

  // TODO: ProjectNextTokenUpdated

  // TODO: ProjectNextTokenEjected
});
