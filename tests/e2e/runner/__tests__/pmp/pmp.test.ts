import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  getAccounts,
  waitUntilSubgraphIsSynced,
  getProjectDetails,
  getProjectPmpConfigDetails,
  getTokenLatestPmpStateDetails,
  getTokenPmpDetails,
} from "../utils/helpers";

import { PMPV0__factory } from "../../contracts/factories/PMPV0__factory";
import { ethers } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
import { MinterSetPriceV5__factory } from "../../contracts/factories/MinterSetPriceV5__factory";
import {
  GenArt721CoreV3__factory,
  GenArt721CoreV3LibraryAddresses,
} from "../../contracts/factories/GenArt721CoreV3__factory";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();
const client = createSubgraphClient();
const { deployer, artist } = getAccounts();

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
const linkLibraryAddresses: GenArt721CoreV3LibraryAddresses = {
  "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
    bytecodeStorageReaderAddress,
};

const genArt721CoreContract = new GenArt721CoreV3__factory(
  linkLibraryAddresses,
  deployer
).attach(genArt721CoreAddress);

// get PMP contract from the subgraph config
if (!config.iPMPV0Contracts) {
  throw new Error("No PMPContracts in config");
}
const pmpV0Address = config.iPMPV0Contracts[0].address;
const pmpV0Contract = new PMPV0__factory(deployer).attach(pmpV0Address);
let initialSizeConfigureTimestamp = 0;

describe("PMP event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("ProjectConfigured", () => {
    test("creates a new PMP project config when artist configures", async () => {
      const projectId = 0;
      const paramKey = "background";
      const tx = await pmpV0Contract
        .connect(artist)
        .configureProject(genArt721CoreAddress, projectId, [
          {
            key: paramKey,
            pmpConfig: {
              authOption: 3, // ArtistAndTokenOwner auth
              paramType: 6, // HexColor type
              pmpLockedAfterTimestamp: 0,
              authAddress: ethers.constants.AddressZero,
              selectOptions: [],
              minRange:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              maxRange:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            },
          },
        ]);
      const receipt = await tx.wait();
      const projectConfiguredTimestamp = (
        await artist.provider.getBlock(receipt.blockNumber)
      )?.timestamp;

      // validate project config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${pmpV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${projectId}`;
      const fullProjectId = genArt721CoreAddress.toLowerCase().concat("-0");
      const projectRes = await getProjectDetails(client, fullProjectId);
      const projectPmpConfigRes = await getProjectPmpConfigDetails(
        client,
        targetId
      );
      // validate project field
      expect(projectRes?.pmpProjectConfig?.id).toBe(targetId);

      // validate PMP config fields
      const projectPmpConfigs = projectPmpConfigRes?.pmpConfigs;
      expect(projectPmpConfigs?.length).toBe(1);
      expect(projectPmpConfigRes?.id).toBe(targetId);
      expect(projectPmpConfigRes?.project?.id).toBe(fullProjectId);
      expect(projectPmpConfigRes?.pmpAddress?.toLowerCase()).toBe(
        pmpV0Address.toLowerCase()
      );
      expect(projectPmpConfigRes?.pmpConfigCount).toBe("1");
      expect(projectPmpConfigRes?.pmpConfigKeys?.length).toBe(1);
      expect(projectPmpConfigRes?.pmpConfigKeys?.[0]).toBe(paramKey);
      expect(projectPmpConfigRes?.updatedAt).toBe(
        projectConfiguredTimestamp.toString()
      );

      const projectPmpConfig = projectPmpConfigs?.[0];
      expect(projectPmpConfig?.pmpProjectConfig?.id).toBe(targetId);
      expect(projectPmpConfig?.key).toBe(paramKey);
      expect(projectPmpConfig?.authOption).toBe("ArtistAndTokenOwner");
      expect(projectPmpConfig?.paramType).toBe("HexColor");
      expect(projectPmpConfig?.pmpLockedAfterTimestamp).toBe("0");
      expect(projectPmpConfig?.authAddress).toBe(
        ethers.constants.AddressZero.toLowerCase()
      );
      expect(projectPmpConfig?.selectOptions).toEqual([]);
      expect(projectPmpConfig?.minRange).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPmpConfig?.maxRange).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPmpConfig?.createdAt).toBe(
        projectConfiguredTimestamp.toString()
      );
    });
  });

  describe("ProjectHooksConfigured", () => {
    test("updates hook addresses on PmpProjectConfig", async () => {
      const projectId = 0;

      // set hooks
      const tx = await pmpV0Contract.connect(artist).configureProjectHooks(
        genArt721CoreAddress,
        projectId,
        ethers.constants.AddressZero, // tokenPMPPostConfigHook, zero address
        ethers.constants.AddressZero // tokenPMPReadAugmentationHook, zero address
      );
      const receipt = await tx.wait();
      const hooksConfiguredTimestamp = (
        await artist.provider.getBlock(receipt.blockNumber)
      )?.timestamp;

      // validate hooks in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = `${pmpV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${projectId}`;
      const projectPmpConfigRes = await getProjectPmpConfigDetails(
        client,
        targetId
      );
      expect(projectPmpConfigRes?.tokenPMPPostConfigHook?.toLowerCase()).toBe(
        ethers.constants.AddressZero.toLowerCase()
      );
      expect(
        projectPmpConfigRes?.tokenPMPReadAugmentationHook?.toLowerCase()
      ).toBe(ethers.constants.AddressZero.toLowerCase());
      // timestamp should update
      expect(projectPmpConfigRes?.updatedAt).toBe(
        hooksConfiguredTimestamp?.toString()
      );
    });
  });
  test("overwrites existing PMP config when project is reconfigured", async () => {
    const projectId = 0;
    // first configuration
    const firstParamKey = "background";
    const secondParamKey = "foreground";
    let tx = await pmpV0Contract
      .connect(artist)
      .configureProject(genArt721CoreAddress, projectId, [
        {
          key: firstParamKey,
          pmpConfig: {
            authOption: 3, // ArtistAndTokenOwner auth
            paramType: 6, // HexColor type
            pmpLockedAfterTimestamp: 0,
            authAddress: ethers.constants.AddressZero,
            selectOptions: [],
            minRange:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            maxRange:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
          },
        },
        {
          key: secondParamKey,
          pmpConfig: {
            authOption: 1, // TokenOwner auth
            paramType: 6, // HexColor type
            pmpLockedAfterTimestamp: 0,
            authAddress: ethers.constants.AddressZero,
            selectOptions: [],
            minRange:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            maxRange:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
          },
        },
      ]);

    const receiptOne = await tx.wait();
    await waitUntilSubgraphIsSynced(client);

    const projectConfiguredTimestamp = (
      await artist.provider.getBlock(receiptOne.blockNumber)
    )?.timestamp;

    // validate first configuration
    const targetId = `${pmpV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${projectId}`;
    const projectPmpConfigRes = await getProjectPmpConfigDetails(
      client,
      targetId
    );
    const fullProjectId = genArt721CoreAddress.toLowerCase().concat("-0");
    const projectRes = await getProjectDetails(client, fullProjectId);

    // verify both param configs exist
    const projectPmpConfigs = projectPmpConfigRes?.pmpConfigs;
    expect(projectPmpConfigs?.length).toBe(2);
    expect(projectPmpConfigRes?.pmpConfigCount).toBe("2");

    // verify the new config details
    const firstConfig = projectPmpConfigs?.[0];
    expect(firstConfig?.pmpProjectConfig?.id).toBe(targetId);
    expect(firstConfig?.key).toBe(firstParamKey);
    expect(firstConfig?.authOption).toBe("ArtistAndTokenOwner");
    expect(firstConfig?.paramType).toBe("HexColor");
    expect(firstConfig?.selectOptions).toEqual([]);

    expect(firstConfig?.minRange).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(firstConfig?.maxRange).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(firstConfig?.createdAt).toBe(projectConfiguredTimestamp.toString());
    expect(projectPmpConfigRes?.updatedAt).toBe(
      projectConfiguredTimestamp.toString()
    );

    const secondConfig = projectPmpConfigs?.[1];
    expect(secondConfig?.pmpProjectConfig?.id).toBe(targetId);
    expect(secondConfig?.key).toBe(secondParamKey);
    expect(secondConfig?.authOption).toBe("TokenOwner");
    expect(secondConfig?.paramType).toBe("HexColor");
    expect(secondConfig?.selectOptions).toEqual([]);
    expect(secondConfig?.minRange).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(secondConfig?.maxRange).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(secondConfig?.createdAt).toBe(projectConfiguredTimestamp.toString());

    expect(projectPmpConfigRes?.pmpConfigKeys).toContain(firstParamKey);
    expect(projectPmpConfigRes?.pmpConfigKeys).toContain(secondParamKey);
    expect(projectPmpConfigRes?.pmpAddress?.toLowerCase()).toBe(
      pmpV0Address.toLowerCase()
    );
    // validate project field
    expect(projectRes?.pmpProjectConfig?.id).toBe(targetId);

    // re-configure with different parameters
    const newParamKey = "size";
    const newParamKeyTwo = "exampleString";
    tx = await pmpV0Contract
      .connect(artist)
      .configureProject(genArt721CoreAddress, projectId, [
        {
          key: newParamKey,
          pmpConfig: {
            authOption: 3, // ArtistAndTokenOwner auth
            paramType: 3, // Uint256Range type
            pmpLockedAfterTimestamp: 0,
            authAddress: ethers.constants.AddressZero,
            selectOptions: [],
            minRange:
              "0x0000000000000000000000000000000000000000000000000000000000000001", // 1
            maxRange:
              "0x000000000000000000000000000000000000000000000000000000000000000a", // 10
          },
        },
        {
          key: newParamKeyTwo,
          pmpConfig: {
            authOption: 3, // ArtistAndTokenOwner auth
            paramType: 8, // String type
            pmpLockedAfterTimestamp: 0,
            authAddress: ethers.constants.AddressZero,
            selectOptions: [],
            minRange:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            maxRange:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
          },
        },
      ]);
    const receiptTwo = await tx.wait();
    const projectConfiguredNextTimestamp = (
      await artist.provider.getBlock(receiptTwo.blockNumber)
    )?.timestamp;

    await waitUntilSubgraphIsSynced(client);

    const projectPmpConfigNextRes = await getProjectPmpConfigDetails(
      client,
      targetId
    );
    const projectNextRes = await getProjectDetails(client, fullProjectId);

    // verify only one config exists and it's the new one
    const projectPmpConfigsNext = projectPmpConfigNextRes?.pmpConfigs;
    expect(projectPmpConfigsNext?.length).toBe(2);
    expect(projectPmpConfigNextRes?.pmpConfigCount).toBe("2");

    // verify the new config details
    const nextConfig = projectPmpConfigsNext?.[0];
    expect(nextConfig?.pmpProjectConfig?.id).toBe(targetId);
    expect(nextConfig?.key).toBe(newParamKeyTwo);
    expect(nextConfig?.authOption).toBe("ArtistAndTokenOwner");
    expect(nextConfig?.paramType).toBe("String");
    expect(nextConfig?.selectOptions).toEqual([]);
    expect(nextConfig?.minRange).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(nextConfig?.maxRange).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(nextConfig?.createdAt).toBe(
      projectConfiguredNextTimestamp.toString()
    );
    expect(projectPmpConfigNextRes?.updatedAt).toBe(
      projectConfiguredNextTimestamp.toString()
    );

    const nextConfig2 = projectPmpConfigsNext?.[1];
    expect(nextConfig2?.pmpProjectConfig?.id).toBe(targetId);
    expect(nextConfig2?.key).toBe(newParamKey);
    expect(nextConfig2?.authOption).toBe("ArtistAndTokenOwner");
    expect(nextConfig2?.paramType).toBe("Uint256Range");
    expect(nextConfig2?.selectOptions).toEqual([]);
    expect(nextConfig2?.minRange).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
    expect(nextConfig2?.maxRange).toBe(
      "0x000000000000000000000000000000000000000000000000000000000000000a"
    );
    expect(nextConfig2?.createdAt).toBe(
      projectConfiguredNextTimestamp.toString()
    );
    expect(projectPmpConfigNextRes?.updatedAt).toBe(
      projectConfiguredNextTimestamp.toString()
    );

    // verify the old config key is no longer in the keys array
    expect(projectPmpConfigNextRes?.pmpConfigKeys).toContain(newParamKey);
    expect(projectPmpConfigNextRes?.pmpConfigKeys).not.toContain(firstParamKey);
    expect(projectPmpConfigNextRes?.pmpAddress?.toLowerCase()).toBe(
      pmpV0Address.toLowerCase()
    );
    // validate project field
    expect(projectNextRes?.pmpProjectConfig?.id).toBe(targetId);
  });

  describe("TokenParamsConfigured", () => {
    test("creates a new PMP config for a non-existent token (before it is minted) when configured", async () => {
      const projectStateData = await genArt721CoreContract.projectStateData(0);
      const nextTokenId = projectStateData.invocations.toNumber();

      const paramKey = "size";
      const tx = await pmpV0Contract
        .connect(artist)
        .configureTokenParams(genArt721CoreAddress, nextTokenId, [
          {
            key: paramKey,
            configuredParamType: 3,
            configuredValue:
              "0x0000000000000000000000000000000000000000000000000000000000000003",
            configuringArtistString: false,
            configuredValueString: "",
          },
        ]);

      const receipt = await tx.wait();
      const tokenConfiguredTimestamp = (
        await artist.provider.getBlock(receipt.blockNumber)
      )?.timestamp;
      initialSizeConfigureTimestamp = tokenConfiguredTimestamp;
      // validate pmp config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const fullTokenId = genArt721CoreAddress
        .toLowerCase()
        .concat(`-${nextTokenId}`);

      const targetPMPId = `${pmpV0Address.toLowerCase()}-${fullTokenId}-${paramKey}-0`;
      const tokenPmpRes = await getTokenPmpDetails(client, targetPMPId);

      const tokenLatestPmpStateId = `${pmpV0Address.toLowerCase()}-${fullTokenId}-${paramKey}`;
      const tokenPmpLatestStateRes = await getTokenLatestPmpStateDetails(
        client,
        tokenLatestPmpStateId
      );

      // validate latest PMP state fields
      expect(tokenPmpLatestStateRes?.latestTokenPMPNonce).toBe("0");

      // validate PMP fields
      expect(tokenPmpRes?.key).toBe(paramKey);
      expect(tokenPmpRes?.token?.id).toBeUndefined(); // token does not exist yet
      expect(tokenPmpRes?.tokenIdString).toBe(fullTokenId);
      expect(tokenPmpRes?.tokenPMPNonce).toBe("0");
      expect(tokenPmpRes?.configuredParamType).toBe("Uint256Range");
      expect(tokenPmpRes?.configuredValue).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000003"
      );
      expect(tokenPmpRes?.artistConfiguredValueString).toBeNull();
      expect(tokenPmpRes?.nonArtistConfiguredValueString).toBeNull();
      expect(tokenPmpRes?.configuringAddress.toLowerCase()).toBe(
        artist.address.toLowerCase()
      );
      expect(tokenPmpRes?.createdAt).toBe(tokenConfiguredTimestamp.toString());
    });
    test("creates a new PMP config for a token when configured", async () => {
      // mint token
      const projectStateData = await genArt721CoreContract.projectStateData(0);
      const nextTokenId = projectStateData.invocations.toNumber();

      const sharedMinterFilter = config.sharedMinterFilterContracts?.[0];
      if (!sharedMinterFilter) {
        throw new Error("No shared minter filter found in config metadata");
      }

      const sharedMinterFilterContract = new MinterFilterV2__factory(
        deployer
      ).attach(sharedMinterFilter.address);
      if (!config.genericMinterEventsLibContracts) {
        throw new Error("No genericMinterEventsLibContracts in config");
      }
      const minterSetPriceV5Address =
        config.genericMinterEventsLibContracts[0].address;
      const minterSetPriceV5Contract = new MinterSetPriceV5__factory(
        deployer
      ).attach(minterSetPriceV5Address);

      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(0, genArt721CoreAddress, minterSetPriceV5Address);

      const newPrice = ethers.utils.parseEther("0.1");
      await minterSetPriceV5Contract
        .connect(artist)
        .updatePricePerTokenInWei(0, genArt721CoreAddress, newPrice);

      await minterSetPriceV5Contract
        .connect(artist)
        .purchase(0, genArt721CoreAddress, {
          value: ethers.utils.parseEther("0.1"),
        });

      await waitUntilSubgraphIsSynced(client);

      const stringParamKey = "exampleString";
      const tx = await pmpV0Contract
        .connect(artist)
        .configureTokenParams(genArt721CoreAddress, nextTokenId, [
          {
            key: stringParamKey,
            configuredParamType: 8,
            configuredValue:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            configuringArtistString: true,
            configuredValueString: "example",
          },
        ]);

      const receipt = await tx.wait();
      const tokenConfiguredTimestamp = (
        await artist.provider.getBlock(receipt.blockNumber)
      )?.timestamp;

      // validate pmp config in subgraph
      await waitUntilSubgraphIsSynced(client);
      const fullTokenId = genArt721CoreAddress
        .toLowerCase()
        .concat(`-${nextTokenId}`);

      const tokenLatestPmpStateId = `${pmpV0Address.toLowerCase()}-${fullTokenId}-${stringParamKey}`;
      const tokenPmpLatestStateRes = await getTokenLatestPmpStateDetails(
        client,
        tokenLatestPmpStateId
      );

      const latestPMPStateNonce = tokenPmpLatestStateRes?.latestTokenPMPNonce;
      const targetPMPId = `${pmpV0Address.toLowerCase()}-${fullTokenId}-${stringParamKey}-${latestPMPStateNonce}`;
      const tokenPmpRes = await getTokenPmpDetails(client, targetPMPId);

      expect(tokenPmpLatestStateRes?.latestTokenPMPNonce).toBe("0");

      // validate PMP fields
      expect(tokenPmpRes?.key).toBe(stringParamKey);
      expect(tokenPmpRes?.token?.id).toBe(fullTokenId);
      expect(tokenPmpRes?.tokenIdString).toBe(fullTokenId);
      expect(tokenPmpRes?.tokenPMPNonce).toBe("0");
      expect(tokenPmpRes?.configuredParamType).toBe("String");
      expect(tokenPmpRes?.configuredValue).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(tokenPmpRes?.artistConfiguredValueString).toBe("example");
      expect(tokenPmpRes?.nonArtistConfiguredValueString).toBeNull();
      expect(tokenPmpRes?.createdAt).toBe(tokenConfiguredTimestamp.toString());

      // update size param and validate that the new PMP exists and the previous PMP persists
      const sizeParamKey = "size";
      const tx2 = await pmpV0Contract
        .connect(artist)
        .configureTokenParams(genArt721CoreAddress, nextTokenId, [
          {
            key: sizeParamKey,
            configuredParamType: 3,
            configuredValue:
              "0x0000000000000000000000000000000000000000000000000000000000000006",
            configuringArtistString: false,
            configuredValueString: "",
          },
        ]);

      const receipt2 = await tx2.wait();
      const tokenConfiguredNextTimestamp = (
        await artist.provider.getBlock(receipt2.blockNumber)
      )?.timestamp;

      // validate pmp config in subgraph
      await waitUntilSubgraphIsSynced(client);

      const sizeParamLatestPMPStateId = `${pmpV0Address.toLowerCase()}-${fullTokenId}-${sizeParamKey}`;
      const tokenPmpLatestStateResNew = await getTokenLatestPmpStateDetails(
        client,
        sizeParamLatestPMPStateId
      );
      const latestPMPStateNonceNew =
        tokenPmpLatestStateResNew?.latestTokenPMPNonce;
      const targetPMPId2 = `${pmpV0Address.toLowerCase()}-${fullTokenId}-${sizeParamKey}-${latestPMPStateNonceNew}`;
      const targetSizePMPId1 = `${pmpV0Address.toLowerCase()}-${fullTokenId}-${sizeParamKey}-0`;
      const tokenPmpRes2 = await getTokenPmpDetails(client, targetPMPId2);
      const tokenPrevPmpRes = await getTokenPmpDetails(
        client,
        targetSizePMPId1
      );
      // validate latest PMP state fields
      expect(tokenPmpLatestStateResNew?.latestTokenPMPNonce).toBe("1");

      // validate new PMP fields
      expect(tokenPmpRes2?.key).toBe(sizeParamKey);
      expect(tokenPmpRes2?.token?.id).toBe(fullTokenId);
      expect(tokenPmpRes2?.tokenIdString).toBe(fullTokenId);
      expect(tokenPmpRes2?.tokenPMPNonce).toBe("1");
      expect(tokenPmpRes2?.configuredParamType).toBe("Uint256Range");
      expect(tokenPmpRes2?.configuredValue).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000006"
      );
      expect(tokenPmpRes2?.artistConfiguredValueString).toBeNull();
      expect(tokenPmpRes2?.nonArtistConfiguredValueString).toBeNull();
      expect(tokenPmpRes2?.createdAt).toBe(
        tokenConfiguredNextTimestamp.toString()
      );

      // validate previous PMP fields
      expect(tokenPrevPmpRes?.key).toBe(sizeParamKey);
      expect(tokenPrevPmpRes?.token?.id).toBe(fullTokenId);
      expect(tokenPrevPmpRes?.tokenIdString).toBe(fullTokenId);
      expect(tokenPrevPmpRes?.tokenPMPNonce).toBe("0");
      expect(tokenPrevPmpRes?.configuredParamType).toBe("Uint256Range");
      expect(tokenPrevPmpRes?.configuredValue).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000003"
      );
      expect(tokenPrevPmpRes?.artistConfiguredValueString).toBeNull();
      expect(tokenPrevPmpRes?.nonArtistConfiguredValueString).toBeNull();
      expect(tokenPrevPmpRes?.createdAt).toBe(
        initialSizeConfigureTimestamp.toString()
      );
    });
  });
});
