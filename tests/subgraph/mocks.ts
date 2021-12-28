import { createMockedFunction, newMockCall } from "matchstick-as/assembly/index"
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { meridianScript } from '../meridianScript';
import { AddProjectCall } from '../../generated/GenArt721Core/GenArt721Core';
import { handleAddProject } from '../../src/mapping';
import { Token } from "../../generated/schema";
import { generateContractSpecificId } from '../../src/helpers';

let coreContractAddress = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270");

export const mockRefreshContractCalls = function(): void {
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
}

export const mockProjectContractCalls = function(): void {
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
    ethereum.Value.fromString(meridianScript),                                           // scriptJSON
    ethereum.Value.fromSignedBigInt(BigInt.fromString("1")),                             // scriptCount
    ethereum.Value.fromBoolean(true),                                                    // useHashString
    ethereum.Value.fromString("mtwirsqawjuoloq2gvtyug2tc3jbf5htm2zeo4rsknfiv3fdp46a"),   // IPFSHash
    ethereum.Value.fromBoolean(true),                                                    // locked
    ethereum.Value.fromBoolean(true)];                                                   // paused
  createMockedFunction(coreContractAddress, 'projectScriptInfo', 'projectScriptInfo(uint256):(string,uint256,bool,string,bool,bool)')
  .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString("99"))])
    .returns(projectScriptInfoReturnArray)
}

export const mockRefreshProjectScript = function(): void {
  let projectScriptByIndexInputs: Array<ethereum.Value> = [
    ethereum.Value.fromSignedBigInt(BigInt.fromString("99")),                                    // projectId
    ethereum.Value.fromSignedBigInt(BigInt.fromString("0"))]                                     // _index;
  createMockedFunction(coreContractAddress, 'projectScriptByIndex', 'projectScriptByIndex(uint256,uint256):(string)')
  .withArgs(projectScriptByIndexInputs)
    .returns([ethereum.Value.fromString(meridianScript)])
}

export const createProjectToLoad = function(): void {
  let newProjectCall = changetype<AddProjectCall>(newMockCall())
  newProjectCall.to = Address.fromString("0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270")  // must be 721Core?
  newProjectCall.block.timestamp = BigInt.fromString('1232')

  newProjectCall.inputValues = [
    new ethereum.EventParam("projectName", 
    ethereum.Value.fromString("Ringers")), 
    new ethereum.EventParam("artistAddress", 
    ethereum.Value.fromString("0x1233973F9aEa61250e98b697246cb10146903672")),
    new ethereum.EventParam("pricePerTokenInWei", 
    ethereum.Value.fromString("123"))
  ]

  handleAddProject(newProjectCall);
}

export const createTokenToLoad = function(address: Address, tokenId: BigInt): void {
    let token = new Token(
        generateContractSpecificId(address, tokenId)
      );

      token.save();
}