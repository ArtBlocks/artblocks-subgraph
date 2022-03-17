// import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts";
// import { createMockedFunction } from "matchstick-as";
// import { meridianScript } from "../../meridianScript";
// import { TEST_CONTRACT, TEST_PROJECT } from "../shared-mocks";

// // mocks return values for PBAB Soldity contract calls in refreshContract() helper function
// export const mockRefreshContractCalls = function(): void {
//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "admin",
//     "admin():(address)"
//   ).returns([
//     ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.admin))
//   ]);

//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "artblocksAddress",
//     "artblocksAddress():(address)"
//   ).returns([
//     ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract))
//   ]);

//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "renderProviderAddress",
//     "renderProviderAddress():(address)"
//   ).returns([
//     ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract))
//   ]);

//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "renderProviderPercentage",
//     "renderProviderPercentage():(uint256)"
//   ).returns([
//     ethereum.Value.fromSignedBigInt(
//       BigInt.fromString(TEST_CONTRACT.renderProviderPercentage)
//     )
//   ]);

//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "nextProjectId",
//     "nextProjectId():(uint256)"
//   ).returns([ethereum.Value.fromSignedBigInt(BigInt.fromString("100"))]);

//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "randomizerContract",
//     "randomizerContract():(address)"
//   ).returns([
//     ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.contract))
//   ]);
// };

// export const mockProjectDetailsCall = function(): void {
//   let projectDetailsReturnArray: Array<ethereum.Value> = [
//     ethereum.Value.fromString("string1"), // projectName
//     ethereum.Value.fromString("string2"), // artist
//     ethereum.Value.fromString("string3"), // description
//     ethereum.Value.fromString("string4"), // website
//     ethereum.Value.fromString("string7") // license
//   ];

//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "projectDetails",
//     "projectDetails(uint256):(string,string,string,string,string)"
//   )
//     .withArgs([
//       ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
//     ])
//     .returns(projectDetailsReturnArray);
// };

// export const mockProjectTokenInfoCall = function(): void {
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
//     ), // additionalPayeePercentage
//     ethereum.Value.fromString(TEST_PROJECT.currencySymbol), // currency
//     ethereum.Value.fromAddress(Address.fromString(TEST_PROJECT.currencyAddress))
//   ]; // currencyAddress
//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "projectTokenInfo",
//     "projectTokenInfo(uint256):(address,uint256,uint256,uint256,bool,address,uint256,string,address)"
//   )
//     .withArgs([
//       ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
//     ])
//     .returns(projectTokenInfoReturnArray);
// };

// export const mockProjectScriptInfoCall = function(): void {
//   let projectScriptInfoReturnArray: Array<ethereum.Value> = [
//     ethereum.Value.fromString(meridianScript), // scriptJSON
//     ethereum.Value.fromSignedBigInt(BigInt.fromString("1")), // scriptCount
//     ethereum.Value.fromString(TEST_PROJECT.ipfsHash), // IPFSHash
//     ethereum.Value.fromBoolean(TEST_PROJECT.locked), // locked
//     ethereum.Value.fromBoolean(TEST_PROJECT.paused)
//   ]; // paused
//   createMockedFunction(
//     Address.fromString(TEST_PROJECT.contract),
//     "projectScriptInfo",
//     "projectScriptInfo(uint256):(string,uint256,string,bool,bool)"
//   )
//     .withArgs([
//       ethereum.Value.fromSignedBigInt(BigInt.fromString(TEST_PROJECT.projectId))
//     ])
//     .returns(projectScriptInfoReturnArray);
// };
