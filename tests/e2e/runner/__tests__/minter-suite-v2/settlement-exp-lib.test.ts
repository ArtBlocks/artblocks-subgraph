import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  getAccounts,
  waitUntilSubgraphIsSynced,
  getMinterDetails,
  getReceiptDetails,
  getProjectMinterConfigurationDetails,
} from "../utils/helpers";

import {
  GenArt721CoreV3__factory,
  GenArt721CoreV3LibraryAddresses,
} from "../../contracts/factories/GenArt721CoreV3__factory";
import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
import { MinterDAExpSettlementV3__factory } from "../../contracts/factories/MinterDAExpSettlementV3__factory";

import { ethers, BigNumber } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
// @dev specifically for this test, we need to wait for auction to complete, which is half of 45-second min half life
// length = 22.5 seconds, plus 6 buffer seconds for the auction to start ~=30 seconds,
// times 2 margin since this is just a timeout = 60 seconds timeout
jest.setTimeout(60 * 1000);

const config = getSubgraphConfig();

const client = createSubgraphClient();
const { deployer, artist } = getAccounts();

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

// get MinterDAExpSettlement contract from the subgraph config
if (!config.settlementExpLibContracts) {
  throw new Error("No settlementExpLibContracts in config");
}
const minterDAExpSettlementV3Address =
  config.settlementExpLibContracts[0].address;
const minterDAExpSettlementV3Contract = new MinterDAExpSettlementV3__factory(
  deployer
).attach(minterDAExpSettlementV3Address);

describe("SettlementExpLib event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = minterDAExpSettlementV3Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      expect(minterRes.id).toBe(targetId);
    });
  });

  describe("ReceiptUpdated", () => {
    let currentProjectNumber: BigNumber | undefined = undefined;
    afterEach(async () => {
      // clear the current minter for the project
      // @dev okay to clear minter for project 0 in case of undefined project number,
      // because that is the "clean" end state for that project anyway
      await sharedMinterFilterContract
        .connect(artist)
        .removeMinterForProject(
          currentProjectNumber || 0,
          genArt721CoreAddress
        );
    });

    test("subgraph is updated after event emitted, settled price is accurate and a string", async () => {
      // add new project to use with this irreversible test
      currentProjectNumber = await genArt721CoreContract.nextProjectId();
      await genArt721CoreContract
        .connect(deployer)
        .addProject(
          "Test project for iSharedMinterDAExpSettlementV3:ReceiptUpdated",
          artist.address
        );
      await genArt721CoreContract
        .connect(deployer)
        .toggleProjectIsActive(currentProjectNumber);
      await genArt721CoreContract
        .connect(artist)
        .toggleProjectIsPaused(currentProjectNumber);
      // artist configures auction
      await sharedMinterFilterContract.connect(artist).setMinterForProject(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        minterDAExpSettlementV3Address // _minter
      );
      const latestBlock = await deployer.provider.getBlock("latest");
      const targetAuctionStart = latestBlock.timestamp + 5; // 5 seconds of margin
      // make a very short auction so it ends quickly
      // @dev intentionally use a low price here to ensure use of string
      const targetStartPrice = ethers.utils.parseEther("0.005");
      const targetBasePrice = ethers.utils.parseEther("0.00375"); // total auction time is 1/2 of a half life
      await minterDAExpSettlementV3Contract.connect(artist).setAuctionDetails(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _timestampStart
        45, // _priceDecayHalfLifeSeconds
        targetStartPrice, // _startPrice
        targetBasePrice // _basePrice
      );
      // PART 1: purchase a token to trigger Receipt update event
      await new Promise((f) => setTimeout(f, 6000)); // extra second of margin so auction has started
      const tx = await minterDAExpSettlementV3Contract
        .connect(artist)
        .purchase(currentProjectNumber, genArt721CoreAddress, {
          value: targetStartPrice,
        });
      const receipt = await tx.wait();
      const blockTimestamp = (
        await artist.provider.getBlock(receipt.blockNumber)
      ).timestamp;

      // validate state of Receipt in the subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterDAExpSettlementV3Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber.toString()}-${artist.address.toLowerCase()}`;
      const targetProjectId = `${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber.toString()}`;
      const receiptRes = await getReceiptDetails(client, targetId);
      expect(receiptRes.project.id).toBe(targetProjectId);
      expect(receiptRes.minter.id).toBe(
        minterDAExpSettlementV3Address.toLowerCase()
      );
      expect(receiptRes.account.id).toBe(artist.address.toLowerCase());
      expect(receiptRes.netPosted).toBe(targetStartPrice.toString());
      expect(receiptRes.numPurchased).toBe("1");
      expect(receiptRes.updatedAt.toString()).toBe(blockTimestamp?.toString());

      // validate the state of extraMinterDetails in the subgraph
      // get last purchase price directly from minter contract
      const latestPurchasePrice =
        await minterDAExpSettlementV3Contract.getProjectLatestPurchasePrice(
          currentProjectNumber,
          genArt721CoreAddress
        );
      const targetConfigId = `${minterDAExpSettlementV3Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber.toString()}`;
      const projectMinterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetConfigId
      );
      const extraMinterDetails = JSON.parse(
        projectMinterConfigRes.extraMinterDetails
      );
      // @dev important that this is a string due to potential for numeric overflow in js
      expect(extraMinterDetails.currentSettledPrice).toBe(
        latestPurchasePrice.toString()
      );

      // PART 2: Artist withdraws revenues, and settled price is updated, remains a string
      await new Promise((f) => setTimeout(f, 22500)); // wait the length of the auction, 22.5 seconds
      const withdrawalTx = await minterDAExpSettlementV3Contract
        .connect(artist)
        .withdrawArtistAndAdminRevenues(
          currentProjectNumber,
          genArt721CoreAddress
        );
      // validate state of projectMinterConfig in the subgraph
      await waitUntilSubgraphIsSynced(client);
      const projectMinterConfigRes2 =
        await getProjectMinterConfigurationDetails(client, targetConfigId);
      const extraMinterDetails2 = JSON.parse(
        projectMinterConfigRes2.extraMinterDetails
      );
      // price should be updated to base price because auction reached end
      // @dev important that this is a string due to potential for numeric overflow in js
      expect(extraMinterDetails2.currentSettledPrice).toBe(
        targetBasePrice.toString()
      );
      // snapshot of relevant state at time of withdrawal should be available
      expect(
        extraMinterDetails2.revenueWithdrawalSnapshot_widthdrawalTxHash
      ).toBe(withdrawalTx.hash);
      expect(
        extraMinterDetails2.revenueWithdrawalSnapshot_renderProviderAddress
      ).toBe(deployer.address.toLowerCase());
      expect(
        extraMinterDetails2.revenueWithdrawalSnapshot_renderProviderPercentage
      ).toBe(10);
      // expect no platform provider info because tested core is a Flagship (not Engine)
      expect(
        extraMinterDetails2.revenueWithdrawalSnapshot_platformProviderAddress
      ).toBeUndefined();
      expect(
        extraMinterDetails2.revenueWithdrawalSnapshot_platformProviderPercentage
      ).toBeUndefined();
      expect(extraMinterDetails2.revenueWithdrawalSnapshot_artistAddress).toBe(
        artist.address.toLowerCase()
      );
      // expect no additional payee address because artist never configured it
      expect(
        extraMinterDetails2.revenueWithdrawalSnapshot_additionalPayeeAddress
      ).toBeUndefined();
      // expect additional payee percentage to always be defined, zero in this case
      // because artist never configured it
      expect(
        extraMinterDetails2.revenueWithdrawalSnapshot_additionalPayeePercentage
      ).toBe(0);
    });
  });
});
