import {
  assert,
  createMockedFunction,
  log
} from "matchstick-as/assembly/index";
import {
  Address,
  BigInt,
  ethereum,
  crypto,
  ByteArray,
  Bytes
} from "@graphprotocol/graph-ts";
import {
  Contract,
  Minter,
  Project,
  ProjectMinterConfiguration,
  ProposedArtistAddressesAndSplit,
  Token
} from "../../generated/schema";
import {
  generateContractSpecificId,
  getProjectMinterConfigId
} from "../../src/helpers";

// Utils
// The built in assembly script Math.random() function does not work
// in the test runner so the class below takes advantage of a modified version
// of the prng described here https://github.com/mattdesl/tiny-artblocks/blob/main/README.md
// to generate random Ethereum addresses.
export class RandomAddressGenerator {
  xs_state: Array<i32>;

  constructor() {
    // Random keccak256 hash
    const hash = crypto.keccak256(ByteArray.fromUTF8("testhash")).toHexString();

    this.xs_state = [];
    for (let i = 0; i < 4; i++) {
      this.xs_state.push(I32.parseInt(hash.substr(i * 8 + 2, 8), 16));
    }
    // this.xs_state = [0, 0, 0, 0].map<i32>((_, i) =>
    // );
  }

  prng(): i64 {
    /* Algorithm "xor128" from p. 5 of Marsaglia, "Xorshift RNGs" */
    let s = this.xs_state[3];
    let t = this.xs_state[3];
    this.xs_state[3] = this.xs_state[2];
    this.xs_state[2] = this.xs_state[1];
    this.xs_state[1] = s = this.xs_state[0];
    t ^= t << 11;
    t ^= t >>> 8;
    this.xs_state[0] = t ^ s ^ (s >>> 19);
    return this.xs_state[0];
  }

  generateRandomAddress(): Address {
    const randomHash = crypto
      .keccak256(ByteArray.fromI64(this.prng()))
      .toHexString();

    return Address.fromString(randomHash.slice(0, 42));
  }
}

export function booleanToString(b: bool): string {
  return b ? "true" : "false";
}

// Constants
const randomAddressGenerator = new RandomAddressGenerator();

export const ACCOUNT_ENTITY_TYPE = "Account";
export const PROJECT_ENTITY_TYPE = "Project";
export const CONTRACT_ENTITY_TYPE = "Contract";
export const WHITELISTING_ENTITY_TYPE = "Whitelisting";
export const PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE =
  "ProjectExternalAssetDependency";
export const PROJECT_SCRIPT_ENTITY_TYPE = "ProjectScript";
export const TOKEN_ENTITY_TYPE = "Token";
export const TRANSFER_ENTITY_TYPE = "Transfer";
export const PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE =
  "ProjectMinterConfiguration";
export const MINTER_FILTER_ENTITY_TYPE = "MinterFilter";
export const MINTER_ENTITY_TYPE = "Minter";
export const ONE_MILLION = 1000000;
export const RANDOMIZER_ADDRESS = randomAddressGenerator.generateRandomAddress();
export const IPFS_CID = "QmQCqjqxVXZQ6vXNmZvF7FjyZkCXKXMykCyyPQQrZ6m7W";
export const IPFS_CID2 = "QmQCqjqxVXZQ6vXNmZvF7FjyZkCXKXMykCyyPQQrZ6m7W2";
export const CURRENT_BLOCK_TIMESTAMP = BigInt.fromI32(1647051214);
export const TEST_CONTRACT_ADDRESS = randomAddressGenerator.generateRandomAddress();
export const TEST_SUPER_ADMIN_ADDRESS = randomAddressGenerator.generateRandomAddress();
export const TEST_TOKEN_HASH = Bytes.fromByteArray(
  crypto.keccak256(Bytes.fromUTF8("token hash"))
);
export const TEST_TX_HASH = Bytes.fromByteArray(
  crypto.keccak256(Bytes.fromUTF8("tx hash"))
);
export const TEST_MINTER_FILTER_ADDRESS = randomAddressGenerator.generateRandomAddress();
export const ONE_ETH_IN_WEI = BigInt.fromString("1000000000000000000");

export const DEFAULT_ORDER_HASH =
  "0xbc5a2acf703138c9562adf29a4131756ef6fe70f7a03c08cbc8a4fd22d53f1a7";
export const DEFAULT_ORDER_NONCE = BigInt.fromString("48");
export const DEFAULT_TAKER = Address.fromString(
  "0x258a5e28aa40aef3c2c4cdf728b11dd9dd2b8bcd"
);
export const DEFAULT_MAKER = Address.fromString(
  "0x26a6434385cd63a88450ea06e2b2256979400b29"
);
export const DEFAULT_STRATEGY = Address.fromString(
  "0x56244bb70cbd3ea9dc8007399f61dfc065190031"
);
export const DEFAULT_CURRENCY = Address.fromString(
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
);
export const DEFAULT_COLLECTION = Address.fromString(
  "0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f"
);
export const DEFAULT_PROJECT_ID = BigInt.fromString("18");
export const DEFAULT_TOKEN_ID = BigInt.fromString("7019");
export const DEFAULT_AMOUNT = BigInt.fromString("1");
export const DEFAULT_PRICE = BigInt.fromString("700000000000000000");
export const DEFAULT_ZONE = Address.fromString(
  "0x004C00500000aD104D7DBd00e3ae0A5C00560C00"
);
export class ContractValues {
  admin: Address;
  type: string;
  mintWhitelisted: Bytes[];
  randomizerContract: Address;
  minterContract: Address;
  renderProviderAddress: Address;
  renderProviderPercentage: BigInt;
  renderProviderSecondarySalesAddress: Address;
  renderProviderSecondarySalesBPS: BigInt;
  dependencyRegistry: Address;
  curationRegistry: Address;
  newProjectsForbidden: boolean;
}
export const TEST_CONTRACT: ContractValues = {
  admin: Address.fromString("0x96dc73c8b5969608c77375f085949744b5177660"),
  type: "GenArt721CoreV1",
  renderProviderPercentage: BigInt.fromI32(10),
  renderProviderAddress: Address.fromString(
    "0xf7a55108a6e830a809e88e74cbf5f5de9d930153"
  ),
  renderProviderSecondarySalesAddress: Address.fromString(
    "0xf4c61bd7b43e89f072fe1ef4e063fcf07f94565c"
  ),
  renderProviderSecondarySalesBPS: BigInt.fromI32(250),
  mintWhitelisted: [],
  minterContract: Address.zero(),
  randomizerContract: RANDOMIZER_ADDRESS,
  dependencyRegistry: Address.zero(),
  curationRegistry: Address.zero(),
  newProjectsForbidden: false
};
export const TEST_CONTRACT_CREATED_AT = BigInt.fromI32(1607763598);

// These should be used to set return values for mock calls
export class DefaultProjectValues {
  active: boolean;
  additionalPayeeAddress: Address;
  additionalPayeePercentage: BigInt;
  additionalPayeeSecondarySalesAddress: Address;
  additionalPayeeSecondarySalesPercentage: BigInt;
  artistName: string;
  baseIpfsUri: string;
  baseUri: string;
  complete: boolean;
  completedAt: BigInt;
  currencyAddress: Address;
  currencySymbol: string;
  description: string;
  dynamic: boolean;
  invocations: BigInt;
  ipfsHash: string;
  license: string;
  locked: boolean;
  maxInvocations: BigInt;
  paused: boolean;
  completedTimestamp: BigInt;
  royaltyPercentage: BigInt;
  scriptCount: BigInt;
  scriptJSON: string;
  scriptTypeAndVersion: string;
  aspectRatio: string;
  useHashString: boolean;
  useIpfs: boolean;
  website: string;
  externalAssetDependencyCount: BigInt;
  externalAssetDependenciesLocked: boolean;
}

// These represent the values that would be returned by a
// GenArt721Core contract for a newly created project. They
// are returned in type that we would expect from a contract
// call in a handler function.
export const DEFAULT_PROJECT_VALUES: DefaultProjectValues = {
  active: false,
  additionalPayeeAddress: Address.zero(),
  additionalPayeePercentage: BigInt.fromI32(0),
  additionalPayeeSecondarySalesAddress: Address.zero(),
  additionalPayeeSecondarySalesPercentage: BigInt.fromI32(0),
  artistName: "",
  baseIpfsUri: "",
  baseUri: "",
  complete: false,
  completedAt: BigInt.fromI32(0),
  currencyAddress: Address.zero(),
  currencySymbol: "ETH",
  description: "",
  dynamic: true,
  invocations: BigInt.zero(),
  ipfsHash: "",
  license: "",
  locked: false,
  maxInvocations: BigInt.fromI32(ONE_MILLION),
  paused: true,
  completedTimestamp: BigInt.fromI32(0),
  royaltyPercentage: BigInt.zero(),
  scriptCount: BigInt.zero(),
  scriptJSON: "",
  scriptTypeAndVersion: "",
  aspectRatio: "",
  useHashString: true,
  useIpfs: false,
  website: "",
  externalAssetDependencyCount: BigInt.zero(),
  externalAssetDependenciesLocked: false
};

// Store population functions
export const addNewTokenToStore = function(
  address: Address = DEFAULT_COLLECTION,
  tokenId: BigInt = DEFAULT_TOKEN_ID,
  projectId: BigInt = DEFAULT_PROJECT_ID
): Token {
  let token = new Token(generateContractSpecificId(address, tokenId));
  token.project = generateContractSpecificId(address, projectId);
  token.tokenId = tokenId;
  token.invocation = tokenId.minus(projectId.div(BigInt.fromI32(ONE_MILLION)));
  token.hash = Bytes.fromByteArray(
    crypto.keccak256(Bytes.fromUTF8("token hash"))
  );
  token.transactionHash = Bytes.fromByteArray(
    crypto.keccak256(Bytes.fromUTF8("transaction hash"))
  );
  token.nextSaleId = BigInt.fromI32(0);
  token.owner = randomAddressGenerator.generateRandomAddress().toHexString();
  token.contract = address.toHexString();
  token.createdAt = CURRENT_BLOCK_TIMESTAMP;
  token.updatedAt = CURRENT_BLOCK_TIMESTAMP;
  token.save();
  return token;
};

export const addNewProjectToStore = function(
  coreContractAddress: Address,
  projectId: BigInt,
  projectName: string,
  artistAddress: Address,
  pricePerTokenInWei: BigInt,
  timestamp: BigInt | null
): Project {
  let project = new Project(
    generateContractSpecificId(coreContractAddress, projectId)
  );

  project.active = DEFAULT_PROJECT_VALUES.active;
  project.artist = artistAddress.toHexString();
  project.artistAddress = artistAddress;
  project.complete = DEFAULT_PROJECT_VALUES.complete;
  project.contract = coreContractAddress.toHexString();
  project.createdAt = timestamp ? timestamp : CURRENT_BLOCK_TIMESTAMP;
  project.currencySymbol = DEFAULT_PROJECT_VALUES.currencySymbol;
  project.currencyAddress = DEFAULT_PROJECT_VALUES.currencyAddress;
  project.dynamic = DEFAULT_PROJECT_VALUES.dynamic;
  project.invocations = DEFAULT_PROJECT_VALUES.invocations;
  project.locked = DEFAULT_PROJECT_VALUES.locked;
  project.maxInvocations = DEFAULT_PROJECT_VALUES.maxInvocations;
  project.name = projectName;
  project.paused = DEFAULT_PROJECT_VALUES.paused;
  project.pricePerTokenInWei = pricePerTokenInWei;
  project.projectId = projectId;
  project.scriptCount = DEFAULT_PROJECT_VALUES.scriptCount;
  project.updatedAt = timestamp ? timestamp : CURRENT_BLOCK_TIMESTAMP;
  project.useHashString = DEFAULT_PROJECT_VALUES.useHashString;
  project.useIpfs = DEFAULT_PROJECT_VALUES.useIpfs;
  project.externalAssetDependencyCount = BigInt.fromI32(0);
  project.externalAssetDependenciesLocked = false;

  project.save();
  return project;
};

export function addNewContractToStore(): Contract {
  let contract = new Contract(DEFAULT_COLLECTION.toHexString());
  contract.admin = TEST_CONTRACT.admin;
  contract.type = TEST_CONTRACT.type;
  contract.createdAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  contract.nextProjectId = BigInt.fromI32(0);
  contract.randomizerContract = TEST_CONTRACT.randomizerContract;
  contract.renderProviderAddress = TEST_CONTRACT.renderProviderAddress;
  contract.renderProviderPercentage = TEST_CONTRACT.renderProviderPercentage;
  contract.updatedAt = contract.createdAt;
  contract.mintWhitelisted = TEST_CONTRACT.mintWhitelisted;
  contract.newProjectsForbidden = false;
  contract.save();

  return contract;
}

export function addTestContractToStore(nextProjectId: BigInt): Contract {
  let contract = new Contract(TEST_CONTRACT_ADDRESS.toHexString());
  contract.admin = TEST_CONTRACT.admin;
  contract.type = TEST_CONTRACT.type;
  contract.createdAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
  contract.nextProjectId = nextProjectId;
  contract.randomizerContract = TEST_CONTRACT.randomizerContract;
  contract.renderProviderAddress = TEST_CONTRACT.renderProviderAddress;
  contract.renderProviderPercentage = TEST_CONTRACT.renderProviderPercentage;
  contract.renderProviderSecondarySalesAddress =
    TEST_CONTRACT.renderProviderSecondarySalesAddress;
  contract.renderProviderSecondarySalesBPS =
    TEST_CONTRACT.renderProviderSecondarySalesBPS;
  contract.curationRegistry = TEST_CONTRACT.curationRegistry;
  contract.dependencyRegistry = TEST_CONTRACT.dependencyRegistry;
  contract.updatedAt = contract.createdAt;
  contract.mintWhitelisted = TEST_CONTRACT.mintWhitelisted;
  contract.newProjectsForbidden = false;
  contract.save();

  return contract;
}

export const addNewMinterToStore = (type: string): Minter => {
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterType = type;
  const minter = new Minter(minterAddress.toHexString());
  minter.coreContract = TEST_CONTRACT_ADDRESS.toHexString();
  minter.minterFilter = randomAddressGenerator
    .generateRandomAddress()
    .toHexString();
  minter.type = minterType;
  minter.extraMinterDetails = "{}";
  minter.updatedAt = CURRENT_BLOCK_TIMESTAMP;
  minter.save();

  return minter;
};

export const addNewProjectMinterConfigToStore = (
  projectId: string,
  minterAddress: Address
): ProjectMinterConfiguration => {
  const projectMinterConfig = new ProjectMinterConfiguration(
    getProjectMinterConfigId(minterAddress.toHexString(), projectId)
  );
  projectMinterConfig.minter = minterAddress.toHexString();
  projectMinterConfig.project = projectId;
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.currencyAddress = Address.zero();
  projectMinterConfig.currencySymbol = "ETH";
  projectMinterConfig.purchaseToDisabled = false;
  projectMinterConfig.extraMinterDetails = "{}";

  projectMinterConfig.save();

  return projectMinterConfig;
};

// Mocks
// projectScriptByIndex has the same signature for all versions of
// the GenArt contract so this mock can be shared between all versions.
export const mockProjectScriptByIndex = function(
  contractAddress: Address,
  projectId: BigInt,
  index: BigInt,
  script: string | null
): void {
  let projectScriptByIndexInputs: Array<ethereum.Value> = [
    ethereum.Value.fromUnsignedBigInt(projectId), // projectId
    ethereum.Value.fromUnsignedBigInt(index) // index
  ];
  createMockedFunction(
    contractAddress,
    "projectScriptByIndex",
    "projectScriptByIndex(uint256,uint256):(string)"
  )
    .withArgs(projectScriptByIndexInputs)
    .returns([ethereum.Value.fromString(script ? script : "")]);
};

// tokenIdToHash has the same signature for all versions of
// the GenArt contract so this mock can be shared between all versions.
export const mockTokenIdToHash = function(
  contractAddress: Address,
  tokenId: BigInt,
  hash: Bytes
): void {
  let tokenIdToHashInputs: Array<ethereum.Value> = [
    ethereum.Value.fromUnsignedBigInt(tokenId)
  ];
  createMockedFunction(
    contractAddress,
    "tokenIdToHash",
    "tokenIdToHash(uint256):(bytes32)"
  )
    .withArgs(tokenIdToHashInputs)
    .returns([ethereum.Value.fromBytes(hash)]);
};

// Asserts
export function assertNewProjectFields(
  contractAddress: Address,
  projectId: BigInt,
  projectName: string,
  artistAddress: Address,
  pricePerTokenInWei: BigInt,
  currentBlockTimestamp: BigInt
): void {
  const fullProjectId = generateContractSpecificId(contractAddress, projectId);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "active",
    booleanToString(DEFAULT_PROJECT_VALUES.active)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "artist",
    artistAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "artistAddress",
    artistAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "complete",
    booleanToString(DEFAULT_PROJECT_VALUES.complete)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "contract",
    TEST_CONTRACT_ADDRESS.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "createdAt",
    currentBlockTimestamp.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "currencySymbol",
    DEFAULT_PROJECT_VALUES.currencySymbol.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "dynamic",
    booleanToString(DEFAULT_PROJECT_VALUES.dynamic)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "invocations",
    DEFAULT_PROJECT_VALUES.invocations.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "locked",
    booleanToString(DEFAULT_PROJECT_VALUES.locked)
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "maxInvocations",
    DEFAULT_PROJECT_VALUES.maxInvocations.toString()
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "name", projectName);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "pricePerTokenInWei",
    pricePerTokenInWei.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "projectId",
    projectId.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "scriptCount",
    DEFAULT_PROJECT_VALUES.scriptCount.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    currentBlockTimestamp.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "useHashString",
    booleanToString(DEFAULT_PROJECT_VALUES.useHashString)
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "useIpfs", "false");
}

export function assertTestContractFields(
  createdAt: BigInt,
  updatedAt: BigInt,
  nextProjectId: BigInt
): void {
  // Contract setup in refreshContracts
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "admin",
    TEST_CONTRACT.admin.toHexString()
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    TEST_CONTRACT.renderProviderAddress.toHexString()
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "createdAt",
    createdAt.toString()
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "updatedAt",
    updatedAt.toString()
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "nextProjectId",
    nextProjectId.toString()
  );
}
