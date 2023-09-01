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

// get MinterDALin contract from the subgraph config
if (!config.iSharedDALinContracts) {
  throw new Error("No iSharedDALinContracts in config");
}
const minterDALinV5Address = config.iSharedDALinContracts[0].address;
const minterDALinV5Contract = new MinterDALinV5__factory(deployer).attach(
  minterDALinV5Address
);

describe("iFilteredSharedDALin event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = minterDALinV5Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      expect(minterRes.id).toBe(targetId);
    });
  });

  describe("AuctionMinimumLengthSecondsUpdated", () => {
    // @dev no need to reset the affected value after each test
    test("updated after admin configures", async () => {
      // query public constant for the expected value (>0)
      const initialValue =
        await minterDALinV5Contract.minimumAuctionLengthSeconds();
      const newTargetValue = initialValue.add(1);
      // update the minter value
      await minterDALinV5Contract
        .connect(deployer)
        .setMinimumAuctionLengthSeconds(newTargetValue);
      // validate minter's extraMinterDetails in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = minterDALinV5Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.minimumAuctionLengthInSeconds).toBe(
        newTargetValue.toNumber()
      );
    });
  });

  describe("SetAuctionDetailsLin", () => {
    afterEach(async () => {
      // clear the auction details for the project
      await minterDALinV5Contract
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

    test("subgraph is updated after event emitted", async () => {
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
      expect(minterConfigRes.basePrice).toBe(targetBasePrice.toString());
      // validate extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.startPrice).toBe(targetStartPrice.toString());
      expect(extraMinterDetails.startTime).toBe(targetAuctionStart);
      expect(extraMinterDetails.endTime).toBe(targetAuctionEnd);
    });
  });
});
