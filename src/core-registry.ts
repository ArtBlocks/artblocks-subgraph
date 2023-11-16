import { Address, log, dataSource, BigInt } from "@graphprotocol/graph-ts";

import { refreshContractAtAddress } from "./mapping-v3-core";

import { CoreRegistry, Contract } from "../generated/schema";
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
} from "../generated/CoreRegistry/ICoreRegistryV1";

import { Ownable } from "../generated/OwnableGenArt721CoreV3Contract/Ownable";
import {
  COMPROMISED_ENGINE_REGISTRY_ADDRESS_GOERLI,
  COMPROMISED_ENGINE_REGISTRY_ADDRESS_MAINNET,
  COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_GOERLI,
  COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_MAINNET
} from "./constants";
import { booleanToString } from "./helpers";

/*** EVENT HANDLERS ***/
// Registered contracts are tracked dynamically, and the contract's `registeredOn`
// field is set to this core registry.
export function handleContractRegistered(event: ContractRegistered): void {
  // ensure an engine registry entity exists
  loadOrCreateCoreRegistry(event.address);

  const network = dataSource.network();

  if (
    (network == "goerli" &&
      event.address.toHexString() ==
        COMPROMISED_ENGINE_REGISTRY_ADDRESS_GOERLI &&
      event.block.number >= COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_GOERLI) ||
    (network == "mainnet" &&
      event.address.toHexString() ==
        COMPROMISED_ENGINE_REGISTRY_ADDRESS_MAINNET &&
      event.block.number >= COMPROMISED_ENGINE_REGISTRY_CUTOFF_BLOCK_MAINNET)
  ) {
    log.warning(
      "[WARN] Compromised Core Registry at address {} attempted to register new core contract.",
      [event.address.toHexString()]
    );
    return;
  }

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
    // @dev okay to create this template even if the contract is not engine flex as event handlers do not overlap
    IGenArt721CoreContractV3_Engine_Flex_Template.create(coreAddress);
    // also track the new contract's Admin ACL contract to enable indexing if admin changes
    // @dev for V3 core contracts, the admin acl contract is the core contract's owner
    const ownableV3Core = Ownable.bind(coreAddress);
    const adminACLAddressResult = ownableV3Core.try_owner();
    if (adminACLAddressResult.reverted) {
      // @dev this should never happen, but if it does, we should not create the Admin ACL template
      log.warning(
        "[WARN] V3 Core Contract at address {} does not implement owner() function.",
        [ownableV3Core._address.toHexString()]
      );
      return;
    } else {
      const adminACLAddress = adminACLAddressResult.value;
      AdminACLV0_Template.create(adminACLAddress);
    }
    // refresh contract
    refreshContractAtAddress(coreAddress, event.block.timestamp);
  }
  // set this core registry as the contract's registeredOn field
  // @dev this will overwrite the previous core registry if the contract
  // was previously not in store
  let contractEntityReload = Contract.load(coreAddress.toHexString());
  if (contractEntityReload) {
    contractEntityReload.registeredOn = event.address.toHexString();
    contractEntityReload.updatedAt = event.block.timestamp;
    contractEntityReload.save();
  }
}

// Unregistered contracts are not removed from the store, but the contract's
// `registeredOn` field will be nulled if this core registry is the current
// core registry.
export function handleContractUnregistered(event: ContractUnregistered): void {
  // ensure an core registry entity exists
  loadOrCreateCoreRegistry(event.address);
  // remove this core registry from the contract's registeredOn field
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
function loadOrCreateCoreRegistry(address: Address): CoreRegistry {
  let coreRegistryEntity = CoreRegistry.load(address.toHexString());
  if (!coreRegistryEntity) {
    coreRegistryEntity = new CoreRegistry(address.toHexString());
    // initialize the core registry's registered contracts array
    // must assume empty, since not enumerable mapping in the contract
    // @dev this means we must track core registry contract events
    // immendiatly after deployment to ensure we have a complete list
    // of registered contracts
    coreRegistryEntity.save();
  }
  return coreRegistryEntity as CoreRegistry;
}
