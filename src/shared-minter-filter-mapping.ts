import { BigInt, log, Address } from "@graphprotocol/graph-ts";
import { MinterFilter, CoreRegistry } from "../generated/schema";

import {
  IMinterFilterV1,
  Deployed,
  MinterApprovedGlobally,
  MinterRevokedGlobally,
  MinterApprovedForContract,
  MinterRevokedForContract,
  ProjectMinterRegistered,
  ProjectMinterRemoved,
  CoreRegistryUpdated
} from "../generated/SharedMinterFilter/IMinterFilterV1";

export function handleDeployed(event: Deployed): void {
  // we simply create a new MinterFilter entity to ensure that it is in the
  // store. This enables us to determine if a MinterFilter is in our subgraph
  // configuration by checking if it is in the store.
  loadOrCreateMinterFilter(event.address, event.block.timestamp);
}

///////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS
///////////////////////////////////////////////////////////////////////////////

/**
 * Helper function to load or create a shared minter filter.
 * Assumes:
 *  - the minter filter conforms to IMinterFilterV1 when creating a new minter
 * filter.
 *  - the minterGlobalAllowlist is empty when initializing a new minter filter
 * @returns MinterFilter entity (either loaded or created)
 */
function loadOrCreateMinterFilter(
  minterFilterAddress: Address,
  timestamp: BigInt
): MinterFilter {
  let minterFilter = MinterFilter.load(minterFilterAddress.toHexString());
  if (minterFilter) {
    return minterFilter;
  }
  // target MinterFilter was not in store, so create new one
  minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  minterFilter.minterGlobalAllowlist = [];
  // safely retrieve the core registry address from the minter filter
  let minterFilterContract = IMinterFilterV1.bind(minterFilterAddress);
  const coreRegistryResult = minterFilterContract.try_coreRegistry();
  let coreRegistryAddress: Address;
  if (coreRegistryResult.reverted) {
    // unexpected minter filter behavior - log a warning, and assign to a dummy
    // core registry at zero address
    log.warning(
      "[WARN] Could not load core registry on MinterFilter contract at address {}, so set core registry to null address on entity.",
      [minterFilterAddress.toHexString()]
    );
    coreRegistryAddress = Address.zero();
  } else {
    coreRegistryAddress = coreRegistryResult.value;
  }
  // load or create the core registry entity, and assign to the minter filter
  const coreRegistry = loadOrCreateCoreRegistry(coreRegistryAddress);
  minterFilter.coreRegistry = coreRegistry.id;

  minterFilter.updatedAt = timestamp;
  minterFilter.save();

  return minterFilter;
}

/**
 * helper function that loads or creates a CoreRegistry entity in the store.
 * @param address core registry address
 * @returns CoreRegistry entity (either loaded or created)
 */
function loadOrCreateCoreRegistry(address: Address): CoreRegistry {
  let coreRegistry = CoreRegistry.load(address.toHexString());
  if (coreRegistry) {
    return coreRegistry;
  }
  coreRegistry = new CoreRegistry(address.toHexString());
  coreRegistry.save();
  return coreRegistry;
}
