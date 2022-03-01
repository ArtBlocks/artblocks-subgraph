import {
  assert,
  clearStore,
  test,
  newMockCall,
  logStore
} from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { meridianScript } from "../meridianScript";
import {
  mockPBABRefreshContractCalls,
  mockPBABProjectContractCalls,
  mockRefreshProjectScript,
  createProjectToLoad,
  TEST_PROJECT,
  ACCOUNT_ENTITY_TYPE,
  PROJECT_ENTITY_TYPE,
  CONTRACT_ENTITY_TYPE,
  WHITELISTING_ENTITY_TYPE,
  PROJECTSCRIPT_ENTITY_TYPE
} from "./mocks";
import {
  AddProjectCall,
  AddWhitelistedCall,
  RemoveWhitelistedCall,
  AddMintWhitelistedCall,
  UpdateRandomizerAddressCall,
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
  UpdateProjectScriptJSONCall
} from "../../generated/GenArt721Core2PBAB/GenArt721Core2PBAB";
import {
  handleAddProject,
  handleAddWhitelisted,
  handleRemoveWhitelisted,
  handleAddMintWhitelisted,
  handleUpdateRandomizerAddress,
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
} from "../../src/pbab-mapping";

test("PBAB: Can add a new project", () => {
  clearStore();
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  let call = changetype<AddProjectCall>(newMockCall());
  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");

  call.inputValues = [
    new ethereum.EventParam(
      "projectName",
      ethereum.Value.fromString("Ringers")
    ),
    new ethereum.EventParam(
      "artistAddress",
      ethereum.Value.fromString(TEST_PROJECT.artistAddress)
    ),
    new ethereum.EventParam(
      "pricePerTokenInWei",
      ethereum.Value.fromString("123")
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

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "projectId",
    TEST_PROJECT.projectId
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "complete",
    TEST_PROJECT.complete.toString()
  );
  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    TEST_PROJECT.id,
    "active",
    TEST_PROJECT.active.toString()
  );
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

test("PBAB: Can add whitelisting to a contract and account", () => {
  let call = changetype<AddWhitelistedCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString(TEST_PROJECT.artistAddress);
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockPBABRefreshContractCalls();

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

test("PBAB: Can remove whitelisting", () => {
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

  mockPBABRefreshContractCalls();

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

test("PBAB: Can add and mint whitelisted call", () => {
  let call = changetype<AddMintWhitelistedCall>(newMockCall());
  let addr1 = Address.fromString(TEST_PROJECT.artistAddress);

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1231");
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr1))
  ];

  mockPBABRefreshContractCalls();

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

test("PBAB: Can remove a mint whitelisted address", () => {
  mockPBABRefreshContractCalls();

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

test("PBAB: Can update randomizer address", () => {
  let call = changetype<UpdateRandomizerAddressCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  let addr = Address.fromString(TEST_PROJECT.artistAddress);
  call.inputValues = [
    new ethereum.EventParam("_address", ethereum.Value.fromAddress(addr))
  ];

  mockPBABRefreshContractCalls();

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

test("PBAB: Can handle add project script", () => {
  clearStore();
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();
  mockRefreshProjectScript();

  let refreshScriptCall = changetype<AddProjectScriptCall>(newMockCall());
  refreshScriptCall.to = Address.fromString(TEST_PROJECT.contract);
  refreshScriptCall.block.timestamp = BigInt.fromString("1231");
  refreshScriptCall.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    ),
    new ethereum.EventParam(
      "_script",
      ethereum.Value.fromString(meridianScript)
    )
  ];

  // mock a full Project entity before refreshing an existing script
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

  clearStore();
});

test("PBAB: Can remove and update a project's last script", () => {
  clearStore();
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();
  mockRefreshProjectScript();

  let call = changetype<RemoveProjectLastScriptCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("1230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
    )
  ];

  let refreshScriptCall = changetype<AddProjectScriptCall>(newMockCall());
  refreshScriptCall.to = call.to;
  refreshScriptCall.block.timestamp = call.block.timestamp;
  refreshScriptCall.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can toggle if a project is active", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsActiveCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can toggle if a project is locked", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsLockedCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can toggle if a project is paused", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<ToggleProjectIsPausedCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a projects additional payee info", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectAdditionalPayeeInfoCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a projects artist address", () => {
  clearStore();
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectArtistAddressCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a projects artist name", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

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

test("PBAB: Can update a projects base URI", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectBaseURICall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a projects currency info", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectCurrencyInfoCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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
    "GRT"
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

test("PBAB: Can update a projects description", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectDescriptionCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a projects IPFS Hash", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectIpfsHashCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a project license", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectLicenseCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a project max invocations", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectMaxInvocationsCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a project name", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectNameCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a project price per token in wei", () => {
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectPricePerTokenInWeiCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can handleUpdateProjectScript", () => {
  clearStore();
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();
  mockRefreshProjectScript();
  createProjectToLoad();

  let call = changetype<UpdateProjectScriptCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("530");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can handleUpdateProjectScriptJSON", () => {
  clearStore();
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();
  mockRefreshProjectScript();

  createProjectToLoad();

  let call = changetype<UpdateProjectScriptJSONCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("232");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update project secondary market royalties", () => {
  clearStore();
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectSecondaryMarketRoyaltyPercentageCall>(
    newMockCall()
  );

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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

test("PBAB: Can update a project website", () => {
  clearStore();
  mockPBABRefreshContractCalls();
  mockPBABProjectContractCalls();

  createProjectToLoad();

  let call = changetype<UpdateProjectWebsiteCall>(newMockCall());

  call.to = Address.fromString(TEST_PROJECT.contract);
  call.block.timestamp = BigInt.fromString("230");
  call.inputValues = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
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
