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
import { MinterDAExpV5__factory } from "../../contracts/factories/MinterDAExpV5__factory";
import { MinterDALinV5__factory } from "../../contracts/factories/MinterDALinV5__factory";

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

// get MinterDAExp contract from the subgraph config
if (!config.DAExpLibContracts) {
  throw new Error("No DAExpLibContracts in config");
}
const minterDAExpV5Address = config.DAExpLibContracts[0].address;
const minterDAExpV5Contract = new MinterDAExpV5__factory(deployer).attach(
  minterDAExpV5Address
);

// get MinterDALin contract from the subgraph config
if (!config.DALinLibContracts) {
  throw new Error("No DALinLibContracts in config");
}
const minterDALinV5Address = config.DALinLibContracts[0].address;
const minterDALinV5Contract = new MinterDALinV5__factory(deployer).attach(
  minterDALinV5Address
);

describe("DALib event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("ResetAuctionDetails", () => {
    afterEach(async () => {
      // clear the auction details for the project (in case test failed and
      // didn't clean up after itself)
      // @dev no try/catch needed, as reset can be called multiple times
      await minterDAExpV5Contract
        .connect(deployer)
        .resetAuctionDetails(0, genArt721CoreAddress);
      // clear the current minter for the project
      // @dev call success depends on test state, so use a try/catch block
      try {
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (error) {
        // try block will only fail in case of previously failed test where
        // project zero never had its minter assigned.
        // Thus, swallow error here because the test failure has already been
        // reported, and additional error messaging from afterEach is not
        // helpful.
      }
    });

    test("subgraph is updated after event emitted on DA Exp minter", async () => {
      // artist configures auction
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterDAExpV5Address // _minter
      );
      const latestBlock = await deployer.provider.getBlock("latest");
      const targetAuctionStart = latestBlock.timestamp + 3600;
      const targetStartPrice = ethers.utils.parseEther("1");
      const targetBasePrice = ethers.utils.parseEther("0.1");
      await minterDAExpV5Contract.connect(artist).setAuctionDetails(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _timestampStart
        600, // _priceDecayHalfLifeSeconds
        targetStartPrice, // _startPrice
        targetBasePrice // _basePrice
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterDAExpV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate fields
      expect(minterConfigRes.priceIsConfigured).toBe(true);
      expect(minterConfigRes.basePrice).toBeDefined();
      // validate extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.startPrice).toBeDefined();
      expect(extraMinterDetails.startTime).toBeDefined();
      expect(extraMinterDetails.halfLifeSeconds).toBeDefined();
      expect(extraMinterDetails.approximateDAExpEndTime).toBeDefined();

      // reset auction details
      await minterDAExpV5Contract
        .connect(deployer)
        .resetAuctionDetails(0, genArt721CoreAddress);
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const minterConfigResAfterReset =
        await getProjectMinterConfigurationDetails(client, targetId);
      // validate fields
      expect(minterConfigResAfterReset.priceIsConfigured).toBe(false);
      expect(minterConfigResAfterReset.basePrice).toBe(null);
      // validate extraMinterDetails
      const extraMinterDetailsAfterReset = JSON.parse(
        minterConfigResAfterReset.extraMinterDetails
      );
      expect(extraMinterDetailsAfterReset.startPrice).toBeUndefined();
      expect(extraMinterDetailsAfterReset.startTime).toBeUndefined();
      expect(extraMinterDetailsAfterReset.halfLifeSeconds).toBeUndefined();
      expect(
        extraMinterDetailsAfterReset.approximateDAExpEndTime
      ).toBeUndefined();
    });

    test("subgraph is updated after event emitted on DA Lin minter", async () => {
      // artist configures auction
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        minterDALinV5Address // _minter
      );
      const latestBlock = await deployer.provider.getBlock("latest");
      const targetAuctionStart = latestBlock.timestamp + 3600;
      const targetAuctionEnd = targetAuctionStart + 3600;
      const targetStartPrice = ethers.utils.parseEther("1");
      const targetBasePrice = ethers.utils.parseEther("0.1");
      await minterDALinV5Contract.connect(artist).setAuctionDetails(
        0, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _auctionTimestampStart
        targetAuctionEnd, // _auctionTimestampEnd
        targetStartPrice, // _startPrice
        targetBasePrice // _basePrice
      );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterDALinV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate fields
      expect(minterConfigRes.priceIsConfigured).toBe(true);
      expect(minterConfigRes.basePrice).toBeDefined();
      // validate extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.startPrice).toBeDefined();
      expect(extraMinterDetails.startTime).toBeDefined();
      expect(extraMinterDetails.endTime).toBeDefined();

      // reset auction details
      await minterDALinV5Contract
        .connect(deployer)
        .resetAuctionDetails(0, genArt721CoreAddress);
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const minterConfigResAfterReset =
        await getProjectMinterConfigurationDetails(client, targetId);
      // validate fields
      expect(minterConfigResAfterReset.priceIsConfigured).toBe(false);
      expect(minterConfigResAfterReset.basePrice).toBe(null);
      // validate extraMinterDetails
      const extraMinterDetailsAfterReset = JSON.parse(
        minterConfigResAfterReset.extraMinterDetails
      );
      expect(extraMinterDetailsAfterReset.startPrice).toBeUndefined();
      expect(extraMinterDetailsAfterReset.startTime).toBeUndefined();
      expect(extraMinterDetailsAfterReset.endTime).toBeUndefined();
    });
  });
});
