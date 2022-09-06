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
  createMockedFunction,
  mockFunction
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
  addNewProjectToStore,
  addNewTokenToStore,
  addNewContractToStore,
  TRANSFER_ENTITY_TYPE,
  DEFAULT_COLLECTION,
  ONE_MILLION,
  booleanToString,
  addNewProjectToStore
} from "../shared-helpers";

import {
  mockProjectScriptDetailsCall,
  mockProjectStateDataCall,
  mockRefreshContractCalls
} from "./helpers";

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
  FIELD_PROJECT_ACTIVE,
  FIELD_PROJECT_ARTIST_ADDRESS,
  FIELD_PROJECT_ASPECT_RATIO,
  FIELD_PROJECT_CREATED,
  FIELD_PROJECT_IPFS_HASH,
  FIELD_PROJECT_MAX_INVOCATIONS,
  FIELD_PROJECT_PAUSED,
  FIELD_PROJECT_SCRIPT_TYPE,
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
    TEST_CONTRACT_ADDRESS,
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
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

  describe("update", () => {
    beforeEach(() => {
      const projectId = BigInt.fromI32(0);
      const projectName = "Test Project";
      const artistAddress = randomAddressGenerator.generateRandomAddress();

      clearStore();
      addTestContractToStore(BigInt.fromI32(1));
      const project = addNewProjectToStore(
        TEST_CONTRACT_ADDRESS,
        projectId,
        projectName,
        artistAddress,
        BigInt.zero(),
        CURRENT_BLOCK_TIMESTAMP
      );

      project.updatedAt = CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(10));
      project.save();
    });

    test("should do nothing if project does not exist", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        BigInt.zero()
      );
      store.remove("Project", fullProjectId);

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
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_ACTIVE))
        )
      ];

      const projectStateDataCallReturnOverrides = new Map<string, string>();
      projectStateDataCallReturnOverrides.set("active", "true");
      mockProjectStateDataCall(projectId, projectStateDataCallReturnOverrides);

      assert.notInStore("Project", fullProjectId);

      handleProjectUpdated(event);

      assert.notInStore("Project", fullProjectId);
    });

    test("should update active", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );
      const active = true;

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
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_ACTIVE))
        )
      ];

      const projectStateDataCallReturnOverrides = new Map<string, string>();
      projectStateDataCallReturnOverrides.set(
        "active",
        booleanToString(active)
      );
      mockProjectStateDataCall(projectId, projectStateDataCallReturnOverrides);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "active",
        booleanToString(false)
      );

      handleProjectUpdated(event);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "active",
        booleanToString(active)
      );
    });

    test("should update maxInvocations", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );
      const maxInvocations = BigInt.fromI32(100);

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
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(FIELD_PROJECT_MAX_INVOCATIONS)
          )
        )
      ];

      const projectStateDataCallReturnOverrides = new Map<string, string>();
      projectStateDataCallReturnOverrides.set(
        "maxInvocations",
        maxInvocations.toString()
      );

      mockProjectStateDataCall(projectId, projectStateDataCallReturnOverrides);

      assert.assertTrue(
        maxInvocations.notEqual(DEFAULT_PROJECT_VALUES.maxInvocations)
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "maxInvocations",
        DEFAULT_PROJECT_VALUES.maxInvocations.toString()
      );

      handleProjectUpdated(event);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "maxInvocations",
        maxInvocations.toString()
      );
    });

    test("should update paused", () => {
      const projectId = BigInt.fromI32(0);
      const fullProjectId = generateContractSpecificId(
        TEST_CONTRACT_ADDRESS,
        projectId
      );
      const paused = false;

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
          ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_PAUSED))
        )
      ];

      const projectStateDataCallReturnOverrides = new Map<string, string>();
      projectStateDataCallReturnOverrides.set(
        "paused",
        booleanToString(paused)
      );
      mockProjectStateDataCall(projectId, projectStateDataCallReturnOverrides);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "paused",
        booleanToString(!paused)
      );

      handleProjectUpdated(event);

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "paused",
        booleanToString(paused)
      );

      assert.fieldEquals(
        PROJECT_ENTITY_TYPE,
        fullProjectId,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });
  });

  test("should update artist address", () => {
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );
    const project: Project = changetype<Project>(Project.load(fullProjectId));
    const oldArtistAddress = project.artistAddress;
    const newArtistAddress = randomAddressGenerator.generateRandomAddress();

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
        ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_ARTIST_ADDRESS))
      )
    ];

    createMockedFunction(
      TEST_CONTRACT_ADDRESS,
      "projectIdToArtistAddress",
      "projectIdToArtistAddress(uint256):(address)"
    )
      .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
      .returns([ethereum.Value.fromAddress(newArtistAddress)]);

    assert.assertTrue(oldArtistAddress.notEqual(newArtistAddress));

    handleProjectUpdated(event);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "artistAddress",
      newArtistAddress.toHexString()
    );
  });

  test("should update aspectRatio", () => {
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );
    const project: Project = changetype<Project>(Project.load(fullProjectId));
    const aspectRatio = "1.77";

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
        ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_ASPECT_RATIO))
      )
    ];

    const projectScriptDetailsCallReturnOverrides = new Map<string, string>();
    projectScriptDetailsCallReturnOverrides.set("aspectRatio", aspectRatio);
    mockProjectScriptDetailsCall(
      projectId,
      projectScriptDetailsCallReturnOverrides
    );

    assert.assertNull(project.aspectRatio);

    handleProjectUpdated(event);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "aspectRatio",
      aspectRatio
    );

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
  });

  test("should update ipfsHash", () => {
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );
    const project: Project = changetype<Project>(Project.load(fullProjectId));
    const ipfsHash = "test hash";

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
        ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_IPFS_HASH))
      )
    ];

    const projectScriptDetailsCallReturnOverrides = new Map<string, string>();
    projectScriptDetailsCallReturnOverrides.set("ipfsHash", ipfsHash);
    mockProjectScriptDetailsCall(
      projectId,
      projectScriptDetailsCallReturnOverrides
    );

    assert.assertNull(project.ipfsHash);

    handleProjectUpdated(event);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "ipfsHash",
      ipfsHash
    );

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
  });

  test("should update scriptTypeAndVersion", () => {
    const projectId = BigInt.fromI32(0);
    const fullProjectId = generateContractSpecificId(
      TEST_CONTRACT_ADDRESS,
      projectId
    );
    const project: Project = changetype<Project>(Project.load(fullProjectId));
    const scriptTypeAndVersion = "p5js@1.0.0";

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
        ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_SCRIPT_TYPE))
      )
    ];

    const projectScriptDetailsCallReturnOverrides = new Map<string, string>();
    projectScriptDetailsCallReturnOverrides.set(
      "scriptTypeAndVersion",
      scriptTypeAndVersion
    );
    mockProjectScriptDetailsCall(
      projectId,
      projectScriptDetailsCallReturnOverrides
    );

    assert.assertNull(project.scriptTypeAndVersion);

    handleProjectUpdated(event);

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "scriptTypeAndVersion",
      scriptTypeAndVersion
    );

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      fullProjectId,
      "updatedAt",
      CURRENT_BLOCK_TIMESTAMP.toString()
    );
  });
});

// export handlers for test coverage https://github.com/LimeChain/demo-subgraph#test-coverage
export { handleMint, handleTransfer };
