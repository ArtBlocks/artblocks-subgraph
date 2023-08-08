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

const bytecodeStorageReaderAddress =
  config.metadata?.bytecodeStorageReaderAddress;
if (!bytecodeStorageReaderAddress)
  throw new Error(
    "No bytecode storage reader address found in config metadata"
  );
const linkLibraryAddresses: GenArt721CoreV3LibraryAddresses = {
  "contracts/libs/0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
    bytecodeStorageReaderAddress,
};
const genArt721CoreContract = new GenArt721CoreV3__factory(
  linkLibraryAddresses,
  deployer
).attach(genArt721CoreAddress);

// get MinterDAExpSettlement contract from the subgraph config
if (!config.iSharedDAExpSettlementContracts) {
  throw new Error("No iSharedDAExpSettlementContracts in config");
}
const minterDAExpSettlementV3Address =
  config.iSharedDAExpSettlementContracts[0].address;
const minterDAExpSettlementV3Contract = new MinterDAExpSettlementV3__factory(
  deployer
).attach(minterDAExpSettlementV3Address);

describe("iSharedMinterDAExpSettlement event handling", () => {
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

  describe("ArtistAndAdminRevenuesWithdrawn", () => {
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

    test("subgraph is updated after event emitted", async () => {
      // add new project to use with this irreversible test
      currentProjectNumber = await genArt721CoreContract.nextProjectId();
      await genArt721CoreContract
        .connect(deployer)
        .addProject(
          "Test project for iSharedMinterDAExpSettlementV3:ArtistAndAdminRevenuesWithdrawn",
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
      const targetStartPrice = ethers.utils.parseEther("0.100001");
      const targetBasePrice = ethers.utils.parseEther("0.1");
      await minterDAExpSettlementV3Contract.connect(artist).setAuctionDetails(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _timestampStart
        600, // _priceDecayHalfLifeSeconds
        targetStartPrice, // _startPrice
        targetBasePrice // _basePrice
      );
      // validate initial state of project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${minterDAExpSettlementV3Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${currentProjectNumber.toString()}`;
      const initialMinterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const initialExtraMinterDetails = JSON.parse(
        initialMinterConfigRes.extraMinterDetails
      );
      expect(initialExtraMinterDetails.auctionRevenuesCollected).toBe(false);
      // artist may immediately withdraw their revenue since it is a short auction
      await new Promise((f) => setTimeout(f, 6000)); // extra second of margin
      await minterDAExpSettlementV3Contract
        .connect(artist)
        .withdrawArtistAndAdminRevenues(
          currentProjectNumber, // _projectId
          genArt721CoreAddress // _coreContract
        );
      // validate project minter config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      // validate affected field on extraMinterDetails
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      expect(extraMinterDetails.auctionRevenuesCollected).toBe(true);
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

    test("subgraph is updated after event emitted", async () => {
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
      const targetStartPrice = ethers.utils.parseEther("1.0");
      const targetBasePrice = ethers.utils.parseEther("0.1");
      await minterDAExpSettlementV3Contract.connect(artist).setAuctionDetails(
        currentProjectNumber, // _projectId
        genArt721CoreAddress, // _coreContract
        targetAuctionStart, // _timestampStart
        600, // _priceDecayHalfLifeSeconds
        targetStartPrice, // _startPrice
        targetBasePrice // _basePrice
      );
      // purchase a token to trigger Receipt update event
      await new Promise((f) => setTimeout(f, 6000)); // extra second of margin so auction has started
      await minterDAExpSettlementV3Contract
        .connect(artist)
        .purchase(currentProjectNumber, genArt721CoreAddress, {
          value: targetStartPrice,
        });

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
      expect(receiptRes.netPosted).toBe(targetStartPrice);
      expect(receiptRes.numPurchased).toBe(1);
      expect(receiptRes.updatedAt).toBe(false);
    });
  });
});
