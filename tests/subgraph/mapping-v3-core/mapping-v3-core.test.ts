import {
  assert,
  clearStore,
  test,
  newMockCall,
  log,
  logStore,
  newMockEvent
} from "matchstick-as/assembly/index";
import { BigInt, Bytes, ethereum, store, Value } from "@graphprotocol/graph-ts";
import {
  ACCOUNT_ENTITY_TYPE,
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  WHITELISTING_ENTITY_TYPE,
  PROJECT_SCRIPT_ENTITY_TYPE,
  TOKEN_ENTITY_TYPE,
  DEFAULT_PROJECT_VALUES,
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
  mockProjectScriptByIndex,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  TEST_CONTRACT_ADDRESS,
  TEST_CONTRACT_CREATED_AT,
  TEST_CONTRACT,
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  addNewTokenToStore,
  addNewContractToStore,
  TRANSFER_ENTITY_TYPE,
  DEFAULT_COLLECTION
} from "../shared-helpers";

import { mockRefreshContractCalls } from "./helpers";

import {
  Account,
  Contract,
  MinterFilter,
  Project,
  ProjectMinterConfiguration,
  ProjectScript,
  Token,
  Whitelisting
} from "../../../generated/schema";
import { Mint, Transfer } from "../../../generated/GenArt721Core/GenArt721Core";
import { handleMint, handleTransfer } from "../../../src/mapping-v1-core";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

test("GenArt721CoreV3: Can handle Mint", () => {
  clearStore();
  const tokenId = BigInt.fromI32(0);
  const projectId = BigInt.fromI32(0);
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

  // addNewTokenToStore(TEST_CONTRACT_ADDRESS, tokenId, projectId);

  // const fromAddress = randomAddressGenerator.generateRandomAddress();
  const toAddress = randomAddressGenerator.generateRandomAddress();

  const hash = Bytes.fromUTF8("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG");

  const logIndex = BigInt.fromI32(0);

  const event: Mint = changetype<Mint>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = hash;
  event.logIndex = logIndex;
  event.parameters = [
    new ethereum.EventParam("_to", ethereum.Value.fromAddress(toAddress)),
    new ethereum.EventParam(
      "_tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    ),
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  ];

  handleMint(event);

  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    fullTokenId,
    "owner",
    toAddress.toHexString()
  );
});

test("GenArt721CoreV3: Can handle transfer", () => {
  clearStore();
  const tokenId = BigInt.fromI32(0);
  const projectId = BigInt.fromI32(0);
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

  addNewTokenToStore(TEST_CONTRACT_ADDRESS, tokenId, projectId);

  const fromAddress = randomAddressGenerator.generateRandomAddress();
  const toAddress = randomAddressGenerator.generateRandomAddress();

  const hash = Bytes.fromUTF8("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG");

  const logIndex = BigInt.fromI32(0);

  const event: Transfer = changetype<Transfer>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = hash;
  event.logIndex = logIndex;
  event.parameters = [
    new ethereum.EventParam("from", ethereum.Value.fromAddress(fromAddress)),
    new ethereum.EventParam("to", ethereum.Value.fromAddress(toAddress)),
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  ];

  handleTransfer(event);

  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    fullTokenId,
    "owner",
    toAddress.toHexString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    hash.toHex() + "-" + logIndex.toString(),
    "to",
    toAddress.toHexString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    hash.toHex() + "-" + logIndex.toString(),
    "from",
    fromAddress.toHexString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    hash.toHex() + "-" + logIndex.toString(),
    "token",
    fullTokenId
  );
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export { handleMint, handleTransfer };
