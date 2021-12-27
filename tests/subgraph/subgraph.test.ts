import { assert, createMockedFunction, clearStore, test,  newMockCall } from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum, store, Value, log } from "@graphprotocol/graph-ts"
import { GenArt721Core,
         AddProjectCall,
         AddWhitelistedCall, 
         RemoveWhitelistedCall, 
         AddMintWhitelistedCall, 
         UpdateRandomizerAddressCall,
         UpdateArtblocksAddressCall,
         UpdateArtblocksPercentageCall,
         AddProjectScriptCall
         } from '../../generated/GenArt721Core/GenArt721Core';
import { Contract, Project, Token } from "../../generated/schema";
import { logStore } from "matchstick-as";
import { handleAddProject,
         handleAddWhitelisted, 
         handleRemoveWhitelisted, 
         handleAddMintWhitelisted, 
         handleUpdateRandomizerAddress,
         handleUpdateArtblocksAddress,
         handleUpdateArtblocksPercentage,
         handleAddProjectScript } from '../../src/mapping';
import { script } from '../meridianScript';

let ACCOUNT_ENTITY_TYPE = "Account"
let PROJECT_ENTITY_TYPE = "Project"
let CONTRACT_ENTITY_TYPE = "Contract"
let WHITELISTING_ENTITY_TYPE = "Whitelisting"


let contractAddress = Address.fromString("0x1CD623a86751d4C4f20c96000FEC763941f098A2");
let coreContractAddress = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");

const mockRefreshContractCalls = function(): void {
  createMockedFunction(coreContractAddress, 'admin', 'admin():(address)')
  .returns([ethereum.Value.fromAddress(Address.fromString('0x90cBa2Bbb19ecc291A12066Fd8329D65FA1f1947'))])

createMockedFunction(coreContractAddress, 'artblocksAddress', 'artblocksAddress():(address)')
  .returns([ethereum.Value.fromAddress(Address.fromString('0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270'))])
  
createMockedFunction(coreContractAddress, 'artblocksPercentage', 'artblocksPercentage():(uint256)')
  .returns([ethereum.Value.fromSignedBigInt(BigInt.fromString('10'))])
  
createMockedFunction(coreContractAddress, 'nextProjectId', 'nextProjectId():(uint256)')
  .returns([ethereum.Value.fromSignedBigInt(BigInt.fromString('100'))])
  
createMockedFunction(coreContractAddress, 'randomizerContract', 'randomizerContract():(address)')
  .returns([ethereum.Value.fromAddress(Address.fromString('0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270'))])
  
let projectDetailsReturnArray: Array<ethereum.Value> = [
  ethereum.Value.fromString("string1"),     // projectName
  ethereum.Value.fromString("string2"),     // artist
  ethereum.Value.fromString("string3"),     // description
  ethereum.Value.fromString("string4"),     // website
  ethereum.Value.fromString("string7"),     // license
  ethereum.Value.fromBoolean(true)];        // dynamic
createMockedFunction(coreContractAddress, 'projectDetails', 'projectDetails(uint256):(string,string,string,string,string,bool)')
  .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))])
  .returns(projectDetailsReturnArray)

let projectTokenInfoReturnArray: Array<ethereum.Value> = [
  ethereum.Value.fromAddress(Address.fromString("0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")),   // artistAddress
  ethereum.Value.fromSignedBigInt(BigInt.fromString("100000000")),                                // pricePerTokenInWei
  ethereum.Value.fromSignedBigInt(BigInt.fromString("1024")),                                     // invocations
  ethereum.Value.fromSignedBigInt(BigInt.fromString("1024")),                                     // maxInvocations
  ethereum.Value.fromBoolean(false),                                                              // active
  ethereum.Value.fromAddress(Address.fromString("0xc079F0A6E8809E41A2A39D6532ff3dfa6B48e6bB")),   // additionalPayee
  ethereum.Value.fromSignedBigInt(BigInt.fromString("10")),                                       // additionalPayeePercentage
  ethereum.Value.fromString("GRT"),                                                               // currency
  ethereum.Value.fromAddress(Address.fromString("0xc944e90c64b2c07662a292be6244bdf05cda44a7"))];  // currencyAddress
createMockedFunction(coreContractAddress, 'projectTokenInfo', 'projectTokenInfo(uint256):(address,uint256,uint256,uint256,bool,address,uint256,string,address)')
.withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))])
  .returns(projectTokenInfoReturnArray)

let projectScriptInfoReturnArray: Array<ethereum.Value> = [
  ethereum.Value.fromString(script),                                                   // scriptJSON
  ethereum.Value.fromSignedBigInt(BigInt.fromString("1")),                             // scriptCount
  ethereum.Value.fromBoolean(true),                                                    // useHashString
  ethereum.Value.fromString("mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a"),   // IPFSHash
  ethereum.Value.fromBoolean(true),                                                    // locked
  ethereum.Value.fromBoolean(true)];                                                   // paused
createMockedFunction(coreContractAddress, 'projectScriptInfo', 'projectScriptInfo(uint256):(string,uint256,bool,string,bool,bool)')
.withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))])
  .returns(projectScriptInfoReturnArray)
}

function createProjectToLoad(call: ethereum.Call): void {
  let contract = GenArt721Core.bind(call.to);
  let projectEntity = new Project(contract._address.toHexString());

  projectEntity.save();
  logStore();
}

const mockRefreshProjectScript = function(): void {

}

// test("Should throw an error", () => {
//   let call = changetype<AddProjectCall>(newMockCall())
  
//   call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
//   let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")

//   call.inputValues = [
//     new ethereum.EventParam("_address",
//     ethereum.Value.fromAddress(addr))
//   ]
//   createProjectToLoad(call);
//   throw new Error()
// }, true)

test("Can add a new project", () => {
  let call = changetype<AddProjectCall>(newMockCall())
  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  call.block.timestamp = BigInt.fromString('1230')
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")

  call.inputValues = [
    new ethereum.EventParam("projectName", 
    ethereum.Value.fromString("Ringers")), 
    new ethereum.EventParam("artistAddress", 
    ethereum.Value.fromString("0x1233973F9aEa61250e98b697246cb10146903672")),
    new ethereum.EventParam("pricePerTokenInWei", 
    ethereum.Value.fromString("123"))
  ]

  mockRefreshContractCalls();
  handleAddProject(call)
  

  assert.fieldEquals(ACCOUNT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "id", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "admin", "0x90cba2bbb19ecc291a12066fd8329d65fa1f1947")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "renderProviderAddress", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(PROJECT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99", "projectId", "99")
  assert.fieldEquals(PROJECT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-99", "active", "false")

  clearStore();
});

// don't test handleUpdateAdmin -- function needs to interact with Core2?
// test("Can update admin", () => {
//   log.info('call1: ',[])
//   let call = changetype<UpdateAdminCall>(newMockCall())
  
//   let core2ContractAddress = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")
//   call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
//   call.inputValues = [
//     new ethereum.EventParam("_adminAddress",
//     ethereum.Value.fromString("0x1233973F9aEa61250e98b697246cb10146903672"))
//   ]
//   log.info('call2: ',[])

// mockRefreshContractCalls();

//   //add a contract to the store that my mapping will .load() from
//   let contract = new Contract("123")
//   contract.save()
//   log.info('call4: ',[])
  
//   handleUpdateAdmin(call)
//   log.info('call5: ',[])
//   assert.fieldEquals(CONTRACT_ENTITY_TYPE, "123", "admin", "0x90cBa2Bbb19ecc291A12066Fd8329D65FA1f1947")
//   assert.fieldEquals(CONTRACT_ENTITY_TYPE, "123", "renderProviderAddress", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
//   assert.fieldEquals(CONTRACT_ENTITY_TYPE, "123", "renderProviderPercentage", "100")

//   clearStore();
// }, true)

test("Can add whitelisting to a contract and account", () => {
  let call = changetype<AddWhitelistedCall>(newMockCall())
  
  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  call.block.timestamp = BigInt.fromString('1230')
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
  call.inputValues = [
    new ethereum.EventParam("_address",
    ethereum.Value.fromAddress(addr))
  ]

  mockRefreshContractCalls();
  
  handleAddWhitelisted(call)
  
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "admin", "0x90cba2bbb19ecc291a12066fd8329d65fa1f1947")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "renderProviderAddress", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "renderProviderPercentage", "10")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "nextProjectId", "100")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "createdAt", "1230")

  assert.fieldEquals(ACCOUNT_ENTITY_TYPE, "0x1233973f9aea61250e98b697246cb10146903672", "id", "0x1233973f9aea61250e98b697246cb10146903672")
  
  assert.fieldEquals(WHITELISTING_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672", "contract", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(WHITELISTING_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672", "account", "0x1233973f9aea61250e98b697246cb10146903672")
  clearStore();
}, true)


test("Can delete whitelisting", () => {
  let callToAddWhitelist = changetype<AddWhitelistedCall>(newMockCall())
  let callToRemoveWhitelist = changetype<RemoveWhitelistedCall>(newMockCall())
  let addr1 = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
  let addr2 = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
  
  callToAddWhitelist.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  callToAddWhitelist.block.timestamp = BigInt.fromString('1230')
  callToAddWhitelist.inputValues = [
    new ethereum.EventParam("_address",
    ethereum.Value.fromAddress(addr1))
  ]
  
  callToRemoveWhitelist.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  callToRemoveWhitelist.block.timestamp = BigInt.fromString('1230')
  callToRemoveWhitelist.inputValues = [
    new ethereum.EventParam("_address",
    ethereum.Value.fromAddress(addr2))
  ]

  mockRefreshContractCalls();
  
  handleAddWhitelisted(callToAddWhitelist)
  // logStore();
  assert.fieldEquals(WHITELISTING_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672", "contract", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(WHITELISTING_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672", "account", "0x1233973f9aea61250e98b697246cb10146903672")
  
  handleRemoveWhitelisted(callToRemoveWhitelist)
  
  assert.notInStore(WHITELISTING_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672")
  clearStore();
}, true)

test("Can add and mint whitelisted call", () => {
  let call = changetype<AddMintWhitelistedCall>(newMockCall())
  let addr1 = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
  
  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  call.block.timestamp = BigInt.fromString('1231')
  call.inputValues = [
    new ethereum.EventParam("_address",
    ethereum.Value.fromAddress(addr1))
  ]
  
  mockRefreshContractCalls();
  
  handleAddMintWhitelisted(call)

  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "id", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "mintWhitelisted", "[0x1233973f9aea61250e98b697246cb10146903672]")
  
  assert.notInStore(WHITELISTING_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672")
  clearStore();
}, true)

// test("Can remove a mint whitelisted address", () => {

//   assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "id", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
//   assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "mintWhitelisted", "[0x1233973f9aea61250e98b697246cb10146903672]")
  
//   assert.notInStore(WHITELISTING_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270-0x1233973f9aea61250e98b697246cb10146903672")
//   clearStore();
// }, true)

test("Can update randomizer address", () => {
  let call = changetype<UpdateRandomizerAddressCall>(newMockCall())
  
  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  call.block.timestamp = BigInt.fromString('1230')
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
  call.inputValues = [
    new ethereum.EventParam("_address",
    ethereum.Value.fromAddress(addr))
  ]

  mockRefreshContractCalls();
  
  handleUpdateRandomizerAddress(call)
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "id", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "randomizerContract", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")

  clearStore();
}, true)

test("Can update ArtBlocks address", () => {
  let call = changetype<UpdateArtblocksAddressCall>(newMockCall())
  
  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  call.block.timestamp = BigInt.fromString('1230')
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
  call.inputValues = [
    new ethereum.EventParam("_address",
    ethereum.Value.fromAddress(addr))
  ]

  mockRefreshContractCalls();
  
  handleUpdateArtblocksAddress(call)
  
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "id", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "renderProviderAddress", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")

  clearStore();
}, true)

test("Can update ArtBlocks percentage", () => {
  let call = changetype<UpdateArtblocksPercentageCall>(newMockCall())
  
  call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  call.block.timestamp = BigInt.fromString('1230')
  let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
  call.inputValues = [
    new ethereum.EventParam("_address",
    ethereum.Value.fromAddress(addr))
  ]

  mockRefreshContractCalls();
  
  handleUpdateArtblocksPercentage(call)
  
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "id", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
  assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "renderProviderPercentage", "10")

  clearStore();
}, true)

// Project.load....I need to mock a full Project entity before I can refresh an existing script
// test("Can handle add project script", () => {
//   let call = changetype<AddProjectScriptCall>(newMockCall())
  
//   call.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
//   call.block.timestamp = BigInt.fromString('1230')
//   let addr = Address.fromString("0x1233973F9aEa61250e98b697246cb10146903672")
//   call.inputValues = [
//     new ethereum.EventParam("_projectId",
//     ethereum.Value.fromSignedBigInt(BigInt.fromString('10000')))
//   ]

//   // mockRefreshProjectScript();
  
//   handleAddProjectScript(call)
  
//   // assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "id", "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270")
//   // assert.fieldEquals(CONTRACT_ENTITY_TYPE, "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "renderProviderPercentage", "10")

//   clearStore();
// }, true)

//all these tests are calling Project.load()...mock that Entity
// test("Can clear a Token IPFS image uri", () => {

//   }

// test("Can override token dynamic image with IPFS link", () => {

//   }

// test("Can remove a project's last script", () => {

//   }


// test("Can toggle projectIsActive", () => {
//   let call = changetype<ToggleProjectIsActiveCall>(newMockCall())

//   call.inputValues = [
//     new ethereum.EventParam("_projectId",
//     ethereum.Value.fromString("12345"))
//   ]
//   handleToggleProjectIsActive(call)

//   assert.fieldEquals(PROJECT_ENTITY_TYPE, "0x1233973F9aEa61250e98b697246cb10146903672", "active", "false")

//   clearStore();
// }, true)