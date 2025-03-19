import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  getAccounts,
  waitUntilSubgraphIsSynced,
  getProjectDetails,
  getProjectPMPConfigDetails,
} from "../utils/helpers";

import { PMPV0__factory } from "../../contracts/factories/PMPV0__factory";
import { ethers } from "ethers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
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

// get PMP contract from the subgraph config
if (!config.iPMPV0Contracts) {
  throw new Error("No PMPContracts in config");
}
const pmpV0Address = config.iPMPV0Contracts[0].address;
const pmpV0Contract = new PMPV0__factory(deployer).attach(pmpV0Address);

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
      const projectPmpConfigRes = await getProjectPMPConfigDetails(
        client,
        targetId
      );
      const fullPmpConfigKey = `${pmpV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${projectId}-${paramKey}`;
      // validate project field
      expect(projectRes?.pmpProjectConfig?.id).toBe(targetId);

      // validate PMP config fields
      const projectPmpConfigs = projectPmpConfigRes?.pmpConfigs;
      expect(projectPmpConfigs?.length).toBe(1);
      expect(projectPmpConfigRes?.id).toBe(targetId);
      expect(projectPmpConfigRes?.project?.id).toBe(fullProjectId);
      expect(projectPmpConfigRes?.pmpConfigCount).toBe("1");
      expect(projectPmpConfigRes?.pmpConfigKeys?.length).toBe(1);
      expect(projectPmpConfigRes?.pmpConfigKeys?.[0]).toBe(fullPmpConfigKey);
      expect(projectPmpConfigRes?.updatedAt).toBe(
        projectConfiguredTimestamp.toString()
      );

      const projectPmpConfig = projectPmpConfigs?.[0];
      expect(projectPmpConfig?.key).toBe(paramKey);
      expect(projectPmpConfig?.authOption).toBe("ArtistAndTokenOwner");
      expect(projectPmpConfig?.paramType).toBe("HexColor");
      expect(projectPmpConfig?.pmpLockedAfterTimestamp).toBe("0");
      expect(projectPmpConfig?.authAddress).toBe(
        ethers.constants.AddressZero.toLowerCase()
      );
      expect(projectPmpConfig?.minRange).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPmpConfig?.maxRange).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  });
  test("overwrites existing PMP config when project is reconfigured", async () => {
    const projectId = 0;
    // first configuration
    const firstParamKey = "background";
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
      ]);
    await tx.wait();
    await waitUntilSubgraphIsSynced(client);

    // re-configure with different parameter
    const secondParamKey = "size";
    tx = await pmpV0Contract
      .connect(artist)
      .configureProject(genArt721CoreAddress, projectId, [
        {
          key: secondParamKey,
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
      ]);
    const receipt = await tx.wait();
    const projectConfiguredTimestamp = (
      await artist.provider.getBlock(receipt.blockNumber)
    )?.timestamp;

    await waitUntilSubgraphIsSynced(client);
    const targetId = `${pmpV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${projectId}`;
    const projectPmpConfigRes = await getProjectPMPConfigDetails(
      client,
      targetId
    );

    // verify only one config exists and it's the new one
    const projectPmpConfigs = projectPmpConfigRes?.pmpConfigs;
    expect(projectPmpConfigs?.length).toBe(1);
    expect(projectPmpConfigRes?.pmpConfigCount).toBe("1");

    // verify the new config details
    const newConfig = projectPmpConfigs?.[0];
    expect(newConfig?.key).toBe(secondParamKey);
    expect(newConfig?.authOption).toBe("ArtistAndTokenOwner");
    expect(newConfig?.paramType).toBe("Uint256Range");
    expect(newConfig?.minRange).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
    expect(newConfig?.maxRange).toBe(
      "0x000000000000000000000000000000000000000000000000000000000000000a"
    );
    expect(projectPmpConfigRes?.updatedAt).toBe(
      projectConfiguredTimestamp.toString()
    );

    // verify the old config key is no longer in the keys array
    const oldPmpConfigKey = `${pmpV0Address.toLowerCase()}-${genArt721CoreAddress.toLowerCase()}-${projectId}-${firstParamKey}`;
    expect(projectPmpConfigRes?.pmpConfigKeys).not.toContain(oldPmpConfigKey);
  });
});
