// import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts";
// import { createMockedFunction } from "matchstick-as";
// import { meridianScript } from "../../meridianScript";
// import { TEST_PROJECT } from "../shared-mocks";

// export const mockOGProjectContractCalls = function(): void {
//   let projectDetailsReturnArray: Array<ethereum.Value> = [
//     ethereum.Value.fromString("string1"), // projectName
//     ethereum.Value.fromString("string2"), // artist
//     ethereum.Value.fromString("string3"), // description
//     ethereum.Value.fromString("string4"), // website
//     ethereum.Value.fromString("string7"), // license
//     ethereum.Value.fromBoolean(true)
//   ]; // dynamic
//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "projectDetails",
//     "projectDetails(uint256):(string,string,string,string,string,bool)"
//   )
//     .withArgs([
//       ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
//     ])
//     .returns(projectDetailsReturnArray);

//   let projectTokenInfoReturnArray: Array<ethereum.Value> = [
//     ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract)), // artistAddress
//     ethereum.Value.fromSignedBigInt(BigInt.fromString("100000000")), // pricePerTokenInWei
//     ethereum.Value.fromSignedBigInt(
//       BigInt.fromString(TEST_PROJECT.invocations)
//     ), // invocations
//     ethereum.Value.fromSignedBigInt(
//       BigInt.fromString(TEST_PROJECT.maxInvocations)
//     ), // maxInvocations
//     ethereum.Value.fromBoolean(TEST_PROJECT.active), // active
//     ethereum.Value.fromAddress(
//       Address.fromString(TEST_PROJECT.additionalPayee)
//     ), // additionalPayee
//     ethereum.Value.fromSignedBigInt(
//       BigInt.fromString(TEST_PROJECT.additionalPayeePercentage)
//     ) // additionalPayeePercentage
//   ];
//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "projectTokenInfo",
//     "projectTokenInfo(uint256):(address,uint256,uint256,uint256,bool,address,uint256)"
//   )
//     .withArgs([
//       ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
//     ])
//     .returns(projectTokenInfoReturnArray);

//   let projectScriptInfoReturnArray: Array<ethereum.Value> = [
//     ethereum.Value.fromString(meridianScript), // scriptJSON
//     ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // scriptCount
//     ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // hashes
//     ethereum.Value.fromString(TEST_PROJECT.ipfsHash), // ipfsHash
//     ethereum.Value.fromBoolean(TEST_PROJECT.locked), // locked
//     ethereum.Value.fromBoolean(TEST_PROJECT.paused) // paused
//   ];
//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "projectScriptInfo",
//     "projectScriptInfo(uint256):(string,uint256,uint256,string,bool,bool)"
//   )
//     .withArgs([
//       ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
//     ])
//     .returns(projectScriptInfoReturnArray);
// };
