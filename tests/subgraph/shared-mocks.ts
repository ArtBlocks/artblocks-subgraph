import { createMockedFunction, log } from "matchstick-as/assembly/index";
import {
  Address,
  BigInt,
  ethereum,
  crypto,
  ByteArray
} from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import { generateContractSpecificId } from "../../src/helpers";

export const ACCOUNT_ENTITY_TYPE = "Account";
export const PROJECT_ENTITY_TYPE = "Project";
export const CONTRACT_ENTITY_TYPE = "Contract";
export const WHITELISTING_ENTITY_TYPE = "Whitelisting";
export const PROJECTSCRIPT_ENTITY_TYPE = "ProjectScript";
export const TOKEN_ENTITY_TYPE = "Token";

const ONE_MILLION = 1000000;

// Some of these match up with our actual contracts but they could
// be any arbitrary address for testing purposes.
export const genArt721Address = "0x059edd72cd353df5106d2b9cc5ab83a52287ac3a";
export const genArt721CoreAddress =
  "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270";
export const genArt721Core2PBABAddress =
  "0x28f2d3805652fb5d359486dffb7d08320d403240";

export const RANDOMIZER_ADDRESS = Address.fromString(
  "0x35549b4b0cc71ef151a1eaa1fd08ddfb9a608a81"
);
export const CURRENT_BLOCK_TIMESTAMP = BigInt.fromI32(1647051214);

export class ContractValues {
  admin: Address;
  mintWhitelisted: Address[];
  randomizerContract: Address;
  renderProviderAddress: Address;
  renderProviderPercentage: BigInt;
}

// These should be used to set return values for mock calls
export class DefaultProjectValues {
  active: boolean;
  additionalPayeeAddress: Address;
  additionalPayeePercentage: BigInt;
  artistName: string;
  baseIpfsUri: string;
  baseUri: string;
  complete: boolean;
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
  royaltyPercentage: BigInt;
  scriptCount: BigInt;
  scriptJSON: string;
  useHashString: boolean;
  useIpfs: boolean;
  website: string;
}

// These represent the values that would be returned by a
// GenArt721Core contract for a newly created project. They
// are returned in type that we would expect from a contract
// call in a handler function.
export const DEFAULT_PROJECT_VALUES: DefaultProjectValues = {
  active: false,
  additionalPayeeAddress: Address.zero(),
  additionalPayeePercentage: BigInt.fromI32(0),
  artistName: "",
  baseIpfsUri: "",
  baseUri: "",
  complete: false,
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
  royaltyPercentage: BigInt.zero(),
  scriptCount: BigInt.zero(),
  scriptJSON: "",
  useHashString: true,
  useIpfs: false,
  website: ""
};

export function booleanToString(b: bool): string {
  return b ? "true" : "false";
}

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

// helper mock function to initialize a Token entity in local in-memory store
export const addNewTokenToStore = function(
  address: Address,
  tokenId: BigInt
): void {
  let token = new Token(generateContractSpecificId(address, tokenId));

  token.save();
};

// mocks return values for Soldity contract calls in refreshProjectScript() helper function
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
