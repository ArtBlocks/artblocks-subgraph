import {
  assert,
  clearStore,
  test,
  newMockCall,
  createMockedFunction,
  log,
  logStore
} from "matchstick-as/assembly/index";
import {
  Address,
  BigInt,
  ethereum,
  crypto,
  ByteArray
} from "@graphprotocol/graph-ts";
import { meridianScript } from "../../meridianScript";
import {
  ACCOUNT_ENTITY_TYPE,
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  WHITELISTING_ENTITY_TYPE,
  PROJECTSCRIPT_ENTITY_TYPE,
  TOKEN_ENTITY_TYPE,
  DEFAULT_PROJECT_VALUES,
  booleanToString,
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
  mockProjectScriptByIndex
} from "../shared-mocks";

import {
  mockRefreshContractCalls,
  mockProjectTokenInfoCall,
  mockProjectScriptInfoCall,
  mockProjectDetailsCall,
  TEST_CONTRACT,
  mockProjectTokenInfoCallWithDefaults,
  mockProjectDetailsCallWithDefaults,
  TEST_CONTRACT_ADDRESS,
  TEST_CONTRACT_CREATED_AT,
  assertNewProjectFields,
  assertTestContractFields,
  addTestContractToStore,
  addNewProjectToStore,
  mockTokenURICall
} from "./helpers";

import {
  Account,
  Contract,
  Token,
  Whitelisting
} from "../../../generated/schema";
import {
  AddProjectCall,
  AddWhitelistedCall,
  RemoveWhitelistedCall,
  AddMintWhitelistedCall,
  UpdateRandomizerAddressCall,
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
  ToggleProjectUseHashStringCall,
  ToggleProjectUseIpfsForStaticCall,
  UpdateProjectAdditionalPayeeInfoCall,
  UpdateProjectArtistAddressCall,
  UpdateProjectArtistNameCall,
  UpdateProjectBaseIpfsURICall,
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
  UpdateProjectScriptJSONCall
} from "../../../generated/GenArt721Core/GenArt721Core";
import {
  handleAddProject,
  handleAddWhitelisted,
  handleRemoveWhitelisted,
  handleAddMintWhitelisted,
  handleUpdateRandomizerAddress,
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
  handleToggleProjectUseHashString,
  handleToggleProjectUseIpfsForStatic,
  handleUpdateProjectAdditionalPayeeInfo,
  handleUpdateProjectArtistAddress,
  handleUpdateProjectArtistName,
  handleUpdateProjectBaseIpfsURI,
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
} from "../../../src/mapping";
import {
  generateContractSpecificId,
  generateProjectScriptId,
  generateWhitelistingId
} from "../../../src/helpers";

const randomAddressGenerator = new RandomAddressGenerator();

test("Can add a new project when its contract has not yet been indexed", () => {
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

  clearStore();
});

test("Can add a new project when its contract has been indexed", () => {
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

  clearStore();
});

test("Can add whitelisting to a contract that has not yet been indexed", () => {
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

  clearStore();
});

test("Can remove whitelisting", () => {
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
  clearStore();
});

test("Can add a new whitelisted minter to contract", () => {
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
  clearStore();
});

test("Can remove whitelisted minter from contract", () => {
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

  clearStore();
});

test("Can update randomizer address", () => {
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

  clearStore();
});

test("Can update render provider address", () => {
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

  clearStore();
});

test("Can update render provider percentage", () => {
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

  clearStore();
});

test("Can add project scripts", () => {
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
    PROJECTSCRIPT_ENTITY_TYPE,
    projectScriptId1,
    "project",
    fullProjectId
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
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
    PROJECTSCRIPT_ENTITY_TYPE,
    projectScriptId1,
    "project",
    fullProjectId
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    projectScriptId1,
    "script",
    script1
  );

  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    projectScriptId2,
    "project",
    fullProjectId
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    projectScriptId2,
    "script",
    script2
  );

  clearStore();
});

test("Can clear a Token IPFS image uri", () => {
  const tokenId = BigInt.fromI32(0);
  const fullTokenId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    tokenId
  );

  const token = new Token(fullTokenId);
  token.save();

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

  clearStore();
});

// test("Can override token dynamic image with IPFS link", () => {
//   const call = changetype<OverrideTokenDynamicImageWithIpfsLinkCall>(
//     newMockCall()
//   );

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("1230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_tokenId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))
//     ),
//     new ethereum.EventParam(
//       "_ipfsHash",
//       ethereum.Value.fromString(TEST_PROJECT.ipfsHash)
//     )
//   ];

//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "tokenURI",
//     "tokenURI(uint256):(string)"
//   )
//     .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))])
//     .returns([ethereum.Value.fromString(TEST_PROJECT.ipfsHash)]);

//   createTokenToLoad(call.to, call.inputs._tokenId);
//   const token = Token.load(TEST_PROJECT.tokenId);

//   if (token) {
//     assert.assertNull(token.uri);
//   }

//   handleOverrideTokenDynamicImageWithIpfsLink(call);
//   assert.fieldEquals(
//     TOKEN_ENTITY_TYPE,
//     TEST_PROJECT.tokenId,
//     "uri",
//     TEST_PROJECT.ipfsHash
//   );

//   clearStore();
// });

// test("Can remove and update a project's last script", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();
//   mockRefreshProjectScript();

//   const call = changetype<RemoveProjectLastScriptCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("1230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     )
//   ];

//   const refreshScriptCall = changetype<AddProjectScriptCall>(newMockCall());
//   refreshScriptCall.to = call.to;
//   refreshScriptCall.block.timestamp = call.block.timestamp;
//   refreshScriptCall.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_script",
//       ethereum.Value.fromString(meridianScript)
//     )
//   ];

//   // mock a full Project entity before loading and removing a script
//   createProjectToLoad();
//   handleAddProjectScript(refreshScriptCall);

//   assert.fieldEquals(
//     PROJECTSCRIPT_ENTITY_TYPE,
//     TEST_PROJECT.projectScriptId,
//     "project",
//     TEST_PROJECT.id
//   );
//   assert.fieldEquals(
//     PROJECTSCRIPT_ENTITY_TYPE,
//     TEST_PROJECT.projectScriptId,
//     "script",
//     meridianScript.toString()
//   );

//   handleRemoveProjectLastScript(call);

//   assert.fieldEquals(
//     PROJECTSCRIPT_ENTITY_TYPE,
//     TEST_PROJECT.projectScriptId,
//     "project",
//     TEST_PROJECT.id
//   );
//   assert.fieldEquals(
//     PROJECTSCRIPT_ENTITY_TYPE,
//     TEST_PROJECT.projectScriptId,
//     "script",
//     meridianScript.toString()
//   );

//   clearStore();
// });

// test("Can toggle if a project is active", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<ToggleProjectIsActiveCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     )
//   ];

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "active",
//     TEST_PROJECT.active.toString()
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "1232");

//   handleToggleProjectIsActive(call);

//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "active", "true");
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "activatedAt",
//     "230"
//   );
//   clearStore();
// });

// test("Can toggle if a project is dynamic", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<ToggleProjectIsDynamicCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     )
//   ];

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "dynamic",
//     TEST_PROJECT.dynamic.toString()
//   );
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "useHashString",
//     TEST_PROJECT.useHashString.toString()
//   );

//   handleToggleProjectIsDynamic(call);

//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "dynamic", "false");
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "useHashString",
//     TEST_PROJECT.useHashString.toString()
//   );

//   clearStore();
// });

// test("Can toggle if a project is locked", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<ToggleProjectIsLockedCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     )
//   ];

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "locked",
//     TEST_PROJECT.locked.toString()
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "1232");

//   handleToggleProjectIsLocked(call);

//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "locked", "true");
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can toggle if a project is paused", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<ToggleProjectIsPausedCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     )
//   ];

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "paused",
//     TEST_PROJECT.paused.toString()
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "1232");

//   handleToggleProjectIsPaused(call);

//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "paused", "false");
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can toggle a project's useHashString", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<ToggleProjectUseHashStringCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     )
//   ];

//   handleToggleProjectUseHashString(call);
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "useHashString",
//     "false"
//   );

//   handleToggleProjectUseHashString(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "useHashString",
//     "true"
//   );

//   clearStore();
// });

// test("Can toggle if a project uses Ipfs", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<ToggleProjectUseIpfsForStaticCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     )
//   ];

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "useIpfs",
//     TEST_PROJECT.useIpfs.toString()
//   );

//   handleToggleProjectUseIpfsForStatic(call);

//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "useIpfs", "true");

//   clearStore();
// });

// test("Can update a projects additional payee info", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectAdditionalPayeeInfoCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_additionalPayee",
//       ethereum.Value.fromAddress(
//         Address.fromString("0x7ee88C660eE1B8B41c1BD75C0290E25F1228BE98")
//       )
//     ),
//     new ethereum.EventParam(
//       "_additionalPayeePercentage",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("20"))
//     )
//   ];

//   handleUpdateProjectAdditionalPayeeInfo(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "additionalPayee",
//     "0x7ee88c660ee1b8b41c1bd75c0290e25f1228be98"
//   );
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "additionalPayeePercentage",
//     "20"
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a projects artist address", () => {
//   clearStore();
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectArtistAddressCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_artistAddress",
//       ethereum.Value.fromAddress(
//         Address.fromString("0xF1687E6b9D811e01C2a03B473d9155315a82A812")
//       )
//     )
//   ];

//   handleUpdateProjectArtistAddress(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "artistAddress",
//     "0xf1687e6b9d811e01c2a03b473d9155315a82a812"
//   );
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "artist",
//     "0xf1687e6b9d811e01c2a03b473d9155315a82a812"
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a projects artist name", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectArtistNameCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
//     ),
//     new ethereum.EventParam(
//       "_projectArtistName",
//       ethereum.Value.fromString(TEST_PROJECT.artistName)
//     )
//   ];

//   handleUpdateProjectArtistName(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "artistName",
//     TEST_PROJECT.artistName
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a projects base Ipfs URI", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectBaseIpfsURICall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_projectBaseIpfsURI",
//       ethereum.Value.fromString(
//         "Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu"
//       )
//     )
//   ];

//   handleUpdateProjectBaseIpfsURI(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "baseIpfsUri",
//     "Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu"
//   );

//   clearStore();
// });

// test("Can update a projects base URI", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectBaseURICall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_newBaseURI",
//       ethereum.Value.fromString("random_new_base_URI")
//     )
//   ];

//   handleUpdateProjectBaseURI(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "baseUri",
//     "random_new_base_URI"
//   );

//   clearStore();
// });

// test("Can update a projects currency info", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectCurrencyInfoCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_currencySymbol",
//       ethereum.Value.fromString("SOS")
//     ),
//     new ethereum.EventParam(
//       "_currencyAddress",
//       ethereum.Value.fromAddress(
//         Address.fromString("0x3b484b82567a09e2588A13D54D032153f0c0aEe0")
//       )
//     )
//   ];

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "currencySymbol",
//     TEST_PROJECT.currencySymbol
//   );

//   handleUpdateProjectCurrencyInfo(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "currencySymbol",
//     "SOS"
//   );
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "currencyAddress",
//     "0x3b484b82567a09e2588a13d54d032153f0c0aee0"
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a projects description", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectDescriptionCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_projectDescription",
//       ethereum.Value.fromString(TEST_PROJECT.projectDescription)
//     )
//   ];

//   handleUpdateProjectDescription(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "description",
//     TEST_PROJECT.projectDescription
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a projects IPFS Hash", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectIpfsHashCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_ipfsHash",
//       ethereum.Value.fromString(
//         "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
//       )
//     )
//   ];

//   handleUpdateProjectIpfsHash(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "ipfsHash",
//     "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a project license", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectLicenseCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_projectLicense",
//       ethereum.Value.fromString(TEST_PROJECT.projectLicense)
//     )
//   ];

//   handleUpdateProjectLicense(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "license",
//     TEST_PROJECT.projectLicense
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a project max invocations", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectMaxInvocationsCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_maxInvocations",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("9999"))
//     )
//   ];

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "maxInvocations",
//     "1024"
//   );
//   handleUpdateProjectMaxInvocations(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "maxInvocations",
//     "9999"
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "complete", "false");
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a project name", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectNameCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_projectName",
//       ethereum.Value.fromString("Chimera")
//     )
//   ];

//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "name", "string1");
//   handleUpdateProjectName(call);

//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "name", "Chimera");
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a project price per token in wei", () => {
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectPricePerTokenInWeiCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_pricePerTokenInWei",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("987654321"))
//     )
//   ];

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "pricePerTokenInWei",
//     "100000000"
//   );
//   handleUpdateProjectPricePerTokenInWei(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "pricePerTokenInWei",
//     "987654321"
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can handleUpdateProjectScript", () => {
//   clearStore();
//   mockRefreshContractCalls();
//   mockProjectContractCalls();
//   mockRefreshProjectScript();
//   createProjectToLoad();

//   const call = changetype<UpdateProjectScriptCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("530");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_scriptId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("0"))
//     ),
//     new ethereum.EventParam(
//       "_script",
//       ethereum.Value.fromString(meridianScript)
//     )
//   ];

//   handleUpdateProjectScript(call);

//   assert.fieldEquals(
//     PROJECTSCRIPT_ENTITY_TYPE,
//     TEST_PROJECT.projectScriptId,
//     "project",
//     TEST_PROJECT.id
//   );
//   assert.fieldEquals(
//     PROJECTSCRIPT_ENTITY_TYPE,
//     TEST_PROJECT.projectScriptId,
//     "script",
//     meridianScript.toString()
//   );
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "script",
//     meridianScript.toString()
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "530");
//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "scriptUpdatedAt",
//     "530"
//   );

//   clearStore();
// });

// test("Can handleUpdateProjectScriptJSON", () => {
//   clearStore();
//   mockRefreshContractCalls();
//   mockProjectContractCalls();
//   mockRefreshProjectScript();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectScriptJSONCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("232");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_projectScriptJSON",
//       ethereum.Value.fromString(TEST_PROJECT.projectScriptJSON)
//     )
//   ];

//   handleUpdateProjectScriptJSON(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "scriptJSON",
//     TEST_PROJECT.projectScriptJSON
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "232");

//   clearStore();
// });

// test("Can update project secondary market royalties", () => {
//   clearStore();
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectSecondaryMarketRoyaltyPercentageCall>(
//     newMockCall()
//   );

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_secondMarketRoyalty",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("125"))
//     )
//   ];

//   handleUpdateProjectSecondaryMarketRoyaltyPercentage(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "royaltyPercentage",
//     "125"
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });

// test("Can update a project website", () => {
//   clearStore();
//   mockRefreshContractCalls();
//   mockProjectContractCalls();

//   createProjectToLoad();

//   const call = changetype<UpdateProjectWebsiteCall>(newMockCall());

//   call.to = Address.fromString(TEST_PROJECT.contract);
//   call.block.timestamp = BigInt.fromString("230");
//   call.inputValues = [
//     new ethereum.EventParam(
//       "_projectId",
//       ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
//     ),
//     new ethereum.EventParam(
//       "_projectWebsite",
//       ethereum.Value.fromString(TEST_PROJECT.website)
//     )
//   ];

//   handleUpdateProjectWebsite(call);

//   assert.fieldEquals(
//     PROJECT_ENTITY_TYPE,
//     TEST_PROJECT.id,
//     "website",
//     TEST_PROJECT.website
//   );
//   assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

//   clearStore();
// });
