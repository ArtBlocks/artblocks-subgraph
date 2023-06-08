import { describe, test, expect } from "@jest/globals";
import {
  GetTargetMinterFiltersDocument,
  GetTargetMinterFiltersQuery,
  GetTargetMinterFiltersQueryVariables,
} from "../../generated/graphql";
import {
  getSubgraphConfig,
  getAccounts,
  createSubgraphClient,
  waitUntilSubgraphIsSynced,
} from "../utils/helpers";

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();
const minterFilterAdminACLV0Address =
  config.metadata?.minterFilterAdminACLAddress;
if (!minterFilterAdminACLV0Address)
  throw new Error(
    "No minter filter admin ACL address found in config metadata"
  );

const coreRegistryAddress = config.metadata?.coreRegistryAddress;
if (!coreRegistryAddress)
  throw new Error("No core registry address found in config metadata");

const sharedMinterFilter = config.sharedMinterFilterContracts?.[0];
if (!sharedMinterFilter) {
  throw new Error("No shared minter filter found in config metadata");
}

const client = createSubgraphClient();
// const
const { deployer, artist } = getAccounts();

describe("Expected contract exist", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Deployed", () => {
    test("creates new MinterFilter during deployment", async () => {
      const targetId = sharedMinterFilter.address.toLowerCase();

      const minterFiltersRes = await client
        .query<
          GetTargetMinterFiltersQuery,
          GetTargetMinterFiltersQueryVariables
        >(GetTargetMinterFiltersDocument, { targetId })
        .toPromise();
      expect(minterFiltersRes.data?.minterFilters.length).toBe(1);
      expect(minterFiltersRes.data?.minterFilters[0].id).toBe(targetId);
    });
  });
});
