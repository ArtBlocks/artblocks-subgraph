export type SubgraphConfig = Partial<{
  network: string;
  iGenArt721CoreContractV3_BaseContracts: {
    address: string;
  }[];
  ownableGenArt721CoreV3Contracts?: { address: string }[];
  iERC721GenArt721CoreV3Contracts?: { address: string }[];
  genArt721CoreContracts: { address: string }[];
  genArt721Core2Contracts: { address: string }[];
  genArt721Contracts: { address: string }[];
  pbabContracts: { address: string }[];
  engineFlexContracts: { address: string }[];
  minterFilterV0Contracts: { address: string }[];
  minterFilterV1Contracts: { address: string }[];
  sharedMinterFilterContracts: { address: string }[];
  minterSetPriceContracts: { address: string }[];
  minterSetPriceERC20Contracts: { address: string }[];
  minterDAExpContracts: { address: string }[];
  minterDALinContracts: { address: string }[];
  minterDAExpSettlementContracts: { address: string }[];
  minterMerkleContracts: { address: string }[];
  minterHolderContracts: { address: string }[];
  adminACLV0Contracts: { address: string }[];
  iDependencyRegistryV0Contracts: { address: string }[];
  ownableUpgradeableDependencyRegistryContracts: { address: string }[];
  ICoreRegistryContracts: { address: string }[];
  iSharedMinterV0Contracts: { address: string }[];
  iSharedMerkleContracts: { address: string }[];
  iSharedHolderContracts: { address: string }[];
  iSharedSEAContracts: { address: string }[];
  metadata: {
    minterFilterAdminACLAddress: string;
    coreRegistryAddress: string;
    bytecodeStorageReaderAddress: string;
    delegationRegistryAddress: string;
  };
}>;
