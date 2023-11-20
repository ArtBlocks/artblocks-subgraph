import {
  assert,
  clearStore,
  test,
  newMockCall,
  newMockEvent
} from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
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
  TEST_CONTRACT_ADDRESS,
  TEST_CONTRACT_CREATED_AT,
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  TEST_CONTRACT,
  TRANSFER_ENTITY_TYPE,
  addNewTokenToStore,
  TEST_TOKEN_HASH,
  PRIMARY_PURCHASE_DETAILS_ENTITY_TYPE
} from "../shared-helpers";

import {
  mockRefreshContractCalls,
  mockProjectScriptInfoCall,
  mockProjectTokenInfoCallWithDefaults,
  mockProjectDetailsCallWithDefaults,
  addNewProjectToStore,
  mockTokenURICall,
  mockShowTokenHashes
} from "./helpers";

import {
  Account,
  Contract,
  PrimaryPurchaseDetails,
  Project,
  ProjectScript,
  Token,
  Whitelisting
} from "../../../generated/schema";
import {
  AddProjectCall,
  AddWhitelistedCall,
  RemoveWhitelistedCall,
  UpdateArtblocksAddressCall,
  UpdateArtblocksPercentageCall,
  AddProjectScriptCall,
  ClearTokenIpfsImageUriCall,
  OverrideTokenDynamicImageWithIpfsLinkCall,
  RemoveProjectLastScriptCall,
  ToggleProjectIsActiveCall,
  ToggleProjectIsDynamicCall,
  ToggleProjectIsLockedCall,
  ToggleProjectIsPausedCall,
  ToggleProjectUseIpfsForStaticCall,
  UpdateProjectAdditionalPayeeInfoCall,
  UpdateProjectArtistAddressCall,
  UpdateProjectArtistNameCall,
  UpdateProjectBaseIpfsURICall,
  UpdateProjectBaseURICall,
  UpdateProjectDescriptionCall,
  UpdateProjectIpfsHashCall,
  UpdateProjectLicenseCall,
  UpdateProjectMaxInvocationsCall,
  UpdateProjectNameCall,
  UpdateProjectPricePerTokenInWeiCall,
  UpdateProjectWebsiteCall,
  UpdateProjectSecondaryMarketRoyaltyPercentageCall,
  UpdateProjectScriptCall,
  UpdateProjectScriptJSONCall,
  Transfer,
  Mint
} from "../../../generated/GenArt721/GenArt721";
import {
  handleAddProject,
  handleAddWhitelisted,
  handleRemoveWhitelisted,
  handleUpdateArtblocksAddress,
  handleUpdateArtblocksPercentage,
  handleAddProjectScript,
  handleClearTokenIpfsImageUri,
  handleOverrideTokenDynamicImageWithIpfsLink,
  handleRemoveProjectLastScript,
  handleToggleProjectIsActive,
  handleToggleProjectIsDynamic,
  handleToggleProjectIsLocked,
  handleToggleProjectIsPaused,
  handleToggleProjectUseIpfsForStatic,
  handleUpdateProjectAdditionalPayeeInfo,
  handleUpdateProjectArtistAddress,
  handleUpdateProjectArtistName,
  handleUpdateProjectBaseIpfsURI,
  handleUpdateProjectBaseURI,
  handleUpdateProjectDescription,
  handleUpdateProjectIpfsHash,
  handleUpdateProjectLicense,
  handleUpdateProjectMaxInvocations,
  handleUpdateProjectName,
  handleUpdateProjectPricePerTokenInWei,
  handleUpdateProjectWebsite,
  handleUpdateProjectSecondaryMarketRoyaltyPercentage,
  handleUpdateProjectScript,
  handleUpdateProjectScriptJSON,
  handleTransfer,
  handleMint
} from "../../../src/mapping-v0-core";

import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateTransferId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

test("GenArt721: Can add a new project when its contract has not yet been indexed", () => {
  clearStore();
  // When no contract entity exists yet we figure out the
  // project id of the project being added by
  // subtracting 1 from the contracts nextProjectId
  // value. Since the project will have already been
  // added the nextProjectId will be one greater than
  // the project id of the project being added.
  const nextProjectId = BigInt.fromI32(1);
  mockRefreshContractCalls(nextProjectId, new Map<string, string>());

  const projectId = nextProjectId.minus(BigInt.fromI32(1));
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const artistAddress = randomAddressGenerator.generateRandomAddress();
  const projectName = "Test Project";
  const pricePerTokenInWei = BigInt.fromI64(i64(1e18));
  const currentBlockTimestamp = TEST_CONTRACT_CREATED_AT.plus(
    BigInt.fromI32(100)
  );

  // Nothing should be in the store yet
  assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHexString());
  assert.notInStore(ACCOUNT_ENTITY_TYPE, artistAddress.toHexString());
  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  mockProjectTokenInfoCallWithDefaults(
    projectId,
    artistAddress,
    pricePerTokenInWei
  );
  mockProjectDetailsCallWithDefaults(projectId, projectName);
  mockProjectScriptInfoCall(projectId, null);

  const call = changetype<AddProjectCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = currentBlockTimestamp;

  call.inputValues = [
    new ethereum.EventParam(
      "projectName",
      ethereum.Value.fromString(projectName)
    ),
    new ethereum.EventParam(
      "artistAddress",
      ethereum.Value.fromAddress(artistAddress)
    ),
    new ethereum.EventParam(
      "pricePerTokenInWei",
      ethereum.Value.fromUnsignedBigInt(pricePerTokenInWei)
    )
  ];

  handleAddProject(call);

  // Account created for artist
  assert.fieldEquals(
    ACCOUNT_ENTITY_TYPE,
    artistAddress.toHexString(),
    "id",
    artistAddress.toHexString()
  );

  // Contract setup in refreshContracts
  assertTestContractFields(
    currentBlockTimestamp,
    currentBlockTimestamp,
    projectId.plus(BigInt.fromI32(1))
  );

  // Project created with default values
  assertNewProjectFields(
    TEST_CONTRACT_ADDRESS,
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
    currentBlockTimestamp
  );
});

test("GenArt721: Can add a new project when its contract has been indexed", () => {
  clearStore();
  const nextProjectId = BigInt.fromI32(1);

  // Prepopulate store with contract entity
  const contract = addTestContractToStore(nextProjectId);

  const projectId = nextProjectId;
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const artistAddress = randomAddressGenerator.generateRandomAddress();
  const projectName = "Test Project";
  const pricePerTokenInWei = BigInt.fromI64(i64(1e18));
  const currentBlockTimestamp = TEST_CONTRACT_CREATED_AT.plus(
    BigInt.fromI32(100)
  );

  // Nothing should be in the store yet
  assert.notInStore(ACCOUNT_ENTITY_TYPE, artistAddress.toHexString());
  assert.notInStore(PROJECT_ENTITY_TYPE, fullProjectId);

  mockProjectTokenInfoCallWithDefaults(
    projectId,
    artistAddress,
    pricePerTokenInWei
  );
  mockProjectDetailsCallWithDefaults(projectId, projectName);
  mockProjectScriptInfoCall(projectId, null);

  const call = changetype<AddProjectCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = currentBlockTimestamp;

  call.inputValues = [
    new ethereum.EventParam(
      "projectName",
      ethereum.Value.fromString(projectName)
    ),
    new ethereum.EventParam(
      "artistAddress",
      ethereum.Value.fromAddress(artistAddress)
    ),
    new ethereum.EventParam(
      "pricePerTokenInWei",
      ethereum.Value.fromUnsignedBigInt(pricePerTokenInWei)
    )
  ];

  handleAddProject(call);

  // Account created for artist
  assert.fieldEquals(
    ACCOUNT_ENTITY_TYPE,
    artistAddress.toHexString(),
    "id",
    artistAddress.toHexString()
  );

  // Contract setup in refreshContracts
  assertTestContractFields(
    contract.createdAt,
    currentBlockTimestamp,
    projectId.plus(BigInt.fromI32(1))
  );

  // Project created with default values
  assertNewProjectFields(
    TEST_CONTRACT_ADDRESS,
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
    currentBlockTimestamp
  );
});

test("GenArt721: Can add whitelisting to a contract that has not yet been indexed", () => {
  clearStore();
  const call = changetype<AddWhitelistedCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  const whitelistedAddress = randomAddressGenerator.generateRandomAddress();
  call.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(whitelistedAddress)
    )
  ];

  const nextProjectId = BigInt.fromI32(1);
  mockRefreshContractCalls(nextProjectId, new Map<string, string>());

  assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHexString());

  handleAddWhitelisted(call);

  assertTestContractFields(
    CURRENT_BLOCK_TIMESTAMP,
    CURRENT_BLOCK_TIMESTAMP,
    nextProjectId
  );

  const whitelistingId = generateWhitelistingId(
    TEST_CONTRACT_ADDRESS.toHexString(),
    whitelistedAddress.toHexString()
  );

  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    whitelistingId,
    "contract",
    TEST_CONTRACT_ADDRESS.toHexString()
  );
  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    whitelistingId,
    "account",
    whitelistedAddress.toHexString()
  );
});

test("GenArt721: Can remove whitelisting", () => {
  clearStore();
  // Populate store with an existing whitelisting
  addTestContractToStore(BigInt.fromI32(1));

  const whitelistedAddress = randomAddressGenerator.generateRandomAddress();
  const whitelistedAccount = new Account(whitelistedAddress.toHexString());
  whitelistedAccount.save();

  const whitelistingId = generateWhitelistingId(
    TEST_CONTRACT_ADDRESS.toHexString(),
    whitelistedAddress.toHexString()
  );
  const whitelisting = new Whitelisting(whitelistingId);
  whitelisting.account = whitelistedAddress.toHexString();
  whitelisting.contract = TEST_CONTRACT_ADDRESS.toHexString();
  whitelisting.save();

  // Make sure the whitelisting is in the store
  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    whitelistingId,
    "id",
    whitelistingId
  );

  const callToRemoveWhitelist = changetype<RemoveWhitelistedCall>(
    newMockCall()
  );

  callToRemoveWhitelist.to = TEST_CONTRACT_ADDRESS;
  callToRemoveWhitelist.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  callToRemoveWhitelist.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(whitelistedAddress)
    )
  ];

  handleRemoveWhitelisted(callToRemoveWhitelist);

  // Make sure the whitelisting is not in the store
  assert.notInStore(WHITELISTING_ENTITY_TYPE, whitelistingId);
});

test("GenArt721: Can update render provider address", () => {
  clearStore();
  assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHexString());

  mockRefreshContractCalls(BigInt.fromI32(1), new Map<string, string>());

  const call = changetype<UpdateArtblocksAddressCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  call.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(TEST_CONTRACT.renderProviderAddress)
    )
  ];

  handleUpdateArtblocksAddress(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    TEST_CONTRACT.renderProviderAddress.toHexString()
  );
});

test("GenArt721: Can update render provider percentage", () => {
  clearStore();
  const call = changetype<UpdateArtblocksPercentageCall>(newMockCall());

  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  call.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromUnsignedBigInt(TEST_CONTRACT.renderProviderPercentage)
    )
  ];

  mockRefreshContractCalls(BigInt.fromI32(1), new Map<string, string>());

  handleUpdateArtblocksPercentage(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderPercentage",
    TEST_CONTRACT.renderProviderPercentage.toString()
  );
});

test("GenArt721: Can add project scripts", () => {
  clearStore();
  // Add project to store
  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  addNewProjectToStore(
    projectId,
    "Test Project",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI64(i64(1e18)),
    true,
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(100))
  );

  // Set up contract call mocks for a first script
  const script1 = "test script";
  const overrides = new Map<string, string>();
  overrides.set("scriptCount", "1");
  mockProjectScriptInfoCall(projectId, overrides);
  mockProjectScriptByIndex(
    TEST_CONTRACT_ADDRESS,
    projectId,
    BigInt.fromI32(0),
    script1
  );

  // Set up handler call input for first script
  const addProjectScriptCall1 = changetype<AddProjectScriptCall>(newMockCall());
  addProjectScriptCall1.to = TEST_CONTRACT_ADDRESS;
  addProjectScriptCall1.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  addProjectScriptCall1.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam("_script", ethereum.Value.fromString(script1))
  ];

  handleAddProjectScript(addProjectScriptCall1);

  // Assert first project script is indexed
  const projectScriptId1 = generateProjectScriptId(
    fullProjectId,
    BigInt.fromI32(0)
  );

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "script", script1);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );

  assert.fieldEquals(
    PROJECT_SCRIPT_ENTITY_TYPE,
    projectScriptId1,
    "project",
    fullProjectId
  );
  assert.fieldEquals(
    PROJECT_SCRIPT_ENTITY_TYPE,
    projectScriptId1,
    "script",
    script1
  );

  // Set up contract call mocks for a second script
  const script2 = "test script 2";
  overrides.set("scriptCount", "2");
  mockProjectScriptInfoCall(projectId, overrides);
  mockProjectScriptByIndex(
    TEST_CONTRACT_ADDRESS,
    projectId,
    BigInt.fromI32(1),
    script2
  );

  // Set up handler call input for second script
  const newCurrentBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(1)
  );
  const addProjectScriptCall2 = changetype<AddProjectScriptCall>(newMockCall());
  addProjectScriptCall2.to = TEST_CONTRACT_ADDRESS;
  addProjectScriptCall2.block.timestamp = newCurrentBlockTimestamp;
  addProjectScriptCall2.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam("_script", ethereum.Value.fromString(script2))
  ];

  handleAddProjectScript(addProjectScriptCall2);

  // Assert both first and second scripts have been indexed
  const projectScriptId2 = generateProjectScriptId(
    fullProjectId,
    BigInt.fromI32(1)
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "script",
    script1 + script2
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    newCurrentBlockTimestamp.toString()
  );

  assert.fieldEquals(
    PROJECT_SCRIPT_ENTITY_TYPE,
    projectScriptId1,
    "project",
    fullProjectId
  );
  assert.fieldEquals(
    PROJECT_SCRIPT_ENTITY_TYPE,
    projectScriptId1,
    "script",
    script1
  );

  assert.fieldEquals(
    PROJECT_SCRIPT_ENTITY_TYPE,
    projectScriptId2,
    "project",
    fullProjectId
  );
  assert.fieldEquals(
    PROJECT_SCRIPT_ENTITY_TYPE,
    projectScriptId2,
    "script",
    script2
  );
});

test("GenArt721: Can clear a Token IPFS image uri", () => {
  clearStore();
  const tokenId = BigInt.fromI32(0);
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

  const token = addNewTokenToStore(
    TEST_CONTRACT_ADDRESS,
    tokenId,
    BigInt.fromI32(0)
  );

  const tokenUri = "https://token.artblocks.io/" + tokenId.toString();
  mockTokenURICall(tokenId, tokenUri);

  const call = changetype<ClearTokenIpfsImageUriCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  call.inputValues = [
    new ethereum.EventParam(
      "_tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  ];

  handleClearTokenIpfsImageUri(call);

  assert.fieldEquals(TOKEN_ENTITY_TYPE, fullTokenId, "uri", tokenUri);
});

// Under the hood this does the exact same thing as the above test
// and just relies on the contract to get ther proper token URI
test("GenArt721: Can override token dynamic image with IPFS link", () => {
  clearStore();
  const tokenId = BigInt.fromI32(0);
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

  const token = addNewTokenToStore(
    TEST_CONTRACT_ADDRESS,
    tokenId,
    BigInt.fromI32(0)
  );
  token.uri = "";
  token.save();

  const ipfsHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
  const call = changetype<OverrideTokenDynamicImageWithIpfsLinkCall>(
    newMockCall()
  );
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  call.inputValues = [
    new ethereum.EventParam(
      "_tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    ),
    new ethereum.EventParam("_ipfsHash", ethereum.Value.fromString(ipfsHash))
  ];
  mockTokenURICall(tokenId, ipfsHash);

  handleOverrideTokenDynamicImageWithIpfsLink(call);

  assert.fieldEquals(TOKEN_ENTITY_TYPE, fullTokenId, "uri", ipfsHash);
});

test("GenArt721: Can remove a project's last script", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const artistAddress = randomAddressGenerator.generateRandomAddress();
  const projectName = "Test Project";
  const pricePerTokenInWei = BigInt.fromI64(i64(1e18));

  const script0 = "test script 1";
  const script1 = "test script 2";

  addNewProjectToStore(
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
    true,
    CURRENT_BLOCK_TIMESTAMP
  );
  const project = changetype<Project>(Project.load(fullProjectId));
  project.script = script0 + script1;
  project.scriptCount = BigInt.fromI32(2);
  project.save();

  const index0 = BigInt.fromI32(0);
  const projectScript0 = new ProjectScript(
    generateProjectScriptId(fullProjectId, index0)
  );
  projectScript0.project = fullProjectId;
  projectScript0.index = index0;
  projectScript0.script = script0;
  projectScript0.save();

  const index1 = BigInt.fromI32(1);
  const projectScript1 = new ProjectScript(
    generateProjectScriptId(fullProjectId, index1)
  );
  projectScript1.project = fullProjectId;
  projectScript1.index = index1;
  projectScript1.script = script1;
  projectScript1.save();

  const scriptInfoReturnOverrides = new Map<string, string>();
  scriptInfoReturnOverrides.set("scriptCount", "1");
  mockProjectScriptInfoCall(projectId, scriptInfoReturnOverrides);
  mockProjectScriptByIndex(TEST_CONTRACT_ADDRESS, projectId, index0, script0);

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<RemoveProjectLastScriptCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];

  handleRemoveProjectLastScript(call);

  assert.fieldEquals(
    PROJECT_SCRIPT_ENTITY_TYPE,
    projectScript0.id,
    "script",
    script0
  );
  assert.notInStore(PROJECT_SCRIPT_ENTITY_TYPE, projectScript1.id);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "script", script0);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can toggle if a project is active", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "active", "false");

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<ToggleProjectIsActiveCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];

  handleToggleProjectIsActive(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "active", "true");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "activatedAt",
    updateCallBlockTimestamp.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can toggle if a project is dynamic", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "dynamic", "true");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "useHashString",
    "true"
  );

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<ToggleProjectIsDynamicCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];

  handleToggleProjectIsDynamic(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "dynamic", "false");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "useHashString",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can toggle if a project is locked", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "locked", "false");

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<ToggleProjectIsLockedCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];

  handleToggleProjectIsLocked(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "locked", "true");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can toggle if a project is paused", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "paused", "true");

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<ToggleProjectIsPausedCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];

  handleToggleProjectIsPaused(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "paused", "false");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can toggle if a project uses Ipfs", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "useIpfs", "false");

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<ToggleProjectUseIpfsForStaticCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];

  handleToggleProjectUseIpfsForStatic(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "useIpfs", "true");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a projects additional payee info", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const project: Project = changetype<Project>(Project.load(fullProjectId));
  assert.assertTrue(project.additionalPayee === null);

  const additionalPayeeAddress = randomAddressGenerator.generateRandomAddress();
  const additionalPayeePercentage = BigInt.fromI32(20);

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<UpdateProjectAdditionalPayeeInfoCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_additionalPayee",
      ethereum.Value.fromAddress(additionalPayeeAddress)
    ),
    new ethereum.EventParam(
      "_additionalPayeePercentage",
      ethereum.Value.fromUnsignedBigInt(additionalPayeePercentage)
    )
  ];

  handleUpdateProjectAdditionalPayeeInfo(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "additionalPayee",
    additionalPayeeAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "additionalPayeePercentage",
    additionalPayeePercentage.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a projects artist address", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const artistAddress = randomAddressGenerator.generateRandomAddress();
  const newArtistAddress = randomAddressGenerator.generateRandomAddress();
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

  assert.assertTrue(artistAddress !== newArtistAddress);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "artistAddress",
    artistAddress.toHexString()
  );

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<UpdateProjectArtistAddressCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_artistAddress",
      ethereum.Value.fromAddress(newArtistAddress)
    )
  ];

  handleUpdateProjectArtistAddress(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "artistAddress",
    newArtistAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "artist",
    newArtistAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a projects artist name", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const project: Project = changetype<Project>(Project.load(fullProjectId));
  assert.assertTrue(project.artistName === null);

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );

  const artistName = "New Artist Name";
  const call = changetype<UpdateProjectArtistNameCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_projectArtistName",
      ethereum.Value.fromString(artistName)
    )
  ];

  handleUpdateProjectArtistName(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "artistName",
    artistName
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a projects base Ipfs URI", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const ipfsHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );

  const call = changetype<UpdateProjectBaseIpfsURICall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_projectBaseIpfsURI",
      ethereum.Value.fromString(ipfsHash)
    )
  ];

  handleUpdateProjectBaseIpfsURI(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "baseIpfsUri",
    ipfsHash
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a project's base URI", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const newBaseUri = "https://new-base-uri.com/";

  const call = changetype<UpdateProjectBaseURICall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_newBaseURI",
      ethereum.Value.fromString(newBaseUri)
    )
  ];

  handleUpdateProjectBaseURI(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "baseUri", newBaseUri);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a projects description", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const projectDescription = "This is a test project";

  const call = changetype<UpdateProjectDescriptionCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_projectDescription",
      ethereum.Value.fromString(projectDescription)
    )
  ];

  handleUpdateProjectDescription(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "description",
    projectDescription
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a projects IPFS Hash", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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
  const ipfsHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );

  const call = changetype<UpdateProjectIpfsHashCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam("_ipfsHash", ethereum.Value.fromString(ipfsHash))
  ];

  handleUpdateProjectIpfsHash(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "ipfsHash", ipfsHash);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a project license", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const projectLicense = "NIFTY";

  const call = changetype<UpdateProjectLicenseCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_projectLicense",
      ethereum.Value.fromString(projectLicense)
    )
  ];

  handleUpdateProjectLicense(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "license",
    projectLicense
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a project max invocations", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const maxInvocations = BigInt.fromI32(50);

  const call = changetype<UpdateProjectMaxInvocationsCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_maxInvocations",
      ethereum.Value.fromUnsignedBigInt(maxInvocations)
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "maxInvocations",
    DEFAULT_PROJECT_VALUES.maxInvocations.toString()
  );

  handleUpdateProjectMaxInvocations(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "maxInvocations",
    maxInvocations.toString()
  );
  // TODO: Update test to chack that complete is set to true if we update
  // max invocations to the current invocations
  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "complete", "false");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a project name", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const newProjectName = "New Test Project";

  const call = changetype<UpdateProjectNameCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_projectName",
      ethereum.Value.fromString(newProjectName)
    )
  ];

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "name", projectName);

  handleUpdateProjectName(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "name",
    newProjectName
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a project price per token in wei", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const newPricePerTokenInWei = BigInt.fromI64(i64(2e18));

  const call = changetype<UpdateProjectPricePerTokenInWeiCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_pricePerTokenInWei",
      ethereum.Value.fromUnsignedBigInt(newPricePerTokenInWei)
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "pricePerTokenInWei",
    pricePerTokenInWei.toString()
  );

  handleUpdateProjectPricePerTokenInWei(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "pricePerTokenInWei",
    newPricePerTokenInWei.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a project script", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const artistAddress = randomAddressGenerator.generateRandomAddress();
  const projectName = "Test Project";
  const pricePerTokenInWei = BigInt.fromI64(i64(1e18));

  const initialScriptValue = "test script 1";

  addNewProjectToStore(
    projectId,
    projectName,
    artistAddress,
    pricePerTokenInWei,
    true,
    CURRENT_BLOCK_TIMESTAMP
  );
  const project = changetype<Project>(Project.load(fullProjectId));
  project.script = initialScriptValue;
  project.save();

  const index0 = BigInt.fromI32(0);
  const projectScript = new ProjectScript(
    generateProjectScriptId(fullProjectId, index0)
  );
  projectScript.project = fullProjectId;
  projectScript.index = index0;
  projectScript.script = initialScriptValue;
  projectScript.save();

  const newScriptValue = "test script 1 updated";

  const scriptInfoReturnOverrides = new Map<string, string>();
  scriptInfoReturnOverrides.set("scriptCount", "1");
  mockProjectScriptInfoCall(projectId, scriptInfoReturnOverrides);
  mockProjectScriptByIndex(
    TEST_CONTRACT_ADDRESS,
    projectId,
    index0,
    newScriptValue
  );

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const call = changetype<UpdateProjectScriptCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_scriptId",
      ethereum.Value.fromUnsignedBigInt(index0)
    ),
    new ethereum.EventParam(
      "_script",
      ethereum.Value.fromString(newScriptValue)
    )
  ];

  handleUpdateProjectScript(call);

  assert.fieldEquals(
    PROJECT_SCRIPT_ENTITY_TYPE,
    projectScript.id,
    "script",
    newScriptValue
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "script",
    newScriptValue
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can handleUpdateProjectScriptJSON", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const scriptJSON = "{}";

  const call = changetype<UpdateProjectScriptJSONCall>(newMockCall());

  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_projectScriptJSON",
      ethereum.Value.fromString(scriptJSON)
    )
  ];

  handleUpdateProjectScriptJSON(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "scriptJSON",
    scriptJSON
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update project secondary market royalties", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const secondaryMarketRoyalty = BigInt.fromI32(8);

  const call = changetype<UpdateProjectSecondaryMarketRoyaltyPercentageCall>(
    newMockCall()
  );
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_secondMarketRoyalty",
      ethereum.Value.fromUnsignedBigInt(secondaryMarketRoyalty)
    )
  ];

  handleUpdateProjectSecondaryMarketRoyaltyPercentage(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "royaltyPercentage",
    secondaryMarketRoyalty.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721: Can update a project website", () => {
  clearStore();
  const projectId = BigInt.fromI32(0);
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

  const updateCallBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
    BigInt.fromI32(10)
  );
  const website = "https://www.test.com";

  const call = changetype<UpdateProjectWebsiteCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_projectWebsite",
      ethereum.Value.fromString(website)
    )
  ];

  handleUpdateProjectWebsite(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, fullProjectId, "website", website);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});
test("GenArt721: Can handle transfer", () => {
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

  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    generateTransferId(hash, logIndex),
    "blockHash",
    event.block.hash.toHexString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    generateTransferId(hash, logIndex),
    "blockNumber",
    event.block.number.toString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    generateTransferId(hash, logIndex),
    "blockTimestamp",
    event.block.timestamp.toString()
  );
});

test("GenArt721: Can handle mint transfer", () => {
  clearStore();
  const tokenId = BigInt.fromI32(0);
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

  const fromAddress = Address.zero();
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

  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    generateTransferId(hash, logIndex),
    "blockHash",
    event.block.hash.toHexString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    generateTransferId(hash, logIndex),
    "blockNumber",
    event.block.number.toString()
  );
  assert.fieldEquals(
    TRANSFER_ENTITY_TYPE,
    generateTransferId(hash, logIndex),
    "blockTimestamp",
    event.block.timestamp.toString()
  );
});

test("GenArt721: Can handle mint", () => {
  clearStore();
  // add contract to store
  const projectId = BigInt.fromI32(1);
  const tokenId = BigInt.fromI32(1000001);
  addTestContractToStore(projectId);
  mockShowTokenHashes(TEST_CONTRACT_ADDRESS, tokenId, TEST_TOKEN_HASH);
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
    ),
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_invocations",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
    ),
    new ethereum.EventParam(
      "_value",
      ethereum.Value.fromUnsignedBigInt(pricePerTokenInWei)
    )
  ];

  handleMint(event);

  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    fullTokenId,
    "owner",
    toAddress.toHexString()
  );

  assert.fieldEquals(
    PRIMARY_PURCHASE_DETAILS_ENTITY_TYPE,
    fullTokenId,
    "token",
    fullTokenId
  );

  assert.fieldEquals(
    PRIMARY_PURCHASE_DETAILS_ENTITY_TYPE,
    fullTokenId,
    "minterAddress",
    TEST_CONTRACT_ADDRESS.toHexString()
  );

  assert.fieldEquals(
    PRIMARY_PURCHASE_DETAILS_ENTITY_TYPE,
    fullTokenId,
    "currencySymbol",
    "ETH"
  );

  assert.fieldEquals(
    PRIMARY_PURCHASE_DETAILS_ENTITY_TYPE,
    fullTokenId,
    "currencyAddress",
    Address.zero().toHexString()
  );
});
export {
  handleAddProject,
  handleAddWhitelisted,
  handleRemoveWhitelisted,
  handleUpdateArtblocksAddress,
  handleUpdateArtblocksPercentage,
  handleAddProjectScript,
  handleClearTokenIpfsImageUri,
  handleOverrideTokenDynamicImageWithIpfsLink,
  handleRemoveProjectLastScript,
  handleToggleProjectIsActive,
  handleToggleProjectIsDynamic,
  handleToggleProjectIsLocked,
  handleToggleProjectIsPaused,
  handleToggleProjectUseIpfsForStatic,
  handleUpdateProjectAdditionalPayeeInfo,
  handleUpdateProjectArtistAddress,
  handleUpdateProjectArtistName,
  handleUpdateProjectBaseIpfsURI,
  handleUpdateProjectBaseURI,
  handleUpdateProjectDescription,
  handleUpdateProjectIpfsHash,
  handleUpdateProjectLicense,
  handleUpdateProjectMaxInvocations,
  handleUpdateProjectName,
  handleUpdateProjectPricePerTokenInWei,
  handleUpdateProjectWebsite,
  handleUpdateProjectSecondaryMarketRoyaltyPercentage,
  handleUpdateProjectScript,
  handleUpdateProjectScriptJSON,
  handleMint
};
