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
import { MinterSetPriceHolderV5__factory } from "../../contracts/factories/MinterSetPriceHolderV5__factory";

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

// get MinterSetPriceHolderV5 contract from the subgraph config
if (!config.iSharedHolderContracts) {
  throw new Error("No iSharedHolderContracts in config");
}
const minterSetPriceHolderV5Address = config.iSharedHolderContracts[0].address;
const minterSetPriceHolderV5Contract = new MinterSetPriceHolderV5__factory(
  deployer
).attach(minterSetPriceHolderV5Address);

describe("iFilteredSharedMerkle event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = minterSetPriceHolderV5Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      expect(minterRes.id).toBe(targetId);
    });
  });

  describe("DelegationRegistryUpdated", () => {
    // this is a minter-level, immutable value set in the constructor,
    // so we can only inspect it by checking the Minter entity in the subgraph
    // that was created during deployment
    test("value was populated during deployment", async () => {
      // validate minter's extraMinterDetails in subgraph
      const targetId = minterSetPriceHolderV5Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.delegationRegistryAddress).toBe(
        delegationRegistryAddress.toLowerCase()
      );
    });
  });

  describe("AllowedHoldersOfProjects", () => {
    afterEach(async () => {
      // remove the allowlisting of holders of project one
      // @dev call success depends on test state, so use a try/catch block
      try {
        await minterSetPriceHolderV5Contract
          .connect(artist)
          .removeHoldersOfProjects(
            0,
            genArt721CoreAddress,
            [genArt721CoreAddress],
            [1]
          );
      } catch (error) {
        // try block will fail in case of previously successful test where
        // holders were successfully removed. In case of failed test that did
        // not clean up after itself, this will properly clean up.
        // Thus, swallow error here because entering catch block means the
        // test was successful.
      }

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

    test("value is populated during call to allowHoldersOfProjects", async () => {
      // set minter for project zero to the target minter
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(
          0,
          genArt721CoreAddress,
          minterSetPriceHolderV5Address
        );
      // allow holders of project one of current contract
      await minterSetPriceHolderV5Contract
        .connect(artist)
        .allowHoldersOfProjects(
          0,
          genArt721CoreAddress,
          [genArt721CoreAddress],
          [1]
        );
      await waitUntilSubgraphIsSynced(client);
      // validate extraMinterDetails in subgraph
      const targetId = `${minterSetPriceHolderV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      const targetValue = `${genArt721CoreAddress.toLowerCase()}-1`;
      expect(extraMinterDetails.allowlistedAddressAndProjectId).toContain(
        targetValue
      );
    });
  });

  describe("RemovedHoldersOfProjects", () => {
    afterEach(async () => {
      // remove the allowlisting of holders of project one in case of test failure
      // @dev call success depends on test state, so use a try/catch block
      try {
        await minterSetPriceHolderV5Contract
          .connect(artist)
          .removeHoldersOfProjects(
            0,
            genArt721CoreAddress,
            [genArt721CoreAddress],
            [1]
          );
      } catch (error) {
        // try block will fail in case of previously successful test where
        // holders were successfully removed. In case of failed test that did
        // not clean up after itself, this will properly clean up.
        // Thus, swallow error here because entering catch block means the
        // test was successful.
      }

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

    test("value is populated during call to allowHoldersOfProjects", async () => {
      // set minter for project zero to the target minter
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(
          0,
          genArt721CoreAddress,
          minterSetPriceHolderV5Address
        );
      // allow holders of project one of current contract
      await minterSetPriceHolderV5Contract
        .connect(artist)
        .allowHoldersOfProjects(
          0,
          genArt721CoreAddress,
          [genArt721CoreAddress],
          [1]
        );
      await waitUntilSubgraphIsSynced(client);
      // validate extraMinterDetails in subgraph
      const targetId = `${minterSetPriceHolderV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      const targetValue = `${genArt721CoreAddress.toLowerCase()}-1`;
      expect(extraMinterDetails.allowlistedAddressAndProjectId).toContain(
        targetValue
      );

      // remove the allowlisting of holders of project one
      await minterSetPriceHolderV5Contract
        .connect(artist)
        .removeHoldersOfProjects(
          0,
          genArt721CoreAddress,
          [genArt721CoreAddress],
          [1]
        );
      await waitUntilSubgraphIsSynced(client);
      // validate extraMinterDetails in subgraph
      const minterConfigRes2 = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const extraMinterDetails2 = JSON.parse(
        minterConfigRes2.extraMinterDetails
      );
      expect(extraMinterDetails2.allowlistedAddressAndProjectId).not.toContain(
        targetValue
      );
    });
  });
});
