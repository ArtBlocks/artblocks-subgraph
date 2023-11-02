import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  getAccounts,
  createSubgraphClient,
  waitUntilSubgraphIsSynced,
  getProjectMinterConfigurationDetails,
} from "../utils/helpers";

import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
import { MinterSetPriceMerkleV5__factory } from "../../contracts/factories/MinterSetPriceMerkleV5__factory";
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

// get MinterSetPriceMerkleV5 contract from the subgraph config
if (!config.merkleLibContracts) {
  throw new Error("No merkleLibContracts in config");
}
const minterSetPriceMerkleV5Address = config.merkleLibContracts[0].address;
const minterSetPriceMerkleV5Contract = new MinterSetPriceMerkleV5__factory(
  deployer
).attach(minterSetPriceMerkleV5Address);

describe("GenericMinterEventsLib event handling - generic handlers", () => {
  // NOTE: this test suite is not exhaustive, because not all generic events are currently used by
  // the current set of minters.
  // Tests for specific generic events should be added here as they are implemented in the minters.

  /**
   * HANDLERS THAT ARE TESTED HERE:
   * - ConfigValueSet - bytes32, via MinterSetPriceMerkleV5
   * - ConfigValueSet - bool, via MinterSetPriceV5
   * - ConfigValueSet - uint256, via MinterSetPriceV5
   *
   * HANDLERS THAT ARE NOT TESTED HERE (because they are not used by any minters):
   * - ConfigValueSet - address
   * - ConfigKeyRemoved,
   * - ConfigValueAddedToSet - bytes32
   * - ConfigValueAddedToSet - uint256
   * - ConfigValueAddedToSet - address
   * - ConfigValueRemovedFromSet - bytes32
   * - ConfigValueRemovedFromSet - uint256
   * - ConfigValueRemovedFromSet - address
   */

  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("ConfigValueSet - bytes32, via MinterSetPriceMerkleV5", () => {
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

    test("extra minter details is updated", async () => {
      // set minter for project zero to the target minter
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(
          0,
          genArt721CoreAddress,
          minterSetPriceMerkleV5Address
        );
      // update Merkle root
      const newMerkleRoot =
        "0x3d452f69dbe7dcd6122683e97b96a2bdf987a89ee44776d5d5cde903bc88795a"; // randomly generated value
      await minterSetPriceMerkleV5Contract
        .connect(artist)
        .updateMerkleRoot(0, genArt721CoreAddress, newMerkleRoot);
      await waitUntilSubgraphIsSynced(client);
      // validate extra minter details in subgraph
      const targetId = `${minterSetPriceMerkleV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      // verify that the Merkle root was updated
      const targetKey = "merkleRoot";
      expect(extraMinterDetails[targetKey]).toBe(newMerkleRoot);
    });
  });

  describe("ConfigValueSet - bool, via MinterSetPriceMerkleV5", () => {
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

    test("extra minter details is updated", async () => {
      // set minter for project zero to the target minter
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(
          0,
          genArt721CoreAddress,
          minterSetPriceMerkleV5Address
        );
      // set project invocations per address to trigger the event
      const newMaxInvocationsPerAddress = Math.floor(Math.random() * 100);
      await minterSetPriceMerkleV5Contract
        .connect(artist)
        .setProjectInvocationsPerAddress(
          0,
          genArt721CoreAddress,
          newMaxInvocationsPerAddress
        );
      await waitUntilSubgraphIsSynced(client);
      // validate extra minter details in subgraph
      const targetId = `${minterSetPriceMerkleV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      // verify that the bool use max invocations per address override was updated
      // @dev ackgnoledge that this could have been true previously, but verify that it is
      // true now (also, if true previously, it must have been updated by this event previously,
      // so still testing the event handling behavior)
      const targetKey = "useMaxMintsPerAddrOverride";
      expect(extraMinterDetails[targetKey]).toBe(true);
    });
  });

  describe("ConfigValueSet - uint256, via MinterSetPriceMerkleV5", () => {
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

    test("extra minter details is updated", async () => {
      // set minter for project zero to the target minter
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(
          0,
          genArt721CoreAddress,
          minterSetPriceMerkleV5Address
        );
      // set project invocations per address to trigger the event
      const newMaxInvocationsPerAddress = Math.floor(Math.random() * 100);
      await minterSetPriceMerkleV5Contract
        .connect(artist)
        .setProjectInvocationsPerAddress(
          0,
          genArt721CoreAddress,
          newMaxInvocationsPerAddress
        );
      await waitUntilSubgraphIsSynced(client);
      // validate extra minter details in subgraph
      const targetId = `${minterSetPriceMerkleV5Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-0`;
      const minterConfigRes = await getProjectMinterConfigurationDetails(
        client,
        targetId
      );
      const extraMinterDetails = JSON.parse(minterConfigRes.extraMinterDetails);
      // verify that the max invocations per address override was updated to the new value
      const targetKey = "maxMintsPerAddrOverride";
      expect(extraMinterDetails[targetKey]).toBe(newMaxInvocationsPerAddress);
    });
  });
});
