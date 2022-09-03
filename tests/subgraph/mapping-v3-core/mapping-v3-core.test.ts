import {
  assert,
  clearStore,
  test,
  newMockCall,
  log,
  logStore,
  newMockEvent,
  describe,
  beforeEach,
  createMockedFunction
} from "matchstick-as/assembly/index";
import {
  Address,
  BigInt,
  Bytes,
  ethereum,
  store,
  Value
} from "@graphprotocol/graph-ts";
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
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  addNewTokenToStore,
  addNewContractToStore,
  TRANSFER_ENTITY_TYPE,
  DEFAULT_COLLECTION,
  ONE_MILLION,
  booleanToString
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
  ProjectUpdated,
  Transfer
} from "../../../generated/GenArt721CoreV3/GenArt721CoreV3";
import {
  FIELD_PROJECT_CREATED,
  handleMint,
  handleProjectUpdated,
  handleTransfer
} from "../../../src/mapping-v3-core";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

test("GenArt721CoreV3: Can handle Mint", () => {
  clearStore();
  // add contract to store
  const projectId = BigInt.fromI32(1);
  const tokenId = BigInt.fromI32(1000001);
  addTestContractToStore(projectId);
  mockTokenIdToHash(TEST_CONTRACT_ADDRESS, tokenId, TEST_TOKEN_HASH);
  // add project to store
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const artistAddress = randomAddressGenerator.generateRandomAddress();
  const projectName = "Test Project";
  const pricePerTokenInWei = BigInt.fromI64(i64(1e18));

  addNewProjectToStore(
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
    true,
    CURRENT_BLOCK_TIMESTAMP
  );

  // handle mint
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

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

describe("GenArt721CoreV3: handleProjectUpdated", () => {
  describe("create", () => {
    beforeEach(() => {
      clearStore();
      addTestContractToStore(BigInt.fromI32(0));
    });

    test("should do nothing if the contract does not already exist", () => {
      // Extra clearStore for this test since we don't want the contract to exist here
      clearStore();
      const projectId = BigInt.fromI32(0);

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_CREATED))
        )
      ];

      handleProjectUpdated(event);

      assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHex());
      assert.notInStore(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId)
      );
    });

    test("should do nothing if request for project info reverts", () => {
      const projectId = BigInt.fromI32(0);

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_CREATED))
        )
      ];

      // mock projectDetails
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectDetails",
        "projectDetails(uint256):(string,string,string,string,string)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test")
        ]);
      // mock projectScriptDetails
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectScriptDetails",
        "projectScriptDetails(uint256):(string,string,string,uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromString("test"),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
        ]);
      // mock projectStateData
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectStateData",
        "projectStateData(uint256):(uint256,uint256,bool,bool,bool)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(ONE_MILLION)),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromBoolean(true),
          ethereum.Value.fromBoolean(false)
        ]);
      // // mock projectIdToArtistAddress
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToArtistAddress",
        "projectIdToArtistAddress(uint256):(address)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .reverts();

      handleProjectUpdated(event);

      assert.notInStore(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId)
      );
    });

    test("should create a project entity", () => {
      const projectId = BigInt.fromI32(0);
      const artistAddress = randomAddressGenerator.generateRandomAddress();
      const projectName = "Test Project";
      const artistName = "";
      const invocations = BigInt.fromI32(0);
      const maxInvocations = BigInt.fromI32(ONE_MILLION);
      const paused = true;
      const scriptCount = BigInt.fromI32(0);

      const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
      event.address = TEST_CONTRACT_ADDRESS;
      event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
      event.parameters = [
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(projectId)
        ),
        new ethereum.EventParam(
          "_update",
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_CREATED))
        )
      ];

      // mock projectDetails
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectDetails",
        "projectDetails(uint256):(string,string,string,string,string)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString(projectName),
          ethereum.Value.fromString(artistName),
          ethereum.Value.fromString(""),
          ethereum.Value.fromString(""),
          ethereum.Value.fromString("")
        ]);
      // mock projectScriptDetails
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectScriptDetails",
        "projectScriptDetails(uint256):(string,string,string,uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromString(""),
          ethereum.Value.fromString(""),
          ethereum.Value.fromString(""),
          ethereum.Value.fromUnsignedBigInt(scriptCount)
        ]);
      // mock projectStateData
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectStateData",
        "projectStateData(uint256):(uint256,uint256,bool,bool,bool)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(invocations),
          ethereum.Value.fromUnsignedBigInt(maxInvocations),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromBoolean(paused),
          ethereum.Value.fromBoolean(false)
        ]);
      // // mock projectIdToArtistAddress
      createMockedFunction(
        TEST_CONTRACT_ADDRESS,
        "projectIdToArtistAddress",
        "projectIdToArtistAddress(uint256):(address)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
        .returns([ethereum.Value.fromAddress(artistAddress)]);

      handleProjectUpdated(event);

      // Artist entity
      assert.fieldEquals(
        ACCOUNT_ENTITY_TYPE,
        artistAddress.toHexString(),
        "id",
        artistAddress.toHexString()
      );

      // Project fields
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "active",
        booleanToString(false)
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "artist",
        artistName
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "artistAddress",
        artistAddress.toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "complete",
        "false"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "contract",
        TEST_CONTRACT_ADDRESS.toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "createdAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "currencyAddress",
        Address.zero().toHexString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "currencySymbol",
        "ETH"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "dynamic",
        "true"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "externalAssetDependencyCount",
        "0"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "invocations",
        invocations.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "locked",
        "false"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "maxInvocations",
        maxInvocations.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "name",
        projectName
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "paused",
        booleanToString(paused)
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "scriptCount",
        scriptCount.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "useHashString",
        "true"
      );
      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        generateContractSpecificId(TEST_CONTRACT_ADDRESS, projectId),
        "useIpfs",
        "false"
      );
    });
  });

  // beforeEach(() => {
  //   clearStore();
  //   addTestContractToStore(BigInt.fromI32(0));
  //   addNewProjectToStore(
  // });
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export { handleMint, handleTransfer };
