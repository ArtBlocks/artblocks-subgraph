import fs from "fs";
import {
  GetContractsQueryVariables,
  GetCurrentBlockNumberDocument,
  GetCurrentBlockNumberQuery,
  GetTargetMinterFiltersDocument,
  GetTargetMinterFiltersQuery,
  GetTargetMinterFiltersQueryVariables,
  GetTargetCoreRegistriesDocument,
  GetTargetCoreRegistriesQuery,
  GetTargetCoreRegistriesQueryVariables,
  GetTargetMintersDocument,
  GetTargetMintersQuery,
  GetTargetMintersQueryVariables,
  GetTargetProjectsDocument,
  GetTargetProjectsQuery,
  GetTargetProjectsQueryVariables,
  MinterFilterDetailsFragment,
  MinterDetailsFragment,
  ProjectDetailsFragment,
  CoreRegistryDetailsFragment,
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
    "m/44'/60'/1'/0/0" // bip-44 derivation path Ethereum account 1
  ).connect(new JsonRpcProvider("http://hardhat:8545"));
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

/**
 * Gets a MinterFilter detail fragment from the subgraph, at specified id.
 * Reverts if no entity is found.
 * @param client the subgraph client
 * @param minterFilterId the id of the minterFilter entity
 */
export const getMinterFilterDetails = async (
  client: Client,
  minterFilterId: string
): Promise<MinterFilterDetailsFragment> => {
  const minterFilterRes = (
    await client
      .query<GetTargetMinterFiltersQuery, GetTargetMinterFiltersQueryVariables>(
        GetTargetMinterFiltersDocument,
        {
          targetId: minterFilterId,
        }
      )
      .toPromise()
  ).data?.minterFilters[0];
  if (!minterFilterRes) throw new Error("No MinterFilter entity found");
  return minterFilterRes;
};

/**
 * Gets a Minter detail fragment from the subgraph, at specified id.
 * Reverts if no entity is found.
 * @param client the subgraph client
 * @param minterId the id of the Minter entity
 */
export const getMinterDetails = async (
  client: Client,
  minterId: string
): Promise<MinterDetailsFragment> => {
  const minterRes = (
    await client
      .query<GetTargetMintersQuery, GetTargetMintersQueryVariables>(
        GetTargetMintersDocument,
        {
          targetId: minterId,
        }
      )
      .toPromise()
  ).data?.minters[0];
  if (!minterRes) throw new Error("No Project entity found");
  return minterRes;
};

/**
 * Gets a Project detail fragment from the subgraph, at specified id.
 * Reverts if no entity is found.
 * @param client the subgraph client
 * @param projectId the id of the Project entity
 */
export const getProjectDetails = async (
  client: Client,
  projectId: string
): Promise<ProjectDetailsFragment> => {
  const projectRes = (
    await client
      .query<GetTargetProjectsQuery, GetTargetProjectsQueryVariables>(
        GetTargetProjectsDocument,
        {
          targetId: projectId,
        }
      )
      .toPromise()
  ).data?.projects[0];
  if (!projectRes) throw new Error("No Project entity found");
  return projectRes;
};

/**
 * Gets a CoreRegistry detail fragment from the subgraph, at specified id.
 * Reverts if no entity is found.
 * @param client the subgraph client
 * @param coreRegistryId the id of the CoreRegistry entity
 */
export const getCoreRegistryDetails = async (
  client: Client,
  coreRegistryId: string
): Promise<CoreRegistryDetailsFragment> => {
  const coreRegistryRes = (
    await client
      .query<
        GetTargetCoreRegistriesQuery,
        GetTargetCoreRegistriesQueryVariables
      >(GetTargetCoreRegistriesDocument, {
        targetId: coreRegistryId,
      })
      .toPromise()
  ).data?.coreRegistries[0];
  if (!coreRegistryRes) throw new Error("No Core Registry entity found");
  return coreRegistryRes;
};
