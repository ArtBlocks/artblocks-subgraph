import { BigInt } from "@graphprotocol/graph-ts";

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export const ARTBLOCKS_PLATFORM_ID = "ArtBlocks";
export const ARTBLOCKS_ORIGINAL_ADDRESS =
  "0x059edd72cd353df5106d2b9cc5ab83a52287ac3a";
export const ARTBLOCKS_ADDRESS = "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270";

// Opensea V1 contract
export const WYVERN_EXCHANGE_ADDRESS =
  "0x7be8076f4ea4a4ad08075c2508e481d6c946d12b";

// Opensea V2 contract
export const WYVERN_EXCHANGE_WITH_BULK_CANCELLATIONS_ADDRESS =
  "0x7f268357a8c2552623316e2562d90e642bb538e5";

// Opensea V2 contract handling the transfers
export const WYVERN_MERKLE_ADDRESS =
  "0xbaf2127b49fc93cbca6269fade0f7f31df4c88a7";

// Opensea atomicizer contract for bundle
export const WYVERN_ATOMICIZER_ADDRESS =
  "0xc99f70bfd82fb7c8f8191fdfbfb735606b15e5c5";

// LooksRare private sale strategy contract
export const LR_PRIVATE_SALE_STRATEGY =
  "0x58d83536d3efedb9f7f2a1ec3bdaad2b1a4dd98c";

// Function selectors
export const TRANSFER_FROM_SELECTOR = "0x23b872dd";
export const ERC721_SAFE_TRANSFER_FROM_SELECTOR = "0x42842e0e";
export const ERC155_SAFE_TRANSFER_FROM_SELECTOR = "0xf242432a";

// Core Types
export const GEN_ART_721_CORE_V0 = "GenArt721CoreV0";
export const GEN_ART_721_CORE_V1 = "GenArt721CoreV1";
export const GEN_ART_721_CORE_V2 = "GenArt721CoreV2";
// V3 and-on source core type from contract itself

export const OS_V1 = "OS_V1";
export const OS_V2 = "OS_V2";
export const LR_V1 = "LR_V1";
export const OS_SP = "OS_SP";

export const NATIVE = "Native";
export const ERC20 = "ERC20";
export const ERC721 = "ERC721";
export const ERC1155 = "ERC1155";

// This is directly tied to the ExternalAssetDependencyType enum on the Engine Flex Core contract
export const FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES = [
  "IPFS",
  "ARWEAVE",
  "ONCHAIN",
  "ART_BLOCKS_DEPENDENCY_REGISTRY"
];

// This is directly tied to the MinterFilterType enum defined in the subgraph schema
// @dev does not include the "UNKNOWN" type, because this is a list of only known types
export const KNOWN_MINTER_FILTER_TYPES = [
  "MinterFilterV0",
  "MinterFilterV1",
  "MinterFilterV2"
];

export const JS_MAX_SAFE_INTEGER = BigInt.fromString("9007199254740991");

// @dev these are used to stop indexing of new engine contracts registered
// on a compromised core registry contract
export const COMPROMISED_ENGINE_REGISTRY_ADDRESS_GOERLI =
  "0xea698596b6009a622c3ed00dd5a8b5d1cae4fc36";
export const COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_GOERLI = BigInt.fromI32(
  10050500
);
export const COMPROMISED_ENGINE_REGISTRY_ADDRESS_MAINNET =
  "0x652490c8bb6e7ec3fd798537d2f348d7904bbbc2";
export const COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_MAINNET = BigInt.fromI32(
  18580700
);
export const COMPROMISED_ENGINE_REGISTRY_ADDRESS_ARBITRUM =
  "0xdae755c2944ec125a0d8d5cb082c22837593441a";
export const COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_ARBITRUM = BigInt.fromI32(
  150114684
);

// PMP enum values for auth options and param types
export const PMP_AUTH_OPTIONS: string[] = [
  "Artist",
  "TokenOwner",
  "Address",
  "ArtistAndTokenOwner",
  "ArtistAndAddress",
  "TokenOwnerAndAddress",
  "ArtistAndTokenOwnerAndAddress"
];

export const PMP_PARAM_TYPES: string[] = [
  "Unconfigured",
  "Select",
  "Bool",
  "Uint256Range",
  "Int256Range",
  "DecimalRange",
  "HexColor",
  "Timestamp",
  "String"
];
