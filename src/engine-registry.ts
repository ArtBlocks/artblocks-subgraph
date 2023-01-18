import { BigInt, store, log, Address, Bytes } from "@graphprotocol/graph-ts";

import { refreshContractAtAddress } from "./mapping-v3-core";

import { EngineRegistry, Contract } from "../generated/schema";
import { GenArt721CoreV3_Dynamic } from "../generated/templates";

import {
  ContractRegistered,
  ContractUnregistered
} from "../generated/EngineRegistryV0/IEngineRegistryV0";

/*** EVENT HANDLERS ***/
export function handleContractRegistered(event: ContractRegistered): void {
  // ensure an engine registry entity exists
  const engineRegistryEntity = loadOrCreateEngineRegistry(event.address);
  // check if the contract is already registered
  const coreAddress = event.params._contractAddress;
  const registeredContracts = engineRegistryEntity.registeredContracts;
  const isRegistered = indexOf(
    registeredContracts,
    coreAddress.toHexString()
  ).gt(BigInt.fromI32(-1));
  // only register the contract if it is not already registered
  if (!isRegistered) {
    // add the contract to the engine registry
    registeredContracts.push(coreAddress.toHexString());
    engineRegistryEntity.registeredContracts = registeredContracts;
    engineRegistryEntity.save();
  }
  // dynamically track the new contract if not already in store, and refresh it
  // state to ensure it is up to date
  let contractEntity = Contract.load(coreAddress.toHexString());
  if (!contractEntity) {
    GenArt721CoreV3_Dynamic.create(event.params._contractAddress);
    refreshContractAtAddress(
      event.params._contractAddress,
      event.block.timestamp
    );
  }
}

// Unregistered contracts are not removed from the store, but the contract
// will be removed from the engine registry's registeredContracts array.
export function handleContractUnregistered(event: ContractUnregistered): void {
  // ensure an engine registry entity exists
  const engineRegistryEntity = loadOrCreateEngineRegistry(event.address);
  // check if the contract is registered
  const coreAddress = event.params._contractAddress;
  const registeredContracts = engineRegistryEntity.registeredContracts;
  const contractRegisteredIndex = indexOf(
    registeredContracts,
    coreAddress.toHexString()
  );
  // un-register if it is registered
  if (contractRegisteredIndex >= BigInt.fromI32(0)) {
    registeredContracts[contractRegisteredIndex.toI32()] =
      registeredContracts[registeredContracts.length - 1];
    registeredContracts.pop();
    engineRegistryEntity.registeredContracts = registeredContracts;
    engineRegistryEntity.save();
  }
  // We do not remove the contract entity from the store because it will likely
  // be re-added upon handling the contract's next emitted event.
  // This is because we cannot remove a data source template from the subgraph.
}

/*** HELPER FUNCTIONS ***/
function loadOrCreateEngineRegistry(address: Address): EngineRegistry {
  let engineRegistryEntity = EngineRegistry.load(address.toHexString());
  if (!engineRegistryEntity) {
    engineRegistryEntity = new EngineRegistry(address.toHexString());
    // initialize the engine registry's registered contracts array
    // must assume empty, since not enumerable mapping in the contract
    // @dev this means we must track engine registry contract events
    // immendiatly after deployment to ensure we have a complete list
    // of registered contracts
    engineRegistryEntity.registeredContracts = [];
    engineRegistryEntity.save();
  }
  return engineRegistryEntity as EngineRegistry;
}

function indexOf(array: string[], value: string): BigInt {
  for (
    let i = BigInt.fromI32(0);
    i.lt(BigInt.fromI32(array.length));
    i = i.plus(BigInt.fromI32(1))
  ) {
    if (array[i.toI32()] == value) {
      return i;
    }
  }
  return BigInt.fromI32(-1);
}
