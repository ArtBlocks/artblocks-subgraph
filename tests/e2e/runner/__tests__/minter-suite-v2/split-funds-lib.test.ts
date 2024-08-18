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
import { MinterSetPriceERC20V5__factory } from "../../contracts/factories/MinterSetPriceERC20V5__factory";
import { ERC20Mock__factory } from "../../contracts/factories/ERC20Mock__factory";
import { ethers } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
import { ERC20MockAltDecimals__factory } from "../../contracts";
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

// get MinterSetPriceERC20V5
// @dev this is minter at index 1 in the subgraph config
const minterSetPriceERC20V5Address =
  config.genericMinterEventsLibContracts[1].address;
const minterSetPriceERC20V5Contract = new MinterSetPriceERC20V5__factory(
  deployer
).attach(minterSetPriceERC20V5Address);

describe("SplitFundsLib event handling", () => {
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

  describe("ProjectCurrencyInfoUpdated", () => {
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
      const newCurrency = await new ERC20MockAltDecimals__factory(
        artist
      ).deploy(ethers.utils.parseEther("100"));
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
      await waitUntilSubgraphIsSynced(client);
      // validate currency info in subgraph
      const targetId = `${minterSetPriceERC20V5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );

      const decimals = await newCurrency.decimals();

      expect(minterConfigRes.currencySymbol).toBe(currencySymbol);
      expect(minterConfigRes.currencyAddress).toBe(
        newCurrency.address.toLowerCase()
      );
      expect(minterConfigRes.currencyDecimals).toBe(decimals);
    });
  });
});
