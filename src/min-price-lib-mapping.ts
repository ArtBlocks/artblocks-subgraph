import { MinMintFeeUpdated } from "../generated/MinPriceLib/MinPriceLib";
import { loadOrCreateMinter } from "./helpers";
import { setMinterExtraMinterDetailsValue } from "./extra-minter-details-helpers";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

/**
 * Handles the update of contract-level min mint fee.
 * Loads or creates the minter, updates the minter's extra minter details with
 * the updated value, and induces a sync of the minter entity.
 * @param event The event carrying new min mint fee value.
 */
export function handleMinMintFeeUpdated(event: MinMintFeeUpdated): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter entity
  setMinterExtraMinterDetailsValue(
    "minMintFee",
    event.params.minMintFee.toString(),
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////
