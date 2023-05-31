// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "ethers";
// flagship
import {
  GenArt721CoreV3__factory,
  GenArt721CoreV3LibraryAddresses,
} from "../contracts/factories/GenArt721CoreV3__factory";
import { AdminACLV0__factory } from "../contracts/factories/AdminACLV0__factory";
import { PseudorandomAtomic__factory } from "../contracts/factories/PseudorandomAtomic__factory";
import { CoreRegistryV1__factory } from "../contracts/factories/CoreRegistryV1__factory";
import { SharedRandomizerV0__factory } from "../contracts/factories/SharedRandomizerV0__factory";
import { BytecodeStorageReader__factory } from "../contracts/factories/BytecodeStorageReader__factory";

// minter suite (shared minter filter, shared minters)
// @dev matchstick tests were used for legacy (non-shared) minter suite tests
import { MinterFilterV2__factory } from "../contracts/factories/MinterFilterV2__factory";
// @dev dummy shared minter used to test shared minter filter, but isn't used in production
import { DummySharedMinter__factory } from "../contracts/factories/DummySharedMinter__factory";

import fs from "fs";
import { JsonRpcProvider } from "@ethersproject/providers";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const tokenName = "Art Blocks V3 Core Dev";
const tokenTicker = "BLOCKS_V3_CORE_DEV";
const superAdminAddress = undefined; // set to undefined to use deployer address
const minterFilterSuperAdminAddress = undefined; // set to undefined to use deployer address
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
  const artist = ethers.Wallet.fromMnemonic(
    accounts.mnemonic,
    "m/44'/60'/1'/0/1" // derivation path index 1
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy randomizer contract
  const pseudorandomAtomicFactory = new PseudorandomAtomic__factory(deployer);
  const pseudorandomAtomic = await pseudorandomAtomicFactory.deploy();
  await pseudorandomAtomic.deployed();
  const pseudorandomAtomicAddress = pseudorandomAtomic.address;
  console.log(`Pseudorandom Atomoic deployed at ${pseudorandomAtomicAddress}`);
  const randomizerFactory = new SharedRandomizerV0__factory(deployer);
  const randomizer = await randomizerFactory.deploy(pseudorandomAtomicAddress);
  await randomizer.deployed();
  const randomizerAddress = randomizer.address;
  console.log(`Shared randomizer deployed at ${randomizerAddress}`);

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

  // Deploy shared BytecodeStorage reader
  const bytecodeStorageReaderFactory = new BytecodeStorageReader__factory(
    deployer
  );
  const bytecodeStorageReader = await bytecodeStorageReaderFactory.deploy();
  await bytecodeStorageReader.deployed();
  const bytecodeStorageReaderAddress: string = bytecodeStorageReader.address;
  console.log(
    `BytecodeStorageReader deployed at ${bytecodeStorageReaderAddress}`
  );

  const linkLibraryAddresses: GenArt721CoreV3LibraryAddresses = {
    "contracts/libs/0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
      bytecodeStorageReaderAddress,
  };

  const genArt721CoreFactory = new GenArt721CoreV3__factory(
    linkLibraryAddresses,
    deployer
  );
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
  subgraphConfig.iERC721GenArt721CoreV3Contracts = [genArtV3SubgraphConfig];

  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Shared Minter Filter contract.
  // first, deploy the minter filter's adminACL and core registry
  const minterFilterAdminACLFactory = new AdminACLV0__factory(deployer);
  const minterFilterAdminACL = await minterFilterAdminACLFactory.deploy();
  await minterFilterAdminACL.deployed();
  const minterFilterAdminACLAddress = minterFilterAdminACL.address;

  const coreRegistryFactory = new CoreRegistryV1__factory(deployer);
  const coreRegistry = await coreRegistryFactory.deploy();
  await coreRegistry.deployed();
  const coreRegistryAddress = coreRegistry.address;

  // @dev this key will be updated in a subsequent PR to be named engineRegistryContracts
  subgraphConfig.engineRegistryV0Contracts = [
    {
      address: coreRegistryAddress,
    },
  ];

  const minterFilterFactory = new MinterFilterV2__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(
    minterFilterAdminACLAddress,
    coreRegistryAddress
  );
  await minterFilter.deployed();
  console.log(`Shared Minter Filter deployed at ${minterFilter.address}`);

  subgraphConfig.sharedMinterFilterContracts = [
    {
      address: minterFilter.address,
    },
  ];

  // Deploy Minter Suite contracts.
  // dummy shared minter
  const dummySharedMinterFactory = new DummySharedMinter__factory(deployer);
  const dummySharedMinter = await dummySharedMinterFactory.deploy(
    minterFilter.address
  );
  await dummySharedMinter.deployed();

  console.log(`Dummy shared minter deployed at ${dummySharedMinter.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Allowlist the Minter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .updateMinterContract(minterFilter.address);
  console.log(
    `Updated the Minter Filter on the Core contract to ${minterFilter.address}.`
  );

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

  // Allowlist new Minters on MinterFilter.
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(dummySharedMinter.address);
  console.log(
    `Allowlisted dummy shared minter ${dummySharedMinter.address} on minter filter.`
  );

  // update super admin addresses
  if (superAdminAddress) {
    await adminACL
      .connect(deployer)
      .changeSuperAdmin(superAdminAddress, [genArt721Core.address]);
  }
  if (minterFilterSuperAdminAddress) {
    await minterFilterAdminACL
      .connect(deployer)
      .changeSuperAdmin(minterFilterSuperAdminAddress, []);
  }

  // write subgraph config
  console.log("subgraphConfig:", JSON.stringify(subgraphConfig, null, 2));
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
