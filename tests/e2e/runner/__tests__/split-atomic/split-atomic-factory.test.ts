import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  getAccounts,
  waitUntilSubgraphIsSynced,
  getSplitAtomicFactoryDetails,
} from "../utils/helpers";

// splitter contracts
import { SplitAtomicV0__factory } from "../../contracts/factories/SplitAtomicV0__factory";
import { SplitAtomicFactoryV0__factory } from "../../contracts/factories/SplitAtomicFactoryV0__factory";

import { ethers } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();

const client = createSubgraphClient();
const { deployer, artist } = getAccounts();

// get SplitAtomicFactory contract from the subgraph config
if (!config.iSplitAtomicFactoryV0Contracts) {
  throw new Error("No iSplitAtomicFactoryV0Contracts in config");
}
const splitAtomicFactoryV0Address =
  config.iSplitAtomicFactoryV0Contracts[0].address;
const splitAtomicFactoryV0Contract = new SplitAtomicFactoryV0__factory(
  deployer
).attach(splitAtomicFactoryV0Address);

describe("SplitAtomicFactoryV0 event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = splitAtomicFactoryV0Address.toLowerCase();
      const splitAtomicFactoryRes = await getSplitAtomicFactoryDetails(
        client,
        targetId
      );
      expect(splitAtomicFactoryRes.id).toBe(targetId);
    });
  });

  // describe("AuctionMinHalfLifeSecondsUpdated", () => {
  //   // @dev no need to reset the affected value after each test
  //   test("updated after admin configures", async () => {
  //     // query public constant for the expected value (>0)
  //     const initialValue =
  //       await minterDAExpV5Contract.minimumPriceDecayHalfLifeSeconds();
  //     const newTargetValue = initialValue.add(1);
  //     // update the minter value
  //     await minterDAExpV5Contract
  //       .connect(deployer)
  //       .setMinimumPriceDecayHalfLifeSeconds(newTargetValue);
  //     // validate minter's extraMinterDetails in subgraph
  //     await waitUntilSubgraphIsSynced(client);
  //     const targetId = minterDAExpV5Address.toLowerCase();
  //     const minterRes = await getMinterDetails(client, targetId);
  //     const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
  //     expect(extraMinterDetails.minimumHalfLifeInSeconds).toBe(
  //       newTargetValue.toNumber()
  //     );
  //   });
  // });

  // describe("SetAuctionDetailsExp", () => {
  //   afterEach(async () => {
  //     // clear the auction details for the project
  //     await minterDAExpV5Contract
  //       .connect(deployer)
  //       .resetAuctionDetails(0, genArt721CoreAddress);
  //     // clear the current minter for the project
  //     // @dev call success depends on test state, so use a try/catch block
  //     try {
  //       await sharedMinterFilterContract
  //         .connect(artist)
  //         .removeMinterForProject(0, genArt721CoreAddress);
  //     } catch (error) {
  //       // try block will only fail in case of previously failed test where
  //       // project zero never had its minter assigned.
  //       // Thus, swallow error here because the test failure has already been
  //       // reported, and additional error messaging from afterEach is not
  //       // helpful.
  //     }
  //   });

  //   test("subgraph is updated after event emitted", async () => {
  //     // artist configures auction
  //     await sharedMinterFilterContract.connect(artist).setMinterForProject(
  //       0, // _projectId
  //       genArt721CoreAddress, // _coreContract
  //       minterDAExpV5Address // _minter
  //     );
  //     const latestBlock = await deployer.provider.getBlock("latest");
  //     const targetAuctionStart = latestBlock.timestamp + 3600;
  //     const targetStartPrice = ethers.utils.parseEther("1");
  //     const targetBasePrice = ethers.utils.parseEther("0.1");
  //     await minterDAExpV5Contract.connect(artist).setAuctionDetails(
  //       0, // _projectId
  //       genArt721CoreAddress, // _coreContract
  //       targetAuctionStart, // _timestampStart
  //       600, // _priceDecayHalfLifeSeconds
  //       targetStartPrice, // _startPrice
  //       targetBasePrice // _basePrice
  //     );
  //     // validate project minter config in subgraph
  //     await waitUntilSubgraphIsSynced(client);
  //     const targetId = `${minterDAExpV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
  //     const minterConfigRes = await getProjectMinterConfigurationDetails(
  //       client,
  //       targetId
  //     );
  //     // validate fields
  //     expect(minterConfigRes.priceIsConfigured).toBe(true);
  //     expect(minterConfigRes.basePrice).toBe(targetBasePrice.toString());
  //     // validate extraMinterDetails
  //     const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
  //     expect(extraMinterDetails.startPrice).toBe(targetStartPrice.toString());
  //     expect(extraMinterDetails.startTime).toBe(targetAuctionStart);
  //     expect(extraMinterDetails.halfLifeSeconds).toBe(600);
  //     const approxDALength = getApproxDAExpLength(
  //       targetStartPrice,
  //       targetBasePrice,
  //       600
  //     );
  //     expect(extraMinterDetails.approximateDAExpEndTime).toBe(
  //       targetAuctionStart + approxDALength
  //     );
  //   });
  // });
});
