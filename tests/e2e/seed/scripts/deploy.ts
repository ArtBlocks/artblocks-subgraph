// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "ethers";
// flagship
import { GenArt721CoreV3__factory } from "../contracts/factories/GenArt721CoreV3__factory";
import { AdminACLV0__factory } from "../contracts/factories/AdminACLV0__factory";
import { BasicRandomizerV2__factory } from "../contracts/factories/BasicRandomizerV2__factory";
// minter suite
import { MinterFilterV1__factory } from "../contracts/factories/MinterFilterV1__factory";
import { MinterSetPriceV2__factory } from "../contracts/factories/MinterSetPriceV2__factory";
import { MinterSetPriceERC20V2__factory } from "../contracts/factories/MinterSetPriceERC20V2__factory";
import { MinterDALinV2__factory } from "../contracts/factories/MinterDALinV2__factory";
import { MinterDAExpV2__factory } from "../contracts/factories/MinterDAExpV2__factory";
import { MinterMerkleV2__factory } from "../contracts/factories/MinterMerkleV2__factory";
import { MinterHolderV1__factory } from "../contracts/factories/MinterHolderV1__factory";

import fs from "fs";
import { JsonRpcProvider } from "@ethersproject/providers";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const tokenName = "Art Blocks V3 Core Dev";
const tokenTicker = "BLOCKS_V3_CORE_DEV";
const superAdminAddress = undefined; // set to undefined to use deployer address
const artblocksPrimarySalesAddress = undefined; // set to undefined to use deployer address
const artblocksSecondarySalesAddress = undefined; // set to undefined to use deployer address
const startingProjectId = 0; // offset from existing core with margin for new projects in the next ~month
// (optional) add initial project
const doAddInitialProject = false;
const initialProjectName = undefined;
const initialProjectArtistAddress = undefined;
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

type SubgraphConfig = {
  network: string;
  [key: string]: { address: string }[] | string;
};

async function main() {
  const subgraphConfig: SubgraphConfig = { network: "mainnet" };

  const accounts = JSON.parse(
    fs.readFileSync("./shared/accounts.json", "utf8")
  );
  const deployer = ethers.Wallet.fromMnemonic(accounts.mnemonic).connect(
    new JsonRpcProvider("http://hardhat:8545")
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy randomizer contract
  // @dev - comment out deployment if using existing randomizer
  const randomizerFactory = new BasicRandomizerV2__factory(deployer);
  const randomizer = await randomizerFactory.deploy();
  await randomizer.deployed();
  const randomizerAddress = randomizer.address;
  console.log(`Randomizer deployed at ${randomizerAddress}`);

  // Deploy AdminACL contract
  const adminACLFactory = new AdminACLV0__factory(deployer);
  const adminACL = await adminACLFactory.deploy();
  await adminACL.deployed();
  const adminACLAddress = adminACL.address;

  subgraphConfig.adminACLV0Contracts = [
    {
      address: adminACLAddress,
    },
  ];

  console.log(`Admin ACL deployed at ${adminACLAddress}`);

  // Deploy Core contract
  const genArt721CoreFactory = new GenArt721CoreV3__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    tokenName,
    tokenTicker,
    randomizerAddress,
    adminACLAddress,
    startingProjectId
  );
  await genArt721Core.deployed();

  const genArtV3SubgraphConfig = {
    address: genArt721Core.address,
  };
  subgraphConfig.iGenArt721CoreContractV3_BaseContracts = [
    genArtV3SubgraphConfig,
  ];
  subgraphConfig.ownableGenArt721CoreV3Contracts = [genArtV3SubgraphConfig];
  subgraphConfig.genArt721CoreV3Contracts = [genArtV3SubgraphConfig];

  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter Filter contract.
  const minterFilterFactory = new MinterFilterV1__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(genArt721Core.address);
  await minterFilter.deployed();

  subgraphConfig.minterFilterV1Contracts = [
    {
      address: minterFilter.address,
    },
  ];

  console.log(`Minter Filter deployed at ${minterFilter.address}`);

  // Deploy Minter Suite contracts.
  // set price V2
  const minterSetPriceFactory = new MinterSetPriceV2__factory(deployer);
  const minterSetPrice = await minterSetPriceFactory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterSetPrice.deployed();

  subgraphConfig.minterSetPriceContracts = [
    {
      address: minterSetPrice.address,
    },
  ];

  console.log(`MinterSetPrice V2 deployed at ${minterSetPrice.address}`);

  // set price ERC20 V2
  const minterSetPriceERC20Factory = new MinterSetPriceERC20V2__factory(
    deployer
  );
  const minterSetPriceERC20 = await minterSetPriceERC20Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterSetPriceERC20.deployed();

  subgraphConfig.minterSetPriceERC20V2Contracts = [
    {
      address: minterSetPriceERC20.address,
    },
  ];

  console.log(
    `MinterSetPrice ERC20 V2 deployed at ${minterSetPriceERC20.address}`
  );

  // DA Lin V2
  const MinterDALin__factory = new MinterDALinV2__factory(deployer);
  const minterDALin = await MinterDALin__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterDALin.deployed();

  subgraphConfig.minterDALinContracts = [
    {
      address: minterDALin.address,
    },
  ];

  console.log(`Minter DA Lin V2 deployed at ${minterDALin.address}`);

  // DA Exp V2
  const MinterDAExp__factory = new MinterDAExpV2__factory(deployer);
  const minterDAExp = await MinterDAExp__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterDAExp.deployed();

  subgraphConfig.minterDAExpContracts = [
    {
      address: minterDAExp.address,
    },
  ];

  console.log(`Minter DA Exp V2 deployed at ${minterDAExp.address}`);

  // Merkle V1
  const MinterMerkle__factory = new MinterMerkleV2__factory(deployer);
  const minterMerkle = await MinterMerkle__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterMerkle.deployed();

  subgraphConfig.minterMerkleContracts = [
    {
      address: minterMerkle.address,
    },
  ];

  console.log(`Minter Merkle V2 deployed at ${minterMerkle.address}`);

  // Holder V1
  const MinterHolder__factory = new MinterHolderV1__factory(deployer);
  const minterHolder = await MinterHolder__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterHolder.deployed();

  subgraphConfig.minterHolderContracts = [
    {
      address: minterHolder.address,
    },
  ];

  console.log(`Minter Holder V1 deployed at ${minterHolder.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Assign randomizer to core and renounce ownership
  await randomizer.assignCoreAndRenounce(genArt721Core.address);

  // Allowlist the Minter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .updateMinterContract(minterFilter.address);
  console.log(`Updated the Minter Filter on the Core contract.`);

  // Update the Art Blocks primary and secondary payment Addresses (if different than default deployer address).
  if (
    artblocksPrimarySalesAddress &&
    artblocksPrimarySalesAddress !== deployer.address
  ) {
    await genArt721Core
      .connect(deployer)
      .updateArtblocksPrimarySalesAddress(artblocksPrimarySalesAddress);
    console.log(
      `Updated the artblocks primary sales payment address to: ${artblocksPrimarySalesAddress}.`
    );
  } else {
    console.log(
      `artblocks primary sales payment address remains as deployer addresses: ${deployer.address}.`
    );
  }
  if (
    artblocksSecondarySalesAddress &&
    artblocksSecondarySalesAddress !== deployer.address
  ) {
    await genArt721Core
      .connect(deployer)
      .updateArtblocksSecondarySalesAddress(artblocksSecondarySalesAddress);
    console.log(
      `Updated the artblocks secondary sales payment address to: ${artblocksSecondarySalesAddress}.`
    );
  } else {
    console.log(
      `artblocks secondary sales payment address remains as deployer addresses: ${deployer.address}.`
    );
  }

  // currently no ability to allowlist more than a single superAdmin on testnet

  // Allowlist new Minters on MinterFilter.
  await minterFilter
    .connect(deployer)
    .addApprovedMinter(minterSetPrice.address);
  console.log(`Allowlisted minter ${minterSetPrice.address} on minter filter.`);
  await minterFilter
    .connect(deployer)
    .addApprovedMinter(minterSetPriceERC20.address);
  console.log(
    `Allowlisted minter ${minterSetPriceERC20.address} on minter filter.`
  );
  await minterFilter.connect(deployer).addApprovedMinter(minterDALin.address);
  console.log(`Allowlisted minter ${minterDALin.address} on minter filter.`);
  await minterFilter.connect(deployer).addApprovedMinter(minterDAExp.address);
  console.log(`Allowlisted minter ${minterDAExp.address} on minter filter.`);
  await minterFilter.connect(deployer).addApprovedMinter(minterMerkle.address);
  console.log(`Allowlisted minter ${minterMerkle.address} on minter filter.`);
  await minterFilter.connect(deployer).addApprovedMinter(minterHolder.address);
  console.log(`Allowlisted minter ${minterHolder.address} on minter filter.`);

  // update super admin address
  if (superAdminAddress) {
    await adminACL
      .connect(deployer)
      .changeSuperAdmin(superAdminAddress, [genArt721Core.address]);
  }

  // write subgraph config
  fs.writeFileSync(
    "/usr/seed/shared/test-config.json",
    JSON.stringify(subgraphConfig)
  );

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
