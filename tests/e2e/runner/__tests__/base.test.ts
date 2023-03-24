import fs from "fs";
import { describe, test, expect } from "@jest/globals";
import {
  createClient,
  dedupExchange,
  cacheExchange,
  fetchExchange,
  Client,
} from "@urql/core";
import { retryExchange } from "@urql/exchange-retry";
import {
  GetContractsDocument,
  GetContractsQuery,
  GetContractsQueryVariables,
  GetCurrentBlockNumberDocument,
  GetCurrentBlockNumberQuery,
} from "../generated/graphql";
import { SubgraphConfig } from "./subgraph-config";
import fetch from "cross-fetch";
import { ethers } from "ethers";

const createSubgraphClient = (): Client => {
  const client = createClient({
    url: process.env.SUBGRAPH_GRAPHQL_URL as string,
    fetch: fetch as any,
    exchanges: [
      dedupExchange,
      cacheExchange,
      retryExchange({
        maxNumberAttempts: 5,
        retryIf: (error) => !!error,
      }),
      fetchExchange,
    ],
    requestPolicy: "network-only",
  });

  return client;
};

const contracts = JSON.parse(
  fs.readFileSync("/usr/runner/shared/test-config.json", "utf-8")
) as SubgraphConfig;

const client = createSubgraphClient();

const waitUntilSubgraphIsSynced = async () => {
  const provider = new ethers.providers.JsonRpcProvider("http://hardhat:8545");

  const currentBlockNumber = await provider.getBlockNumber();
  let syncedBlock = 0;
  while (syncedBlock < currentBlockNumber) {
    const syncedBlockRes = await client
      .query<GetCurrentBlockNumberQuery, GetContractsQueryVariables>(
        GetCurrentBlockNumberDocument,
        {}
      )
      .toPromise();
    syncedBlock = syncedBlockRes.data?._meta?.block.number ?? syncedBlock;
  }
};

describe("Contracts exist", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced();
  });

  test("contracts exist", async () => {
    const contractsRes = await client
      .query<GetContractsQuery, GetContractsQueryVariables>(
        GetContractsDocument,
        {}
      )
      .toPromise();

    expect(contractsRes.data?.contracts.length).toBeGreaterThan(0);
  });
});
