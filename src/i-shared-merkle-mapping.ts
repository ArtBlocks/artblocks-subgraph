import {
  DefaultMaxInvocationsPerAddress,
  DelegationRegistryUpdated
} from "../generated/ISharedMerkle/ISharedMinterMerkleV0";

import { loadOrCreateMinter } from "./helpers";

import { setMinterExtraMinterDetailsValue } from "./extra-minter-details-helpers";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

/**
 * Handles the event that updates the default max invocations per address. 
 * Loads or creates the minter, updates the minter's details, and refreshes
 * the minter's timestamp to induce a sync.
 * @param event The event containing the updated max invocations per address.
 */
export function handleDefaultMaxInvocationsPerAddress(
  event: DefaultMaxInvocationsPerAddress
): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue(
    "defaultMaxInvocationsPerAddress",
    event.params.defaultMaxInvocationsPerAddress,
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

/**
 * Handles the event that updates the delegation registry address. 
 * Loads or creates the minter, updates the minter's details, and refreshes
 * the minter's timestamp to induce a sync.
 * @param event The event containing the updated delegation registry address.
 */
export function handleDelegationRegistryUpdated(
  event: DelegationRegistryUpdated
): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue(
    "delegationRegistryAddress",
    event.params.delegationRegistry,
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////
