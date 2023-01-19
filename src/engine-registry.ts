import { BigInt, store, log, Address, Bytes } from "@graphprotocol/graph-ts";

import { EngineRegistry } from "../generated/schema";

import {
  ContractRegistered,
  ContractUnregistered
} from "../generated/EngineRegistryV0/IEngineRegistryV0";

/*** EVENT HANDLERS ***/
export function handleContractRegistered(event: ContractRegistered): void {
  // todo: implement this
  throw new Error("Not implemented yet");
}

export function handleContractUnregistered(event: ContractUnregistered): void {
  // todo: implement this
  throw new Error("Not implemented yet");
}
