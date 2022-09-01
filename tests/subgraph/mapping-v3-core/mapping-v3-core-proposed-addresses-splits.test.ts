import {
  assert,
  clearStore,
  test,
  newMockCall,
  log,
  logStore,
  createMockedFunction,
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
  mockTokenIdToHash,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  TEST_CONTRACT_ADDRESS,
  TEST_CONTRACT_CREATED_AT,
  TEST_CONTRACT,
  TEST_TOKEN_HASH,
  TEST_TX_HASH,
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  addNewTokenToStore,
  addNewContractToStore,
  TRANSFER_ENTITY_TYPE,
  DEFAULT_COLLECTION
} from "../shared-helpers";

import { mockRefreshContractCalls, addNewProjectToStore } from "./helpers";

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
import {
  Mint,
  Transfer,
  PlatformUpdated,
  ProposedArtistAddressesAndSplits,
  AcceptedArtistAddressesAndSplits
} from "../../../generated/GenArt721CoreV3/GenArt721CoreV3";
import {
  handleProposedArtistAddressesAndSplits,
  handleAcceptedArtistAddressesAndSplits
} from "../../../src/mapping-v3-core";
import { generateContractSpecificId } from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

test("GenArt721CoreV3/ProposedAddressesAndSplits: should handle new artist proposal", () => {
  clearStore();
  // add project to store
  const projectId = BigInt.fromI32(1);
  const artistAddress = randomAddressGenerator.generateRandomAddress();
  const projectName = "Test Project";
  const pricePerTokenInWei = BigInt.fromI64(i64(1e18));

  mockRefreshContractCalls(BigInt.fromI32(2), null);

  addNewProjectToStore(
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
    true,
    CURRENT_BLOCK_TIMESTAMP
  );

  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  // handle artist proposal
  const newArtistAddress = randomAddressGenerator.generateRandomAddress();
  const additionalPayeePrimarySalesAddress = randomAddressGenerator.generateRandomAddress();
  const additionalPayeePrimarySalesPercentage = BigInt.fromI32(10);
  const additionalPayeeSecondarySalesAddress = randomAddressGenerator.generateRandomAddress();
  const additionalPayeeSecondarySalesPercentage = BigInt.fromI32(49);

  const updatedEventBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );

  const event: ProposedArtistAddressesAndSplits = changetype<
    ProposedArtistAddressesAndSplits
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.transaction.hash = TEST_TX_HASH;
  event.logIndex = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_artistAddress",
      ethereum.Value.fromAddress(newArtistAddress)
    ),
    new ethereum.EventParam(
      "_additionalPayeePrimarySales",
      ethereum.Value.fromAddress(additionalPayeePrimarySalesAddress)
    ),
    new ethereum.EventParam(
      "_additionalPayeePrimarySalesPercentage",
      ethereum.Value.fromUnsignedBigInt(additionalPayeePrimarySalesPercentage)
    ),
    new ethereum.EventParam(
      "_additionalPayeeSecondarySales",
      ethereum.Value.fromAddress(additionalPayeeSecondarySalesAddress)
    ),
    new ethereum.EventParam(
      "_additionalPayeeSecondarySalesPercentage",
      ethereum.Value.fromUnsignedBigInt(additionalPayeeSecondarySalesPercentage)
    )
  ];
  event.block.timestamp = updatedEventBlockTimestamp;

  handleProposedArtistAddressesAndSplits(event);

  assert.fieldEquals(
    "ProposedArtistAddressesAndSplits",
    fullProjectId,
    "id",
    fullProjectId
  );
  assert.fieldEquals(
    "ProposedArtistAddressesAndSplits",
    fullProjectId,
    "project",
    fullProjectId
  );
  assert.fieldEquals(
    "ProposedArtistAddressesAndSplits",
    fullProjectId,
    "artistAddress",
    newArtistAddress.toHexString()
  );
  assert.fieldEquals(
    "ProposedArtistAddressesAndSplits",
    fullProjectId,
    "additionalPayeePrimarySalesAddress",
    additionalPayeePrimarySalesAddress.toHexString()
  );
  assert.fieldEquals(
    "ProposedArtistAddressesAndSplits",
    fullProjectId,
    "additionalPayeePrimarySalesPercentage",
    additionalPayeePrimarySalesPercentage.toString()
  );
  assert.fieldEquals(
    "ProposedArtistAddressesAndSplits",
    fullProjectId,
    "additionalPayeeSecondarySalesAddress",
    additionalPayeeSecondarySalesAddress.toHexString()
  );
  assert.fieldEquals(
    "ProposedArtistAddressesAndSplits",
    fullProjectId,
    "additionalPayeeSecondarySalesPercentage",
    additionalPayeeSecondarySalesPercentage.toString()
  );
  assert.fieldEquals(
    "ProposedArtistAddressesAndSplits",
    fullProjectId,
    "createdAt",
    updatedEventBlockTimestamp.toString()
  );
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export {
  handleProposedArtistAddressesAndSplits,
  handleAcceptedArtistAddressesAndSplits
};
