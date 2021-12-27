import { assert, createMockedFunction, clearStore, test, newMockEvent, newMockCall } from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum, store, Value } from "@graphprotocol/graph-ts"
import { Project } from "../../generated/schema";

// nope- we only have 4(?) event types: Transfer, Mint, Approval, ApproveAll
// export function handleNewProject(event: NewProject)

// export function handleNewProject(event: Project): void {
//     let mockEvent = newMockEvent()
//     let newProjectEvent = new Project(
//     mockEvent.address,
//     mockEvent.logIndex,
//     mockEvent.transactionLogIndex,
//     mockEvent.logType,
//     mockEvent.block,
//     mockEvent.transaction,
//     mockEvent.parameters
//     )
// }