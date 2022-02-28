import {
  assert,
  clearStore,
  test,
  newMockCall,
  logStore,
  createMockedFunction
} from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { meridianScript } from "../meridianScript";
import {
  mockRefreshContractCalls,
  mockProjectContractCalls,
  mockRefreshProjectScript,
  createProjectToLoad,
  createTokenToLoad,
  TEST_PROJECT,
  ACCOUNT_ENTITY_TYPE,
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  WHITELISTING_ENTITY_TYPE,
  PROJECTSCRIPT_ENTITY_TYPE,
  TOKEN_ENTITY_TYPE
} from "./mocks";
import { Token } from "../../generated/schema";
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
} from "../../generated/GenArt721Core/GenArt721Core";
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
} from "../../src/mapping";

test("Can add a new project", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  let call = changetype<AddProjectCall>(newMockCall());
  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");

  call.inputValues = [
    new ethereum.EventParam(
      "projectName",
      ethereum.Value.fromString(TEST_PROJECT.name)
    ),
    new ethereum.EventParam(
      "artistAddress",
      ethereum.Value.fromString(TEST_PROJECT.artistAddress)
    ),
    new ethereum.EventParam(
      "pricePerTokenInWei",
      ethereum.Value.fromString(TEST_PROJECT.pricePerTokenInWei)
    )
  ];

  handleAddProject(call);

  assert.fieldEquals(
    ACCOUNT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "id",
    TEST_PROJECT.contract
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "admin",
    TEST_PROJECT.admin
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "renderProviderAddress",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "createdAt",
    "1230"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "nextProjectId",
    "101"
  );

  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "projectId", "99");
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "complete", "false");
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "active", "false");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "artistAddress",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "maxInvocations",
    TEST_PROJECT.maxInvocations
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "pricePerTokenInWei",
    "100000000"
  );

  clearStore();
});

test("Can add whitelisting to a contract and account", () => {
  let call = changetype<AddWhitelistedCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString(TEST_PROJECT.artistAddress);
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockRefreshContractCalls();

  handleAddWhitelisted(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "admin",
    TEST_PROJECT.admin
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "renderProviderAddress",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "renderProviderPercentage",
    TEST_PROJECT.renderProviderPercentage
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "nextProjectId",
    "100"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "createdAt",
    "1230"
  );

  assert.fieldEquals(
    ACCOUNT_ENTITY_TYPE,
    TEST_PROJECT.artistAddress,
    "id",
    TEST_PROJECT.artistAddress
  );

  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672",
    "contract",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672",
    "account",
    TEST_PROJECT.artistAddress
  );
  clearStore();
});

test("Can remove whitelisting", () => {
  let callToAddWhitelist = changetype<AddWhitelistedCall>(newMockCall());
  let callToRemoveWhitelist = changetype<RemoveWhitelistedCall>(newMockCall());
  let addr1 = Address.fromString(TEST_PROJECT.artistAddress);
  let addr2 = Address.fromString(TEST_PROJECT.artistAddress);

  callToAddWhitelist.to = Address.fromString(TEST_PROJECT.contract);
  callToAddWhitelist.block.timestamp = BigInt.fromString("1230");
  callToAddWhitelist.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr1))
  ];

  callToRemoveWhitelist.to = Address.fromString(TEST_PROJECT.contract);
  callToRemoveWhitelist.block.timestamp = BigInt.fromString("1230");
  callToRemoveWhitelist.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr2))
  ];

  mockRefreshContractCalls();

  handleAddWhitelisted(callToAddWhitelist);
  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672",
    "contract",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672",
    "account",
    TEST_PROJECT.artistAddress
  );

  handleRemoveWhitelisted(callToRemoveWhitelist);

  assert.notInStore(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672"
  );
  clearStore();
});

test("Can add and mint whitelisted call", () => {
  let call = changetype<AddMintWhitelistedCall>(newMockCall());
  let addr1 = Address.fromString(TEST_PROJECT.artistAddress);

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1231");
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr1))
  ];

  mockRefreshContractCalls();

  handleAddMintWhitelisted(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "id",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "mintWhitelisted",
    "[0x1233973f9aea61250e98b697246cb10146903672]"
  );

  assert.notInStore(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672"
  );
  clearStore();
});

test("Can remove a mint whitelisted address", () => {
  mockRefreshContractCalls();

  let addWhitelistCall = changetype<AddMintWhitelistedCall>(newMockCall());
  addWhitelistCall.to = Address.fromString(TEST_PROJECT.contract);
  addWhitelistCall.block.timestamp = BigInt.fromString("1230");
  addWhitelistCall.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.artistAddress))
    )
  ];

  let removeWhitelistCall = changetype<RemoveMintWhitelistedCall>(
    newMockCall()
  );
  removeWhitelistCall.to = Address.fromString(TEST_PROJECT.contract);
  removeWhitelistCall.block.timestamp = BigInt.fromString("1231");
  removeWhitelistCall.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.artistAddress))
    )
  ];

  handleAddMintWhitelisted(addWhitelistCall);
  addWhitelistCall.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(
        Address.fromString("0x1233973f9aea61250e98b697246cb10146912345")
      )
    )
  ];
  handleAddMintWhitelisted(addWhitelistCall);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "mintWhitelisted",
    "[0x1233973f9aea61250e98b697246cb10146903672, 0x1233973f9aea61250e98b697246cb10146912345]"
  );
  handleRemoveMintWhitelisted(removeWhitelistCall);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "mintWhitelisted",
    "[0x1233973f9aea61250e98b697246cb10146912345]"
  );

  clearStore();
});

test("Can update randomizer address", () => {
  let call = changetype<UpdateRandomizerAddressCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString(TEST_PROJECT.artistAddress);
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockRefreshContractCalls();

  handleUpdateRandomizerAddress(call);
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "id",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "randomizerContract",
    TEST_PROJECT.contract
  );

  clearStore();
});

test("Can update ArtBlocks address", () => {
  let call = changetype<UpdateArtblocksAddressCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString(TEST_PROJECT.artistAddress);
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockRefreshContractCalls();

  handleUpdateArtblocksAddress(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "id",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "renderProviderAddress",
    TEST_PROJECT.contract
  );

  clearStore();
});

test("Can update ArtBlocks percentage", () => {
  let call = changetype<UpdateArtblocksPercentageCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString(TEST_PROJECT.artistAddress);
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockRefreshContractCalls();

  handleUpdateArtblocksPercentage(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "id",
    TEST_PROJECT.contract
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    TEST_PROJECT.contract,
    "renderProviderPercentage",
    TEST_PROJECT.renderProviderPercentage
  );

  clearStore();
});

test("Can handle add project script", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();
  mockRefreshProjectScript();

  // mock a full Project entity before refreshing an existing script
  createProjectToLoad();

  let refreshScriptCall = changetype<AddProjectScriptCall>(newMockCall());
  refreshScriptCall.to = Address.fromString(TEST_PROJECT.contract);
  refreshScriptCall.block.timestamp = BigInt.fromString("1231");
  refreshScriptCall.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_script",
      ethereum.Value.fromString(meridianScript)
    )
  ];

  handleAddProjectScript(refreshScriptCall);

  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    TEST_PROJECT.projectScriptId,
    "project",
    TEST_PROJECT.id
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    TEST_PROJECT.projectScriptId,
    "script",
    meridianScript.toString()
  );

  clearStore();
});

test("Can clear a Token IPFS image uri", () => {
  let call = changetype<ClearTokenIpfsImageUriCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  call.inputValues = [
    new ethereum.EventParam(
      "_tokenId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))
    )
  ];

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "tokenURI",
    "tokenURI(uint256):(string)"
  )
    .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))])
    .returns([ethereum.Value.fromString(TEST_PROJECT.ipfsHash)]);

  createTokenToLoad(call.to, call.inputs._tokenId);
  let token = Token.load(TEST_PROJECT.tokenId);

  if (token) {
    assert.assertNull(token.uri);
  }

  handleClearTokenIpfsImageUri(call);
  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    TEST_PROJECT.tokenId,
    "uri",
    TEST_PROJECT.ipfsHash
  );

  clearStore();
});

test("Can override token dynamic image with IPFS link", () => {
  let call = changetype<OverrideTokenDynamicImageWithIpfsLinkCall>(
    newMockCall()
  );

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  call.inputValues = [
    new ethereum.EventParam(
      "_tokenId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))
    ),
    new ethereum.EventParam(
      "_ipfsHash",
      ethereum.Value.fromString(TEST_PROJECT.ipfsHash)
    )
  ];

  createMockedFunction(
    Address.fromString(TEST_PROJECT.contract),
    "tokenURI",
    "tokenURI(uint256):(string)"
  )
    .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))])
    .returns([ethereum.Value.fromString(TEST_PROJECT.ipfsHash)]);

  createTokenToLoad(call.to, call.inputs._tokenId);
  let token = Token.load(TEST_PROJECT.tokenId);

  if (token) {
    assert.assertNull(token.uri);
  }

  handleOverrideTokenDynamicImageWithIpfsLink(call);
  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    TEST_PROJECT.tokenId,
    "uri",
    TEST_PROJECT.ipfsHash
  );

  clearStore();
});

test("Can remove and update a project's last script", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();
  mockRefreshProjectScript();

  let call = changetype<RemoveProjectLastScriptCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  let refreshScriptCall = changetype<AddProjectScriptCall>(newMockCall());
  refreshScriptCall.to = call.to;
  refreshScriptCall.block.timestamp = call.block.timestamp;
  refreshScriptCall.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_script",
      ethereum.Value.fromString(meridianScript)
    )
  ];

  // mock a full Project entity before loading and removing a script
  createProjectToLoad();
  handleAddProjectScript(refreshScriptCall);

  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    TEST_PROJECT.projectScriptId,
    "project",
    TEST_PROJECT.id
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    TEST_PROJECT.projectScriptId,
    "script",
    meridianScript.toString()
  );

  handleRemoveProjectLastScript(call);

  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    TEST_PROJECT.projectScriptId,
    "project",
    TEST_PROJECT.id
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    TEST_PROJECT.projectScriptId,
    "script",
    meridianScript.toString()
  );

  clearStore();
});

test("Can toggle if a project is active", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsActiveCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "active",
    TEST_PROJECT.active.toString()
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "1232");

  handleToggleProjectIsActive(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "active", "true");
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "activatedAt",
    "230"
  );
  clearStore();
});

test("Can toggle if a project is dynamic", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsDynamicCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "dynamic",
    TEST_PROJECT.dynamic.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "useHashString",
    TEST_PROJECT.useHashString.toString()
  );

  handleToggleProjectIsDynamic(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "dynamic", "false");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "useHashString",
    TEST_PROJECT.useHashString.toString()
  );

  clearStore();
});

test("Can toggle if a project is locked", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsLockedCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "locked",
    TEST_PROJECT.locked.toString()
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "1232");

  handleToggleProjectIsLocked(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "locked", "true");
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can toggle if a project is paused", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsPausedCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "paused",
    TEST_PROJECT.paused.toString()
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "1232");

  handleToggleProjectIsPaused(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "paused", "false");
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can toggle a project's useHashString", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectUseHashStringCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  handleToggleProjectUseHashString(call);
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "useHashString",
    "false"
  );

  handleToggleProjectUseHashString(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "useHashString",
    "true"
  );

  clearStore();
});

test("Can toggle if a project uses Ipfs", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectUseIpfsForStaticCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "useIpfs",
    TEST_PROJECT.useIpfs.toString()
  );

  handleToggleProjectUseIpfsForStatic(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "useIpfs", "true");

  clearStore();
});

test("Can update a projects additional payee info", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectAdditionalPayeeInfoCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_additionalPayee",
      ethereum.Value.fromAddress(
        Address.fromString("0x7ee88C660eE1B8B41c1BD75C0290E25F1228BE98")
      )
    ),
    new ethereum.EventParam(
      "_additionalPayeePercentage",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("20"))
    )
  ];

  handleUpdateProjectAdditionalPayeeInfo(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "additionalPayee",
    "0x7ee88c660ee1b8b41c1bd75c0290e25f1228be98"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "additionalPayeePercentage",
    "20"
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a projects artist address", () => {
  clearStore();
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectArtistAddressCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_artistAddress",
      ethereum.Value.fromAddress(
        Address.fromString("0xF1687E6b9D811e01C2a03B473d9155315a82A812")
      )
    )
  ];

  handleUpdateProjectArtistAddress(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "artistAddress",
    "0xf1687e6b9d811e01c2a03b473d9155315a82a812"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "artist",
    "0xf1687e6b9d811e01c2a03b473d9155315a82a812"
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a projects artist name", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectArtistNameCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ),
    new ethereum.EventParam(
      "_projectArtistName",
      ethereum.Value.fromString(TEST_PROJECT.artistName)
    )
  ];

  handleUpdateProjectArtistName(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "artistName",
    TEST_PROJECT.artistName
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a projects base Ipfs URI", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectBaseIpfsURICall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectBaseIpfsURI",
      ethereum.Value.fromString(
        "Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu"
      )
    )
  ];

  handleUpdateProjectBaseIpfsURI(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "baseIpfsUri",
    "Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu"
  );

  clearStore();
});

test("Can update a projects base URI", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectBaseURICall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_newBaseURI",
      ethereum.Value.fromString("random_new_base_URI")
    )
  ];

  handleUpdateProjectBaseURI(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "baseUri",
    "random_new_base_URI"
  );

  clearStore();
});

test("Can update a projects currency info", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectCurrencyInfoCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_currencySymbol",
      ethereum.Value.fromString("SOS")
    ),
    new ethereum.EventParam(
      "_currencyAddress",
      ethereum.Value.fromAddress(
        Address.fromString("0x3b484b82567a09e2588A13D54D032153f0c0aEe0")
      )
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "currencySymbol",
    TEST_PROJECT.currencySymbol
  );

  handleUpdateProjectCurrencyInfo(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "currencySymbol",
    "SOS"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "currencyAddress",
    "0x3b484b82567a09e2588a13d54d032153f0c0aee0"
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a projects description", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectDescriptionCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectDescription",
      ethereum.Value.fromString(TEST_PROJECT.projectDescription)
    )
  ];

  handleUpdateProjectDescription(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "description",
    TEST_PROJECT.projectDescription
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a projects IPFS Hash", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectIpfsHashCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_ipfsHash",
      ethereum.Value.fromString(
        "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
      )
    )
  ];

  handleUpdateProjectIpfsHash(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "ipfsHash",
    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a project license", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectLicenseCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectLicense",
      ethereum.Value.fromString(TEST_PROJECT.projectLicense)
    )
  ];

  handleUpdateProjectLicense(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "license",
    TEST_PROJECT.projectLicense
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a project max invocations", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectMaxInvocationsCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_maxInvocations",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("9999"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "maxInvocations",
    "1024"
  );
  handleUpdateProjectMaxInvocations(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "maxInvocations",
    "9999"
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "complete", "false");
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a project name", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectNameCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectName",
      ethereum.Value.fromString("Chimera")
    )
  ];

  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "name", "string1");
  handleUpdateProjectName(call);

  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "name", "Chimera");
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a project price per token in wei", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectPricePerTokenInWeiCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_pricePerTokenInWei",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("987654321"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "pricePerTokenInWei",
    "100000000"
  );
  handleUpdateProjectPricePerTokenInWei(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "pricePerTokenInWei",
    "987654321"
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can handleUpdateProjectScript", () => {
  clearStore();
  mockRefreshContractCalls();
  mockProjectContractCalls();
  mockRefreshProjectScript();
  createProjectToLoad();

  let call = changetype<UpdateProjectScriptCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("530");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_scriptId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("0"))
    ),
    new ethereum.EventParam(
      "_script",
      ethereum.Value.fromString(meridianScript)
    )
  ];

  handleUpdateProjectScript(call);

  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    TEST_PROJECT.projectScriptId,
    "project",
    TEST_PROJECT.id
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    TEST_PROJECT.projectScriptId,
    "script",
    meridianScript.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "script",
    meridianScript.toString()
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "530");
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "scriptUpdatedAt",
    "530"
  );

  clearStore();
});

test("Can handleUpdateProjectScriptJSON", () => {
  clearStore();
  mockRefreshContractCalls();
  mockProjectContractCalls();
  mockRefreshProjectScript();

  createProjectToLoad();

  let call = changetype<UpdateProjectScriptJSONCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("232");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectScriptJSON",
      ethereum.Value.fromString(TEST_PROJECT.projectScriptJSON)
    )
  ];

  handleUpdateProjectScriptJSON(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "scriptJSON",
    TEST_PROJECT.projectScriptJSON
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "232");

  clearStore();
});

test("Can update project secondary market royalties", () => {
  clearStore();
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectSecondaryMarketRoyaltyPercentageCall>(
    newMockCall()
  );

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_secondMarketRoyalty",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("125"))
    )
  ];

  handleUpdateProjectSecondaryMarketRoyaltyPercentage(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "royaltyPercentage",
    "125"
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});

test("Can update a project website", () => {
  clearStore();
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectWebsiteCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectWebsite",
      ethereum.Value.fromString(TEST_PROJECT.website)
    )
  ];

  handleUpdateProjectWebsite(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "website",
    TEST_PROJECT.website
  );
  assert.fieldEquals(PROJECT_ENTITY_TYPE, TEST_PROJECT.id, "updatedAt", "230");

  clearStore();
});
