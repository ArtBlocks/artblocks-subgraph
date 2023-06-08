import { describe, test, expect } from "@jest/globals";
import {
  GetTargetContractsDocument,
  GetTargetContractsQuery,
  GetTargetContractsQueryVariables,
} from "../generated/graphql";
import {
  createSubgraphClient,
  waitUntilSubgraphIsSynced,
  getSubgraphConfig,
} from "./utils/helpers";

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();
const client = createSubgraphClient();

describe("expected contract exist", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  test("expected contracts exist", async () => {
    if (!config.iGenArt721CoreContractV3_BaseContracts) {
      throw new Error("No iGenArt721CoreContractV3_BaseContracts in config");
    }
    // target contract is the contract in the subgraph config
    const targetId =
      config.iGenArt721CoreContractV3_BaseContracts[0].address.toLowerCase();
    const contractsRes = await client
      .query<GetTargetContractsQuery, GetTargetContractsQueryVariables>(
        GetTargetContractsDocument,
        { targetId }
      )
      .toPromise();

    // expect to have found the target contract
    expect(contractsRes.data?.contracts.length).toBe(1);
    expect(contractsRes.data?.contracts[0].id).toBe(targetId);
  });
});
