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

// integration references
import { DelegationRegistry__factory } from "../contracts/factories/DelegationRegistry__factory";

// minter suite (shared minter filter, shared minters)
// @dev matchstick tests were used for legacy (non-shared) minter suite tests
import { MinterFilterV2__factory } from "../contracts/factories/MinterFilterV2__factory";
// @dev dummy shared minter used to test shared minter filter, but isn't used in production
import { DummySharedMinter__factory } from "../contracts/factories/DummySharedMinter__factory";
import { MinterSetPriceV5__factory } from "../contracts/factories/MinterSetPriceV5__factory";
import { MinterSetPriceMerkleV5__factory } from "../contracts/factories/MinterSetPriceMerkleV5__factory";

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
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

type ConfigMetadata = {
  [key: string]: { address: string }[] | string;
};

type SubgraphConfig = {
  [key: string]: { address: string }[] | string | ConfigMetadata | undefined;
  network: string;
  metadata?: ConfigMetadata;
};

async function main() {
  const subgraphConfig: SubgraphConfig = { network: "mainnet" };
  subgraphConfig.metadata = {};

  /////////////////////////////////////////////////////////////////////////////
  // SETUP ACCOUNTS BEGINS HERE
  /////////////////////////////////////////////////////////////////////////////
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
  // fund artist wallet
  await deployer.sendTransaction({
    to: artist.address,
    value: ethers.utils.parseEther("50"),
  });
  /////////////////////////////////////////////////////////////////////////////
  // SETUP ACCOUNTS ENDS HERE
  /////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // Deploy delegation registry
  const delegationRegistryFactory = new DelegationRegistry__factory(deployer);
  const delegationRegistry = await delegationRegistryFactory.deploy();
  await delegationRegistry.deployed();
  const delegationRegistryAddress = delegationRegistry.address;
  console.log(`Delegation registry deployed at ${delegationRegistryAddress}`);
  subgraphConfig.metadata.delegationRegistryAddress = delegationRegistryAddress;

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
  subgraphConfig.metadata.bytecodeStorageReaderAddress =
    bytecodeStorageReaderAddress;

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
  // record in metadata for future reference in tests
  subgraphConfig.metadata.minterFilterAdminACLAddress =
    minterFilterAdminACLAddress.toString();

  const coreRegistryFactory = new CoreRegistryV1__factory(deployer);
  const coreRegistry = await coreRegistryFactory.deploy();
  await coreRegistry.deployed();
  const coreRegistryAddress = coreRegistry.address;
  // record in metadata for future reference in tests
  subgraphConfig.metadata.coreRegistryAddress = coreRegistryAddress.toString();

  // @dev this key will be updated in a subsequent PR to be named engineRegistryContracts
  subgraphConfig.ICoreRegistryContracts = [
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

  // Fixed Price Minters
  const minterSetPriceV5Factory = new MinterSetPriceV5__factory(deployer);
  const minterSetPriceV5 = await minterSetPriceV5Factory.deploy(
    minterFilter.address
  );
  await minterSetPriceV5.deployed();
  console.log(`MinterSetPriceV5 deployed at ${minterSetPriceV5.address}`);
  subgraphConfig.iSharedMinterV0Contracts = [
    {
      address: minterSetPriceV5.address,
    },
  ];

  // Merkle Minters
  const minterMerkleV1Factory = new MinterSetPriceMerkleV5__factory(deployer);
  const minterSetPriceMerkleV5 = await minterMerkleV1Factory.deploy(
    minterFilter.address,
    delegationRegistryAddress
  );
  await minterSetPriceMerkleV5.deployed();
  console.log(
    `MinterSetPriceMerkleV5 deployed at ${minterSetPriceMerkleV5.address}`
  );
  subgraphConfig.iSharedMinterV0Contracts.push({
    address: minterSetPriceMerkleV5.address,
  });
  subgraphConfig.iSharedMerkleContracts = [
    {
      address: minterSetPriceMerkleV5.address,
    },
  ];

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // register the core contract with the core registry
  await coreRegistry
    .connect(deployer)
    .registerContract(
      genArt721Core.address,
      ethers.utils.formatBytes32String("GenArt721CoreV3"),
      ethers.utils.formatBytes32String("1.0.0")
    );
  console.log(
    `Registered the Core contract with the Core Registry at ${coreRegistryAddress}.`
  );

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
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterSetPriceV5.address);
  console.log(
    `Allowlisted minterSetPriceV5 ${minterSetPriceV5.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterSetPriceMerkleV5.address);
  console.log(
    `Allowlisted minterSetPriceMerkleV5 ${minterSetPriceMerkleV5.address} on minter filter.`
  );

  // add initial project to the core contract
  await genArt721Core
    .connect(deployer)
    .addProject("projectZero", artist.address);

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
