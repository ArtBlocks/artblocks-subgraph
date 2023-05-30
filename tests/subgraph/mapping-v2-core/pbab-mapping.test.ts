import {
  assert,
  clearStore,
  test,
  newMockCall,
  newMockEvent,
  createMockedFunction
} from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  ACCOUNT_ENTITY_TYPE,
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  WHITELISTING_ENTITY_TYPE,
  PROJECT_SCRIPT_ENTITY_TYPE,
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
  TOKEN_ENTITY_TYPE,
  TRANSFER_ENTITY_TYPE,
  addNewTokenToStore,
  IPFS_CID,
  PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
  IPFS_CID2
} from "../shared-helpers";

import {
  mockRefreshContractCalls,
  mockProjectScriptInfoCall,
  mockProjectTokenInfoCallWithDefaults,
  mockProjectDetailsCallWithDefaults,
  addNewProjectToStore
} from "./helpers";

import {
  Account,
  Project,
  ProjectScript,
  Token,
  Contract,
  Whitelisting
} from "../../../generated/schema";
import {
  AddProjectCall,
  AddWhitelistedCall,
  RemoveWhitelistedCall,
  AddMintWhitelistedCall,
  UpdateRandomizerAddressCall,
  UpdateRenderProviderAddressCall,
  UpdateRenderProviderPercentageCall,
  AddProjectScriptCall,
  RemoveProjectLastScriptCall,
  ToggleProjectIsActiveCall,
  ToggleProjectIsLockedCall,
  ToggleProjectIsPausedCall,
  UpdateProjectAdditionalPayeeInfoCall,
  UpdateProjectArtistAddressCall,
  UpdateProjectArtistNameCall,
  UpdateProjectBaseURICall,
  UpdateProjectCurrencyInfoCall,
  UpdateProjectDescriptionCall,
  UpdateProjectIpfsHashCall,
  UpdateProjectLicenseCall,
  UpdateProjectMaxInvocationsCall,
  UpdateProjectNameCall,
  UpdateProjectPricePerTokenInWeiCall,
  UpdateProjectWebsiteCall,
  UpdateProjectSecondaryMarketRoyaltyPercentageCall,
  RemoveMintWhitelistedCall,
  UpdateProjectScriptCall,
  UpdateProjectScriptJSONCall,
  Transfer
} from "../../../generated/GenArt721Core2PBAB/GenArt721Core2PBAB";

import {
  ExternalAssetDependencyUpdated,
  ExternalAssetDependencyRemoved,
  GatewayUpdated,
  ProjectExternalAssetDependenciesLocked,
  GenArt721Core2EngineFlex
} from "../../../generated/GenArt721Core2EngineFlex/GenArt721Core2EngineFlex";

import {
  handleAddProject,
  handleAddWhitelisted,
  handleRemoveWhitelisted,
  handleAddMintWhitelisted,
  handleUpdateRandomizerAddress,
  handleUpdateRenderProviderAddress,
  handleUpdateRenderProviderPercentage,
  handleAddProjectScript,
  handleRemoveProjectLastScript,
  handleToggleProjectIsActive,
  handleToggleProjectIsLocked,
  handleToggleProjectIsPaused,
  handleUpdateProjectAdditionalPayeeInfo,
  handleUpdateProjectArtistAddress,
  handleUpdateProjectArtistName,
  handleUpdateProjectBaseURI,
  handleUpdateProjectCurrencyInfo,
  handleUpdateProjectDescription,
  handleUpdateProjectIpfsHash,
  handleUpdateProjectLicense,
  handleUpdateProjectMaxInvocations,
  handleUpdateProjectName,
  handleUpdateProjectPricePerTokenInWei,
  handleUpdateProjectWebsite,
  handleUpdateProjectSecondaryMarketRoyaltyPercentage,
  handleRemoveMintWhitelisted,
  handleUpdateProjectScript,
  handleUpdateProjectScriptJSON,
  handleExternalAssetDependencyUpdated,
  handleExternalAssetDependencyRemoved,
  handleGatewayUpdated,
  handleProjectExternalAssetDependenciesLocked,
  handleTransfer
} from "../../../src/mapping-v2-core";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateTransferId,
  generateWhitelistingId
} from "../../../src/helpers";

import { FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES } from "../../../src/constants";

const randomAddressGenerator = new RandomAddressGenerator();

test("GenArt721Core2PBAB: Can add a new project when its contract has not yet been indexed", () => {
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

test("GenArt721Core2PBAB: Can add a new project when its contract has been indexed", () => {
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

test("GenArt721Core2PBAB: Can add whitelisting to a contract that has not yet been indexed", () => {
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

test("GenArt721Core2PBAB: Can remove whitelisting", () => {
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

test("GenArt721Core2PBAB: Can add a new whitelisted minter to contract", () => {
  clearStore();
  const call = changetype<AddMintWhitelistedCall>(newMockCall());
  const minterAddress = randomAddressGenerator.generateRandomAddress();

  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  call.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(minterAddress)
    )
  ];

  mockRefreshContractCalls(BigInt.fromI32(1), new Map<string, string>());

  handleAddMintWhitelisted(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "mintWhitelisted",
    "[" + minterAddress.toHexString() + "]"
  );
});

test("GenArt721Core2PBAB: Can remove whitelisted minter from contract", () => {
  clearStore();
  const minterAddress = randomAddressGenerator.generateRandomAddress();
  const minterAddressToBeRemoved = randomAddressGenerator.generateRandomAddress();

  const contract = addTestContractToStore(BigInt.fromI32(1));
  contract.mintWhitelisted = [minterAddress, minterAddressToBeRemoved];
  contract.save();

  const removeWhitelistCall = changetype<RemoveMintWhitelistedCall>(
    newMockCall()
  );
  removeWhitelistCall.to = TEST_CONTRACT_ADDRESS;
  removeWhitelistCall.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  removeWhitelistCall.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(minterAddressToBeRemoved)
    )
  ];

  handleRemoveMintWhitelisted(removeWhitelistCall);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "mintWhitelisted",
    "[" + minterAddress.toHexString() + "]"
  );
});

test("GenArt721Core2PBAB: Can update randomizer address", () => {
  clearStore();
  assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHexString());

  mockRefreshContractCalls(BigInt.fromI32(1), new Map<string, string>());

  const call = changetype<UpdateRandomizerAddressCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  call.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(TEST_CONTRACT.randomizerContract)
    )
  ];

  handleUpdateRandomizerAddress(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "randomizerContract",
    TEST_CONTRACT.randomizerContract.toHexString()
  );
});

test("GenArt721Core2PBAB: Can update render provider address", () => {
  clearStore();
  assert.notInStore(CONTRACT_ENTITY_TYPE, TEST_CONTRACT_ADDRESS.toHexString());

  mockRefreshContractCalls(BigInt.fromI32(1), new Map<string, string>());

  const call = changetype<UpdateRenderProviderAddressCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  call.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(TEST_CONTRACT.renderProviderAddress)
    )
  ];

  handleUpdateRenderProviderAddress(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderAddress",
    TEST_CONTRACT.renderProviderAddress.toHexString()
  );
});

test("GenArt721Core2PBAB: Can update render provider percentage", () => {
  clearStore();
  const call = changetype<UpdateRenderProviderPercentageCall>(newMockCall());

  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  call.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromUnsignedBigInt(TEST_CONTRACT.renderProviderPercentage)
    )
  ];

  mockRefreshContractCalls(BigInt.fromI32(1), new Map<string, string>());

  handleUpdateRenderProviderPercentage(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "renderProviderPercentage",
    TEST_CONTRACT.renderProviderPercentage.toString()
  );
});

test("GenArt721Core2PBAB: Can add project scripts", () => {
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

test("GenArt721Core2PBAB: Can remove a project's last script", () => {
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

test("GenArt721Core2PBAB: Can toggle if a project is active", () => {
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

test("GenArt721Core2PBAB: Can toggle if a project is locked", () => {
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

test("GenArt721Core2PBAB: Can toggle if a project is paused", () => {
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

test("GenArt721Core2PBAB: Can update a projects additional payee info", () => {
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

test("GenArt721Core2PBAB: Can update a projects artist address", () => {
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

test("GenArt721Core2PBAB: Can update a projects artist name", () => {
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

test("GenArt721Core2PBAB: Can update a project's base URI", () => {
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

test("GenArt721Core2PBAB: Can update a projects currency info", () => {
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
  const currencySymbol = "DAI";
  const currencyAddress = randomAddressGenerator.generateRandomAddress();

  const call = changetype<UpdateProjectCurrencyInfoCall>(newMockCall());
  call.to = TEST_CONTRACT_ADDRESS;
  call.block.timestamp = updateCallBlockTimestamp;
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_currencySymbol",
      ethereum.Value.fromString(currencySymbol)
    ),
    new ethereum.EventParam(
      "_currencyAddress",
      ethereum.Value.fromAddress(currencyAddress)
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "currencySymbol",
    DEFAULT_PROJECT_VALUES.currencySymbol
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "currencyAddress",
    DEFAULT_PROJECT_VALUES.currencyAddress.toHexString()
  );

  handleUpdateProjectCurrencyInfo(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "currencySymbol",
    currencySymbol
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "currencyAddress",
    currencyAddress.toHexString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    updateCallBlockTimestamp.toString()
  );
});

test("GenArt721Core2PBAB: Can update a projects description", () => {
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

test("GenArt721Core2PBAB: Can update a projects IPFS Hash", () => {
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
  const ipfsHash = IPFS_CID;

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

test("GenArt721Core2PBAB: Can update a project license", () => {
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

test("GenArt721Core2PBAB: Can update a project max invocations", () => {
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

test("GenArt721Core2PBAB: Can update a project name", () => {
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

test("GenArt721Core2PBAB: Can update a project price per token in wei", () => {
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

test("GenArt721Core2PBAB: Can update a project script", () => {
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

test("GenArt721Core2PBAB: Can handleUpdateProjectScriptJSON", () => {
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

test("GenArt721Core2PBAB: Can update project secondary market royalties", () => {
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

test("GenArt721Core2PBAB: Can update a project website", () => {
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

test("GenArt721Core2PBAB: Can handle transfer", () => {
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

test("GenArt721Core2PBAB: Can handle mint transfer", () => {
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

test("GenArt721Core2EngineFlex: Can add/update a project external asset dependency", () => {
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

  const event: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _index0 = BigInt.zero();
  const _dependencyType0 = BigInt.zero();
  const _externalAssetDependencyCount0 = BigInt.fromI32(1);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    BigInt.fromI32(0).toString()
  );

  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index0)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
    )
  ];

  // add event
  handleExternalAssetDependencyUpdated(event);
  // checks project external asset dependency count
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    _externalAssetDependencyCount0.toString()
  );
  // checks project's updatedAt
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
  // checks project external asset dependency cid
  assert.fieldEquals(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectId + "-" + _index0.toString(),
    "cid",
    IPFS_CID
  );
  // checks project external asset dependency dependency type
  assert.fieldEquals(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectId + "-" + _index0.toString(),
    "dependencyType",
    FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[_dependencyType0.toI32()]
  );
  // checks project external asset dependency project relationship
  assert.fieldEquals(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectId + "-" + _index0.toString(),
    "project",
    fullProjectId
  );

  const updateEvent: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  updateEvent.address = TEST_CONTRACT_ADDRESS;
  updateEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _dependencyType1 = BigInt.fromI32(1);
  const _externalAssetDependencyCount1 = BigInt.fromI32(2);
  updateEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index0)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID2)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType1)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount1)
    )
  ];
  handleExternalAssetDependencyUpdated(updateEvent);

  // checks project external asset dependency cid
  assert.fieldEquals(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectId + "-" + _index0.toString(),
    "cid",
    IPFS_CID2
  );
  // checks project external asset dependency dependency type
  assert.fieldEquals(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectId + "-" + _index0.toString(),
    "dependencyType",
    FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[_dependencyType1.toI32()]
  );

  // checks project external asset dependency count
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    _externalAssetDependencyCount1.toString()
  );
});

test("GenArt721Core2EngineFlex: Can remove a project external asset dependency", () => {
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

  const event: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _index0 = BigInt.zero();
  const _dependencyType0 = BigInt.zero();
  const _externalAssetDependencyCount0 = BigInt.fromI32(1);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    BigInt.fromI32(0).toString()
  );

  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index0)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
    )
  ];

  const event2: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  event2.address = TEST_CONTRACT_ADDRESS;
  event2.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _externalAssetDependencyCount1 = BigInt.fromI32(2);
  const _index1 = BigInt.fromI32(1);

  event2.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index1)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID2)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount1)
    )
  ];

  // add events
  handleExternalAssetDependencyUpdated(event);
  handleExternalAssetDependencyUpdated(event2);

  //checks project external asset dependency count
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    _externalAssetDependencyCount1.toString()
  );

  assert.entityCount(PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE, 2);

  const removeEvent: ExternalAssetDependencyRemoved = changetype<
    ExternalAssetDependencyRemoved
  >(newMockEvent());
  removeEvent.address = TEST_CONTRACT_ADDRESS;
  removeEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  removeEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
    )
  ];

  let tupleArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(IPFS_CID2),
    ethereum.Value.fromUnsignedBigInt(_dependencyType0)
  ];
  let tuple: ethereum.Tuple = changetype<ethereum.Tuple>(tupleArray);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectExternalAssetDependencyByIndex",
    "projectExternalAssetDependencyByIndex(uint256,uint256):((string,uint8))"
  )
    .withArgs([
      ethereum.Value.fromUnsignedBigInt(projectId),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
    ])
    .returns([ethereum.Value.fromTuple(tuple)]);

  handleExternalAssetDependencyRemoved(removeEvent);

  // // checks project external asset dependency count
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    _externalAssetDependencyCount0.toString()
  );

  // checks that removed project external asset dependency is not in store
  // note that regardless of what initial index is removed, the removed index gets moved to the last index
  assert.notInStore(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectId + "-" + _index1.toString()
  );

  // checks that asset at index 0 now has data that was formerly at index 1
  assert.fieldEquals(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectId + "-" + _index0.toString(),
    "cid",
    IPFS_CID2
  );
  assert.fieldEquals(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectId + "-" + _index0.toString(),
    "dependencyType",
    FLEX_CONTRACT_EXTERNAL_ASSET_DEP_TYPES[_dependencyType0.toI32()]
  );

  // checks that entity count is correct
  assert.entityCount(PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE, 1);
});

test("GenArt721Core2EngineFlex: Can update a contract preferred IPFS/ARWEAVE gateway", () => {
  clearStore();
  const contract = addTestContractToStore(BigInt.zero());

  const event: GatewayUpdated = changetype<GatewayUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _gateway = "https://ipfs.io/ipfs/";
  const _dependencyType = BigInt.fromI32(0);
  event.parameters = [
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType)
    ),
    new ethereum.EventParam("_gateway", ethereum.Value.fromString(_gateway))
  ];

  // add event
  handleGatewayUpdated(event);
  const loadedContractAfterEvent = Contract.load(contract.id);
  // checks contract preferredIPFSGateway
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_CONTRACT_ADDRESS.toHexString(),
    "preferredIPFSGateway",
    _gateway.toString()
  );

  if (loadedContractAfterEvent) {
    // checks contract preferredArweaveGateway
    assert.assertNull(loadedContractAfterEvent.preferredArweaveGateway);
  }
});

test("GenArt721Core2EngineFlex: Can lock a project's external asset dependencies", () => {
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

  const event: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _index0 = BigInt.zero();
  const _dependencyType0 = BigInt.zero();
  const _externalAssetDependencyCount0 = BigInt.fromI32(1);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    BigInt.fromI32(0).toString()
  );

  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index0)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
    )
  ];

  // add event
  handleExternalAssetDependencyUpdated(event);
  // checks project external asset dependency count
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    _externalAssetDependencyCount0.toString()
  );

  // checks project external asset dependency lock status
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependenciesLocked",
    "false"
  );

  const lockEvent: ProjectExternalAssetDependenciesLocked = changetype<
    ProjectExternalAssetDependenciesLocked
  >(newMockEvent());
  lockEvent.address = TEST_CONTRACT_ADDRESS;
  lockEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  lockEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    )
  ];

  handleProjectExternalAssetDependenciesLocked(lockEvent);

  // checks project external asset dependency lock status
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependenciesLocked",
    "true"
  );
});

test("GenArt721Core2EngineFlex: Cannot add a project external asset dependency for a non-existant project", () => {
  clearStore();
  // Add project to store
  const projectId = BigInt.fromI32(0);
  const projectIdNotInStore = BigInt.fromI32(1);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );

  const fullProjectIdNotInStore = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectIdNotInStore
  );

  addNewProjectToStore(
    projectId,
    "Test Project",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI64(i64(1e18)),
    true,
    CURRENT_BLOCK_TIMESTAMP.minus(BigInt.fromI32(100))
  );

  const event: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _index0 = BigInt.zero();
  const _dependencyType0 = BigInt.zero();
  const _externalAssetDependencyCount0 = BigInt.fromI32(1);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    BigInt.fromI32(0).toString()
  );

  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectIdNotInStore)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index0)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
    )
  ];

  // add event
  handleExternalAssetDependencyUpdated(event);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    BigInt.fromI32(0).toString()
  );
  assert.notInStore(
    PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE,
    fullProjectIdNotInStore + "-0"
  );
});

test("GenArt721Core2EngineFlex: Cannot remove a project external asset dependency for a non-existant project", () => {
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

  const event: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _index0 = BigInt.zero();
  const _dependencyType0 = BigInt.zero();
  const _externalAssetDependencyCount0 = BigInt.fromI32(1);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    BigInt.fromI32(0).toString()
  );

  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index0)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
    )
  ];

  const event2: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  event2.address = TEST_CONTRACT_ADDRESS;
  event2.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _externalAssetDependencyCount1 = BigInt.fromI32(2);
  const _index1 = BigInt.fromI32(1);

  event2.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index1)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID2)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount1)
    )
  ];

  // add events
  handleExternalAssetDependencyUpdated(event);
  handleExternalAssetDependencyUpdated(event2);

  //checks project external asset dependency count
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    _externalAssetDependencyCount1.toString()
  );

  assert.entityCount(PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE, 2);

  const projectIdNotInStore = BigInt.fromI32(1);
  const removeEvent: ExternalAssetDependencyRemoved = changetype<
    ExternalAssetDependencyRemoved
  >(newMockEvent());
  removeEvent.address = TEST_CONTRACT_ADDRESS;
  removeEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  removeEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectIdNotInStore)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
    )
  ];

  let tupleArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(IPFS_CID2),
    ethereum.Value.fromUnsignedBigInt(_dependencyType0)
  ];
  let tuple: ethereum.Tuple = changetype<ethereum.Tuple>(tupleArray);
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectExternalAssetDependencyByIndex",
    "projectExternalAssetDependencyByIndex(uint256,uint256):((string,uint8))"
  )
    .withArgs([
      ethereum.Value.fromUnsignedBigInt(projectIdNotInStore),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
    ])
    .returns([ethereum.Value.fromTuple(tuple)]);

  handleExternalAssetDependencyRemoved(removeEvent);

  // checks project external asset dependency count
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    _externalAssetDependencyCount1.toString()
  );

  // checks that entity count is correct
  assert.entityCount(PROJECT_EXTERNAL_ASSET_DEPENDENCY_ENTITY_TYPE, 2);
});

test("GenArt721Core2EngineFlex: Cannot lock a non-existant project's external asset dependencies", () => {
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

  const event: ExternalAssetDependencyUpdated = changetype<
    ExternalAssetDependencyUpdated
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const _index0 = BigInt.zero();
  const _dependencyType0 = BigInt.zero();
  const _externalAssetDependencyCount0 = BigInt.fromI32(1);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    BigInt.fromI32(0).toString()
  );

  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_index",
      ethereum.Value.fromUnsignedBigInt(_index0)
    ),
    new ethereum.EventParam("_cid", ethereum.Value.fromString(IPFS_CID)),
    new ethereum.EventParam(
      "_dependencyType",
      ethereum.Value.fromUnsignedBigInt(_dependencyType0)
    ),
    new ethereum.EventParam(
      "_externalAssetDependencyCount",
      ethereum.Value.fromUnsignedBigInt(_externalAssetDependencyCount0)
    )
  ];

  // add event
  handleExternalAssetDependencyUpdated(event);
  // checks project external asset dependency count
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependencyCount",
    _externalAssetDependencyCount0.toString()
  );

  // checks project external asset dependency lock status
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependenciesLocked",
    "false"
  );

  const lockEvent: ProjectExternalAssetDependenciesLocked = changetype<
    ProjectExternalAssetDependenciesLocked
  >(newMockEvent());
  lockEvent.address = TEST_CONTRACT_ADDRESS;
  lockEvent.block.timestamp = CURRENT_BLOCK_TIMESTAMP;

  const projectIdNotInStore = BigInt.fromI32(1);

  lockEvent.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectIdNotInStore)
    )
  ];

  handleProjectExternalAssetDependenciesLocked(lockEvent);

  // checks project external asset dependency lock status
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "externalAssetDependenciesLocked",
    "false"
  );
});

export {
  handleAddProject,
  handleAddWhitelisted,
  handleRemoveWhitelisted,
  handleAddMintWhitelisted,
  handleUpdateRandomizerAddress,
  handleUpdateRenderProviderAddress,
  handleUpdateRenderProviderPercentage,
  handleAddProjectScript,
  handleRemoveProjectLastScript,
  handleToggleProjectIsActive,
  handleToggleProjectIsLocked,
  handleToggleProjectIsPaused,
  handleUpdateProjectAdditionalPayeeInfo,
  handleUpdateProjectArtistAddress,
  handleUpdateProjectArtistName,
  handleUpdateProjectBaseURI,
  handleUpdateProjectCurrencyInfo,
  handleUpdateProjectDescription,
  handleUpdateProjectIpfsHash,
  handleUpdateProjectLicense,
  handleUpdateProjectMaxInvocations,
  handleUpdateProjectName,
  handleUpdateProjectPricePerTokenInWei,
  handleUpdateProjectWebsite,
  handleUpdateProjectSecondaryMarketRoyaltyPercentage,
  handleRemoveMintWhitelisted,
  handleUpdateProjectScript,
  handleUpdateProjectScriptJSON
};
