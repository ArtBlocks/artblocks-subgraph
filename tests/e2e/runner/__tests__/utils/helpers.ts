import fs from "fs";
import {
  GetContractsQueryVariables,
  GetCurrentBlockNumberDocument,
  GetCurrentBlockNumberQuery,
} from "../../generated/graphql";
import {
  createClient,
  dedupExchange,
  cacheExchange,
  fetchExchange,
  Client,
} from "@urql/core";
import fetch from "cross-fetch";
import { retryExchange } from "@urql/exchange-retry";
import { ethers } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { SubgraphConfig } from "../subgraph-config";

export const getSubgraphConfig = () => {
  return JSON.parse(
    fs.readFileSync("/usr/runner/shared/test-config.json", "utf-8")
  ) as SubgraphConfig;
};

export const getAccounts = () => {
  const accounts = JSON.parse(
    fs.readFileSync("./shared/accounts.json", "utf8")
  );
  const deployer = ethers.Wallet.fromMnemonic(accounts.mnemonic).connect(
    new JsonRpcProvider("http://hardhat:8545")
  );
  const artist = ethers.Wallet.fromMnemonic(
    accounts.mnemonic,
    "m/44'/60'/1'/0/1" // derivation path index 1
  );
  return { deployer, artist };
};

export const createSubgraphClient = (): Client => {
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

export const waitUntilSubgraphIsSynced = async (client: Client) => {
  const provider = new ethers.providers.JsonRpcProvider("http://hardhat:8545");

  const currentBlockNumber = await provider.getBlockNumber();
  let syncedBlock = 0;
  let iterations = 0;
  while (syncedBlock < currentBlockNumber) {
    const syncedBlockRes = await client
      .query<GetCurrentBlockNumberQuery, GetContractsQueryVariables>(
        GetCurrentBlockNumberDocument,
        {}
      )
      .toPromise();
    syncedBlock = syncedBlockRes.data?._meta?.block.number ?? syncedBlock;
    // wait 1 second before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // after 20 iterations, fail the test, and alert that subgraph may have failed
    if (iterations++ > 20) {
      throw new Error(
        "Subgraph did not sync in time - CHECK GRAPH NODE LOGS FOR CRASHED SUBGRAPH!"
      );
    }
  }
};
