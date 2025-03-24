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
import { MinterSetPriceERC20V5__factory } from "../contracts/factories/MinterSetPriceERC20V5__factory";
import { MinterSetPriceMerkleV5__factory } from "../contracts/factories/MinterSetPriceMerkleV5__factory";
import { MinterSetPriceHolderV5__factory } from "../contracts/factories/MinterSetPriceHolderV5__factory";
import { MinterSEAV1__factory } from "../contracts/factories/MinterSEAV1__factory";
import { MinterRAMV0__factory } from "../contracts/factories/MinterRAMV0__factory";
import { MinterDAExpV5__factory } from "../contracts/factories/MinterDAExpV5__factory";
import { MinterDALinV5__factory } from "../contracts/factories/MinterDALinV5__factory";
import { MinterDAExpSettlementV3__factory } from "../contracts/factories/MinterDAExpSettlementV3__factory";
import { MinterMinPriceV0__factory } from "../contracts/factories/MinterMinPriceV0__factory";
// splitter contracts
import { SplitAtomicV0__factory } from "../contracts/factories/SplitAtomicV0__factory";
import { SplitAtomicFactoryV0__factory } from "../contracts/factories/SplitAtomicFactoryV0__factory";

// PMP
import { PMPV0__factory } from "../contracts/factories/PMPV0__factory";

import fs from "fs";
import { JsonRpcProvider } from "@ethersproject/providers";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

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
    "m/44'/60'/1'/0/0" // bip-44 derivation path Ethereum account 1
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
    "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
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
  subgraphConfig.genericMinterEventsLibContracts = [
    {
      address: minterSetPriceV5.address,
    },
  ];
  subgraphConfig.setPriceLibContracts = [
    {
      address: minterSetPriceV5.address,
    },
  ];
  subgraphConfig.maxInvocationsLibContracts = [
    {
      address: minterSetPriceV5.address,
    },
  ];

  // @dev also deploy ERC20 set price minter
  const minterSetPriceERC20V5Factory = new MinterSetPriceERC20V5__factory(
    deployer
  );
  const minterSetPriceERC20V5 = await minterSetPriceERC20V5Factory.deploy(
    minterFilter.address
  );
  await minterSetPriceERC20V5.deployed();
  console.log(
    `MinterSetPriceERC20V5 deployed at ${minterSetPriceERC20V5.address}`
  );
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterSetPriceERC20V5.address,
  });
  subgraphConfig.splitFundsLibContracts = [
    {
      address: minterSetPriceERC20V5.address,
    },
  ];
  subgraphConfig.setPriceLibContracts.push({
    address: minterSetPriceERC20V5.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterSetPriceERC20V5.address,
  });

  // Merkle Minters
  const minterMerkleV5Factory = new MinterSetPriceMerkleV5__factory(deployer);
  const minterSetPriceMerkleV5 = await minterMerkleV5Factory.deploy(
    minterFilter.address,
    delegationRegistryAddress
  );
  await minterSetPriceMerkleV5.deployed();
  console.log(
    `MinterSetPriceMerkleV5 deployed at ${minterSetPriceMerkleV5.address}`
  );
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterSetPriceMerkleV5.address,
  });
  subgraphConfig.setPriceLibContracts.push({
    address: minterSetPriceMerkleV5.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterSetPriceMerkleV5.address,
  });
  subgraphConfig.merkleLibContracts = [
    {
      address: minterSetPriceMerkleV5.address,
    },
  ];

  // Holder Minters
  const minterHolderV5Factory = new MinterSetPriceHolderV5__factory(deployer);
  const minterSetPriceHolderV5 = await minterHolderV5Factory.deploy(
    minterFilter.address,
    delegationRegistryAddress
  );
  await minterSetPriceHolderV5.deployed();
  console.log(
    `minterSetPriceHolderV5 deployed at ${minterSetPriceHolderV5.address}`
  );
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterSetPriceHolderV5.address,
  });
  subgraphConfig.setPriceLibContracts.push({
    address: minterSetPriceHolderV5.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterSetPriceHolderV5.address,
  });
  subgraphConfig.holderLibContracts = [
    {
      address: minterSetPriceHolderV5.address,
    },
  ];

  // SEA Minters
  const MinterSEAV1Factory = new MinterSEAV1__factory(deployer);
  const minterSEAV1 = await MinterSEAV1Factory.deploy(minterFilter.address);
  await minterSEAV1.deployed();
  console.log(`minterSEAV1 deployed at ${minterSEAV1.address}`);
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterSEAV1.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterSEAV1.address,
  });
  subgraphConfig.SEALibContracts = [
    {
      address: minterSEAV1.address,
    },
  ];

  // RAM Minters
  const MinterRAMV0Factory = new MinterRAMV0__factory(deployer);
  const minterRAMV0 = await MinterRAMV0Factory.deploy(minterFilter.address);
  await minterRAMV0.deployed();
  console.log(`minterRAMV0 deployed at ${minterRAMV0.address}`);
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterRAMV0.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterRAMV0.address,
  });
  subgraphConfig.RAMLibContracts = [
    {
      address: minterRAMV0.address,
    },
  ];

  // DA Exp Minters
  const MinterDAExpV5Factory = new MinterDAExpV5__factory(deployer);
  const minterDAExpV5 = await MinterDAExpV5Factory.deploy(minterFilter.address);
  await minterDAExpV5.deployed();
  console.log(`minterDAExpV5 deployed at ${minterDAExpV5.address}`);
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterDAExpV5.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterDAExpV5.address,
  });
  subgraphConfig.DALibContracts = [
    {
      address: minterDAExpV5.address,
    },
  ];
  subgraphConfig.DAExpLibContracts = [
    {
      address: minterDAExpV5.address,
    },
  ];

  // DA Lin Minters
  const MinterDALinV5Factory = new MinterDALinV5__factory(deployer);
  const minterDALinV5 = await MinterDALinV5Factory.deploy(minterFilter.address);
  await minterDALinV5.deployed();
  console.log(`minterDALinV5 deployed at ${minterDALinV5.address}`);
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterDALinV5.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterDALinV5.address,
  });
  subgraphConfig.DALibContracts.push({
    address: minterDALinV5.address,
  });
  subgraphConfig.DALinLibContracts = [
    {
      address: minterDALinV5.address,
    },
  ];

  // DA Exp Settlement Minters
  const MinterDAExpSettlementV3Factory = new MinterDAExpSettlementV3__factory(
    deployer
  );
  const minterDAExpSettlementV3 = await MinterDAExpSettlementV3Factory.deploy(
    minterFilter.address
  );
  await minterDAExpSettlementV3.deployed();
  console.log(
    `minterDAExpSettlementV3 deployed at ${minterDAExpSettlementV3.address}`
  );
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterDAExpSettlementV3.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterDAExpSettlementV3.address,
  });
  subgraphConfig.DALibContracts.push({
    address: minterDAExpSettlementV3.address,
  });
  subgraphConfig.DAExpLibContracts.push({
    address: minterDAExpSettlementV3.address,
  });
  subgraphConfig.settlementExpLibContracts = [
    {
      address: minterDAExpSettlementV3.address,
    },
  ];

  // Min Price Minters
  const MIN_MINT_FEE = ethers.utils.parseEther("0.1");
  const MinterMinPriceV0Factory = new MinterMinPriceV0__factory(deployer);
  const minterMinPriceV0 = await MinterMinPriceV0Factory.deploy(
    minterFilter.address,
    MIN_MINT_FEE
  );
  await minterMinPriceV0.deployed();
  console.log(`minterMinPriceV0 deployed at ${minterMinPriceV0.address}`);
  subgraphConfig.genericMinterEventsLibContracts.push({
    address: minterMinPriceV0.address,
  });
  subgraphConfig.maxInvocationsLibContracts.push({
    address: minterMinPriceV0.address,
  });
  subgraphConfig.setPriceLibContracts.push({
    address: minterMinPriceV0.address,
  });
  subgraphConfig.minPriceLibContracts = [
    {
      address: minterMinPriceV0.address,
    },
  ];

  // deploy PMP
  const pmpV0Factory = new PMPV0__factory(deployer);
  const pmpV0 = await pmpV0Factory.deploy(delegationRegistryAddress);
  await pmpV0.deployed();
  console.log(`PMPV0 deployed at ${pmpV0.address}`);
  // update subgraph config to index PMPV0
  subgraphConfig.iPMPV0Contracts = [
    {
      address: pmpV0.address,
    },
  ];
  // update subgraph config metadata to include PMPV0 address
  subgraphConfig.metadata.pmpV0Address = pmpV0.address;

  // deploy splitAtomic system of contracts
  // deploy implementation
  const splitAtomicV0Factory = new SplitAtomicV0__factory(deployer);
  const splitAtomicV0 = await splitAtomicV0Factory.deploy();
  await splitAtomicV0.deployed();
  console.log(
    `splitAtomicV0 implementation deployed at ${splitAtomicV0.address}`
  );
  // deploy proxy factory
  const splitAtomicFactoryV0Factory = new SplitAtomicFactoryV0__factory(
    deployer
  );
  const splitAtomicFactoryV0 = await splitAtomicFactoryV0Factory.deploy(
    splitAtomicV0.address,
    deployer.address, // easy address to test with
    2222 // 22.22%
  );
  await splitAtomicFactoryV0.deployed();
  console.log(
    `splitAtomicFactoryV0 deployed at ${splitAtomicFactoryV0.address}`
  );
  // update subgraph config to index splitAtomicFactoryV0
  subgraphConfig.iSplitAtomicFactoryV0Contracts = [
    {
      address: splitAtomicFactoryV0.address,
    },
  ];
  // update subgraph config metadata to include splitAtomic implementation address
  subgraphConfig.metadata.splitAtomicImplementationAddress =
    splitAtomicV0.address;

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
    .approveMinterGlobally(minterSetPriceERC20V5.address);
  console.log(
    `Allowlisted minterSetPriceERC20V5 ${minterSetPriceERC20V5.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterSetPriceMerkleV5.address);
  console.log(
    `Allowlisted minterSetPriceMerkleV5 ${minterSetPriceMerkleV5.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterSetPriceHolderV5.address);
  console.log(
    `Allowlisted minterSetPriceHolderV5 ${minterSetPriceHolderV5.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterSEAV1.address);
  console.log(
    `Allowlisted minterSEAV1 ${minterSEAV1.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterRAMV0.address);
  console.log(
    `Allowlisted minterRAMV0 ${minterRAMV0.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterDAExpV5.address);
  console.log(
    `Allowlisted minterDAExpV5 ${minterDAExpV5.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterDALinV5.address);
  console.log(
    `Allowlisted minterDALinV5 ${minterDALinV5.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterDAExpSettlementV3.address);
  console.log(
    `Allowlisted minterDAExpSettlementV3 ${minterDAExpSettlementV3.address} on minter filter.`
  );
  await minterFilter
    .connect(deployer)
    .approveMinterGlobally(minterMinPriceV0.address);
  console.log(
    `Allowlisted minterMinPriceV0 ${minterMinPriceV0.address} on minter filter.`
  );

  // add initial project to the core contract
  await genArt721Core
    .connect(deployer)
    .addProject("projectZero", artist.address);

  // add projects 1 and 2 to the core contract
  for (let i = 1; i < 3; i++) {
    await genArt721Core
      .connect(deployer)
      .addProject("projectZero", artist.address);
  }

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
