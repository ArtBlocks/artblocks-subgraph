import {
  DefaultMaxInvocationsPerAddress,
  DelegationRegistryUpdated
} from "../generated/ISharedMerkle/IFilteredSharedMerkle";

import { loadOrCreateMinter } from "./helpers";

import { setMinterExtraMinterDetailsValue } from "./extra-minter-details-helpers";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

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
