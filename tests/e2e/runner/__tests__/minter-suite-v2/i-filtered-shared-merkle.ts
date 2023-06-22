import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  waitUntilSubgraphIsSynced,
  getMinterDetails,
} from "../utils/helpers";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();

const client = createSubgraphClient();

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

// get MinterSetPriceMerkleV5 contract from the subgraph config
if (!config.iSharedMerkleContracts) {
  throw new Error("No iSharedMerkleContracts in config");
}
const minterSetPriceMerkleV5Address = config.iSharedMerkleContracts[0].address;

describe("iFilteredSharedMerkle event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = minterSetPriceMerkleV5Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      expect(minterRes.id).toBe(targetId);
    });
  });

  describe("DefaultMaxInvocationsPerAddress", () => {
    // this is a minter-level, immutable value set in the constructor,
    // so we can only inspect it by checking the Minter entity in the subgraph
    // that was created during deployment
    test("value was populated during deployment", async () => {
      // validate minter's extraMinterDetails in subgraph
      const targetId = minterSetPriceMerkleV5Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.defaultMaxInvocationsPerAddress).toBe(1);
    });
  });

  describe("DelegationRegistryUpdated", () => {
    // this is a minter-level, immutable value set in the constructor,
    // so we can only inspect it by checking the Minter entity in the subgraph
    // that was created during deployment
    test("value was populated during deployment", async () => {
      // validate minter's extraMinterDetails in subgraph
      const targetId = minterSetPriceMerkleV5Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.delegationRegistryAddress).toBe(
        delegationRegistryAddress.toLowerCase()
      );
    });
  });
});
