import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  getAccounts,
  createSubgraphClient,
  waitUntilSubgraphIsSynced,
  getMinterDetails,
  getProjectMinterConfigurationDetails,
} from "../utils/helpers";
import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
import { MinterSetPriceV5__factory } from "../../contracts/factories/MinterSetPriceV5__factory";
import { MinterSetPriceERC20V5__factory } from "../../contracts/factories/MinterSetPriceERC20V5__factory";
import { ERC20Mock__factory } from "../../contracts/factories/ERC20Mock__factory";
import { ethers } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();

const client = createSubgraphClient();
const { deployer, artist } = getAccounts();

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

// get MinterSetPriceV5
// @dev this is minter at index 0 in the subgraph config
if (!config.genericMinterEventsLibContracts) {
  throw new Error("No genericMinterEventsLibContracts in config");
}
const minterSetPriceV5Address =
  config.genericMinterEventsLibContracts[0].address;
const minterSetPriceV5Contract = new MinterSetPriceV5__factory(deployer).attach(
  minterSetPriceV5Address
);

// get MinterSetPriceERC20V5
// @dev this is minter at index 1 in the subgraph config
const minterSetPriceERC20V5Address =
  config.genericMinterEventsLibContracts[1].address;
const minterSetPriceERC20V5Contract = new MinterSetPriceERC20V5__factory(
  deployer
).attach(minterSetPriceERC20V5Address);

describe("SetPriceLib event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = minterSetPriceV5Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      expect(minterRes.id).toBe(targetId);
    });
  });

  describe("PricePerTokenUpdated", () => {
    afterEach(async () => {
      // clear the minter for project zero
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

    test("Price is updated and configured", async () => {
      // set minter for project zero to the target minter
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(0, genArt721CoreAddress, minterSetPriceV5Address);
      // update price
      const newPrice = ethers.utils.parseEther(Math.random().toString());
      await minterSetPriceV5Contract
        .connect(artist)
        .updatePricePerTokenInWei(0, genArt721CoreAddress, newPrice);
      await waitUntilSubgraphIsSynced(client);
      // validate price in subgraph
      const targetId = `${minterSetPriceV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      expect(minterConfigRes.basePrice).toBe(newPrice.toString());
      // @dev this could have been true before the update, but we can't know for sure, and
      // at least we validate that it's true after the update
      expect(minterConfigRes.priceIsConfigured).toBe(true);
    });
  });

  describe("PricePerTokenReset", () => {
    afterEach(async () => {
      // clear the minter for project zero
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
      // @dev we don't clear the currency info for project zero on the ERC20
      // minter, because it cannot be set to the zero address. Instead, we
      // deploy new ERC20 currencies for each test, and set the minter to use
      // that currency
    });

    test("Currency is updated and configured", async () => {
      const currencySymbol = "ERC20";
      // deploy new ERC20 currency, sending initial supply to artist
      const newCurrency = await new ERC20Mock__factory(artist).deploy(
        ethers.utils.parseEther("100")
      );
      // set minter for project zero to the fixed price ERC20 minter
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(
          0,
          genArt721CoreAddress,
          minterSetPriceERC20V5Address
        );
      // update currency info
      await minterSetPriceERC20V5Contract
        .connect(artist)
        .updateProjectCurrencyInfo(
          0,
          genArt721CoreAddress,
          currencySymbol,
          newCurrency.address
        );
      // configure price
      const newPrice = ethers.utils.parseEther(Math.random().toString());
      await minterSetPriceERC20V5Contract
        .connect(artist)
        .updatePricePerTokenInWei(0, genArt721CoreAddress, newPrice);
      await waitUntilSubgraphIsSynced(client);
      // validate currency info and price is configured in subgraph
      const targetId = `${minterSetPriceERC20V5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      expect(minterConfigRes.currencySymbol).toBe(currencySymbol);
      expect(minterConfigRes.currencyAddress).toBe(
        newCurrency.address.toLowerCase()
      );
      expect(minterConfigRes.basePrice).toBe(newPrice.toString());
      expect(minterConfigRes.priceIsConfigured).toBe(true);
      // invoke price reset by updating to a different currency
      const newCurrency2 = await new ERC20Mock__factory(artist).deploy(
        ethers.utils.parseEther("100")
      );
      const currencySymbol2 = "ERC20";
      await minterSetPriceERC20V5Contract
        .connect(artist)
        .updateProjectCurrencyInfo(
          0,
          genArt721CoreAddress,
          currencySymbol2,
          newCurrency2.address
        );
      await waitUntilSubgraphIsSynced(client);
      // validate currency info and price is NOT configured in subgraph
      const minterConfigRes2 = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      expect(minterConfigRes2.currencySymbol).toBe(currencySymbol2);
      expect(minterConfigRes2.currencyAddress).toBe(
        newCurrency2.address.toLowerCase()
      );
      expect(minterConfigRes2.priceIsConfigured).toBe(false);
      expect(minterConfigRes2.basePrice).toBe("0");
    });
  });
});
