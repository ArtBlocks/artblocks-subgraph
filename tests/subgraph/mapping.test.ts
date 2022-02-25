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
  createTokenToLoad
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

let ACCOUNT_ENTITY_TYPE = "Account";
let PROJECT_ENTITY_TYPE = "Project";
let CONTRACT_ENTITY_TYPE = "Contract";
let WHITELISTING_ENTITY_TYPE = "Whitelisting";
let PROJECTSCRIPT_ENTITY_TYPE = "ProjectScript";
let TOKEN_ENTITY_TYPE = "Token";

test("Can add a new project", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  let call = changetype<AddProjectCall>(newMockCall());
  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("1230");

  call.inputValues = [
    new ethereum.EventParam(
      "projectName",
      ethereum.Value.fromString("Ringers")
    ),
    new ethereum.EventParam(
      "artistAddress",
      ethereum.Value.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
    ),
    new ethereum.EventParam(
      "pricePerTokenInWei",
      ethereum.Value.fromString("123")
    )
  ];

  handleAddProject(call);

  assert.fieldEquals(
    ACCOUNT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "id",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "admin",
    "0x90cba2bbb19ecc291a12066fd8329d65fa1f1947"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "renderProviderAddress",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "createdAt",
    "1230"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "nextProjectId",
    "101"
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "projectId",
    "99"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "complete",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "active",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "artistAddress",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "maxInvocations",
    "1024"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "pricePerTokenInWei",
    "100000000"
  );

  clearStore();
});

test("Can add whitelisting to a contract and account", () => {
  let call = changetype<AddWhitelistedCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672");
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockRefreshContractCalls();

  handleAddWhitelisted(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "admin",
    "0x90cba2bbb19ecc291a12066fd8329d65fa1f1947"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "renderProviderAddress",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "renderProviderPercentage",
    "10"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "nextProjectId",
    "100"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "createdAt",
    "1230"
  );

  assert.fieldEquals(
    ACCOUNT_ENTITY_TYPE,
    "0x1233973f9aea61250e98b697246cb10146903672",
    "id",
    "0x1233973f9aea61250e98b697246cb10146903672"
  );

  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672",
    "contract",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672",
    "account",
    "0x1233973f9aea61250e98b697246cb10146903672"
  );
  clearStore();
});

test("Can remove whitelisting", () => {
  let callToAddWhitelist = changetype<AddWhitelistedCall>(newMockCall());
  let callToRemoveWhitelist = changetype<RemoveWhitelistedCall>(newMockCall());
  let addr1 = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672");
  let addr2 = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672");

  callToAddWhitelist.to = Address.fromString(
    "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"
  );
  callToAddWhitelist.block.timestamp = BigInt.fromString("1230");
  callToAddWhitelist.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr1))
  ];

  callToRemoveWhitelist.to = Address.fromString(
    "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"
  );
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    WHITELISTING_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672",
    "account",
    "0x1233973f9aea61250e98b697246cb10146903672"
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
  let addr1 = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672");

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("1231");
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr1))
  ];

  mockRefreshContractCalls();

  handleAddMintWhitelisted(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "id",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
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
  addWhitelistCall.to = Address.fromString(
    "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"
  );
  addWhitelistCall.block.timestamp = BigInt.fromString("1230");
  addWhitelistCall.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(
        Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
      )
    )
  ];

  let removeWhitelistCall = changetype<RemoveMintWhitelistedCall>(
    newMockCall()
  );
  removeWhitelistCall.to = Address.fromString(
    "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"
  );
  removeWhitelistCall.block.timestamp = BigInt.fromString("1231");
  removeWhitelistCall.inputValues = [
    new ethereum.EventParam(
      "_address",
      ethereum.Value.fromAddress(
        Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
      )
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "mintWhitelisted",
    "[0x1233973f9aea61250e98b697246cb10146903672, 0x1233973f9aea61250e98b697246cb10146912345]"
  );
  handleRemoveMintWhitelisted(removeWhitelistCall);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "mintWhitelisted",
    "[0x1233973f9aea61250e98b697246cb10146912345]"
  );

  clearStore();
});

test("Can update randomizer address", () => {
  let call = changetype<UpdateRandomizerAddressCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672");
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockRefreshContractCalls();

  handleUpdateRandomizerAddress(call);
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "id",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "randomizerContract",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );

  clearStore();
});

test("Can update ArtBlocks address", () => {
  let call = changetype<UpdateArtblocksAddressCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672");
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockRefreshContractCalls();

  handleUpdateArtblocksAddress(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "id",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "renderProviderAddress",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );

  clearStore();
});

test("Can update ArtBlocks percentage", () => {
  let call = changetype<UpdateArtblocksPercentageCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672");
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockRefreshContractCalls();

  handleUpdateArtblocksPercentage(call);

  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "id",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270"
  );
  assert.fieldEquals(
    CONTRACT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    "renderProviderPercentage",
    "10"
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
  refreshScriptCall.to = Address.fromString(
    "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"
  );
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
    "project",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99"
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
    "script",
    meridianScript.toString()
  );

  clearStore();
});

test("Can clear a Token IPFS image uri", () => {
  let call = changetype<ClearTokenIpfsImageUriCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("1230");
  call.inputValues = [
    new ethereum.EventParam(
      "_tokenId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))
    )
  ];

  createMockedFunction(
    Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"),
    "tokenURI",
    "tokenURI(uint256):(string)"
  )
    .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))])
    .returns([
      ethereum.Value.fromString(
        "mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a"
      )
    ]);

  createTokenToLoad(call.to, call.inputs._tokenId);
  let token = Token.load("0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-123");

  if (token) {
    assert.assertNull(token.uri);
  }

  handleClearTokenIpfsImageUri(call);
  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-123",
    "uri",
    "mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a"
  );

  clearStore();
});

test("Can override token dynamic image with IPFS link", () => {
  let call = changetype<OverrideTokenDynamicImageWithIpfsLinkCall>(
    newMockCall()
  );

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("1230");
  call.inputValues = [
    new ethereum.EventParam(
      "_tokenId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))
    ),
    new ethereum.EventParam(
      "_ipfsHash",
      ethereum.Value.fromString(
        "mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a"
      )
    )
  ];

  createMockedFunction(
    Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"),
    "tokenURI",
    "tokenURI(uint256):(string)"
  )
    .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("123"))])
    .returns([
      ethereum.Value.fromString(
        "mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a"
      )
    ]);

  createTokenToLoad(call.to, call.inputs._tokenId);
  let token = Token.load("0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-123");

  if (token) {
    assert.assertNull(token.uri);
  }

  handleOverrideTokenDynamicImageWithIpfsLink(call);
  assert.fieldEquals(
    TOKEN_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-123",
    "uri",
    "mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a"
  );

  clearStore();
});

test("Can remove and update a project's last script", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();
  mockRefreshProjectScript();

  let call = changetype<RemoveProjectLastScriptCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
    "project",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99"
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
    "script",
    meridianScript.toString()
  );

  handleRemoveProjectLastScript(call);

  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
    "project",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99"
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
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

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "active",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "1232"
  );

  handleToggleProjectIsActive(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "active",
    "true"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
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

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "dynamic",
    "true"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "useHashString",
    "true"
  );

  handleToggleProjectIsDynamic(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "dynamic",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "useHashString",
    "true"
  );

  clearStore();
});

test("Can toggle if a project is locked", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsLockedCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "locked",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "1232"
  );

  handleToggleProjectIsLocked(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "locked",
    "true"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can toggle if a project is paused", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsPausedCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "paused",
    "true"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "1232"
  );

  handleToggleProjectIsPaused(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "paused",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can toggle a project's useHashString", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectUseHashStringCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "useHashString",
    "false"
  );

  handleToggleProjectUseHashString(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
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

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    )
  ];

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "useIpfs",
    "false"
  );

  handleToggleProjectUseIpfsForStatic(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "useIpfs",
    "true"
  );

  clearStore();
});

test("Can update a projects additional payee info", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectAdditionalPayeeInfoCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "additionalPayee",
    "0x7ee88c660ee1b8b41c1bd75c0290e25f1228be98"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "additionalPayeePercentage",
    "20"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a projects artist address", () => {
  clearStore();
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectArtistAddressCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "artistAddress",
    "0xf1687e6b9d811e01c2a03b473d9155315a82a812"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "artist",
    "0xf1687e6b9d811e01c2a03b473d9155315a82a812"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a projects artist name", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectArtistNameCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectArtistName",
      ethereum.Value.fromString("Beeple")
    )
  ];

  handleUpdateProjectArtistName(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "artistName",
    "Beeple"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a projects base Ipfs URI", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectBaseIpfsURICall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
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

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
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

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "currencySymbol",
    "GRT"
  );

  handleUpdateProjectCurrencyInfo(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "currencySymbol",
    "SOS"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "currencyAddress",
    "0x3b484b82567a09e2588a13d54d032153f0c0aee0"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a projects description", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectDescriptionCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectDescription",
      ethereum.Value.fromString("Template description blah blah blah")
    )
  ];

  handleUpdateProjectDescription(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "description",
    "Template description blah blah blah"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a projects IPFS Hash", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectIpfsHashCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "ipfsHash",
    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a project license", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectLicenseCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectLicense",
      ethereum.Value.fromString("MIT License - please copy if you want")
    )
  ];

  handleUpdateProjectLicense(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "license",
    "MIT License - please copy if you want"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a project max invocations", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectMaxInvocationsCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "maxInvocations",
    "1024"
  );
  handleUpdateProjectMaxInvocations(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "maxInvocations",
    "9999"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "complete",
    "false"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a project name", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectNameCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "name",
    "string1"
  );
  handleUpdateProjectName(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "name",
    "Chimera"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a project price per token in wei", () => {
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectPricePerTokenInWeiCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "pricePerTokenInWei",
    "100000000"
  );
  handleUpdateProjectPricePerTokenInWei(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "pricePerTokenInWei",
    "987654321"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can handleUpdateProjectScript", () => {
  clearStore();
  mockRefreshContractCalls();
  mockProjectContractCalls();
  mockRefreshProjectScript();
  createProjectToLoad();

  let call = changetype<UpdateProjectScriptCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
    "project",
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99"
  );
  assert.fieldEquals(
    PROJECTSCRIPT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99-0",
    "script",
    meridianScript.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "script",
    meridianScript.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "530"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
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

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("232");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectScriptJSON",
      ethereum.Value.fromString(
        '{"type":"p5js","version":"1.0.0","instructions":"click to animate | space bar changes background color","aspectRatio":"1.5","interactive":"true","curation_status":"curated"}'
      )
    )
  ];

  handleUpdateProjectScriptJSON(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "scriptJSON",
    '{"type":"p5js","version":"1.0.0","instructions":"click to animate | space bar changes background color","aspectRatio":"1.5","interactive":"true","curation_status":"curated"}'
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "232"
  );

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

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
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
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "royaltyPercentage",
    "125"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});

test("Can update a project website", () => {
  clearStore();
  mockRefreshContractCalls();
  mockProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectWebsiteCall>(newMockCall());

  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))
    ),
    new ethereum.EventParam(
      "_projectWebsite",
      ethereum.Value.fromString("artblocks.io")
    )
  ];

  handleUpdateProjectWebsite(call);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "website",
    "artblocks.io"
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99",
    "updatedAt",
    "230"
  );

  clearStore();
});
