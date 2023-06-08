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
} from "./helpers";

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();
const client = createSubgraphClient();

// const client = createSubgraphClient();

// const waitUntilSubgraphIsSynced = async () => {
//   const provider = new ethers.providers.JsonRpcProvider("http://hardhat:8545");

//   const currentBlockNumber = await provider.getBlockNumber();
//   let syncedBlock = 0;
//   let iterations = 0;
//   while (syncedBlock < currentBlockNumber) {
//     const syncedBlockRes = await client
//       .query<GetCurrentBlockNumberQuery, GetContractsQueryVariables>(
//         GetCurrentBlockNumberDocument,
//         {}
//       )
//       .toPromise();
//     syncedBlock = syncedBlockRes.data?._meta?.block.number ?? syncedBlock;
//     // wait 1 second before checking again
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     // after 20 iterations, fail the test, and alert that subgraph may have failed
//     if (iterations++ > 20) {
//       throw new Error(
//         "Subgraph did not sync in time - CHECK GRAPH NODE LOGS FOR CRASHED SUBGRAPH!"
//       );
//     }
//   }
// };

describe("ALT contract exist", () => {
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
