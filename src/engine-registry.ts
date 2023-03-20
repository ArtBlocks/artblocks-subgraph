import { BigInt, store, log, Address, Bytes } from "@graphprotocol/graph-ts";

import { refreshContractAtAddress } from "./mapping-v3-core";

import { EngineRegistry, Contract } from "../generated/schema";
import {
  IGenArt721CoreV3_Base_Template,
  OwnableGenArt721CoreV3Contract_Template,
  IERC721GenArt721CoreV3Contract_Template,
  AdminACLV0_Template,
  IGenArt721CoreContractV3_Engine_Flex_Template
} from "../generated/templates";

import {
  ContractRegistered,
  ContractUnregistered
} from "../generated/EngineRegistryV0/IEngineRegistryV0";

import { Ownable } from "../generated/OwnableGenArt721CoreV3Contract/Ownable";

/*** EVENT HANDLERS ***/
// Registered contracts are tracked dynamically, and the contract's `registeredOn`
// field is set to this engine registry.
export function handleContractRegistered(event: ContractRegistered): void {
  // ensure an engine registry entity exists
  const _ = loadOrCreateEngineRegistry(event.address);
  // check if the contract is already registered
  const coreAddress = event.params._contractAddress;
  // dynamically track the new contract if not already in store, and refresh it
  // state to ensure it is up to date
  let contractEntity = Contract.load(coreAddress.toHexString());
  if (!contractEntity) {
    // dynamically track the new contract via its required templates
    IGenArt721CoreV3_Base_Template.create(coreAddress);
    OwnableGenArt721CoreV3Contract_Template.create(coreAddress);
    IERC721GenArt721CoreV3Contract_Template.create(coreAddress);
    // okay to create this template even if the contract is not engine flex as event handlers do not overlap
    IGenArt721CoreContractV3_Engine_Flex_Template.create(coreAddress);
    // also track the new contract's Admin ACL contract to enable indexing if admin changes
    // @dev for V3 core contracts, the admin acl contract is the core contract's owner
    const ownableV3Core = Ownable.bind(coreAddress);
    const adminACLAddress = ownableV3Core.owner();
    AdminACLV0_Template.create(adminACLAddress);
    // refresh contract
    refreshContractAtAddress(coreAddress, event.block.timestamp);
  }
  // set this engine registry as the contract's registeredOn field
  // @dev this will overwrite the previous engine registry if the contract
  // was previously not in store
  let contractEntityReload = Contract.load(coreAddress.toHexString());
  if (contractEntityReload) {
    contractEntityReload.registeredOn = event.address.toHexString();
    contractEntityReload.updatedAt = event.block.timestamp;
    contractEntityReload.save();
  }
}

// Unregistered contracts are not removed from the store, but the contract's
// `registeredOn` field will be nulled if this engine registry is the current
// engine registry.
export function handleContractUnregistered(event: ContractUnregistered): void {
  // ensure an engine registry entity exists
  const _ = loadOrCreateEngineRegistry(event.address);
  // remove this engine registry from the contract's registeredOn field
  const coreAddress = event.params._contractAddress;
  let contractEntity = Contract.load(coreAddress.toHexString());
  if (contractEntity) {
    if (contractEntity.registeredOn == event.address.toHexString()) {
      contractEntity.registeredOn = null;
      contractEntity.save();
    }
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
    engineRegistryEntity.save();
  }
  return engineRegistryEntity as EngineRegistry;
}
