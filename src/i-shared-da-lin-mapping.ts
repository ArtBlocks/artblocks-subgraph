import {
  AuctionMinimumLengthSecondsUpdated,
  SetAuctionDetailsLin
} from "../generated/ISharedDALin/ISharedMinterDALinV0";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./i-shared-minter-mapping";

import {
  loadOrCreateMinter,
  updateProjectIfMinterConfigIsActive
} from "./helpers";

import {
  setMinterExtraMinterDetailsValue,
  setProjectMinterConfigExtraMinterDetailsValue
} from "./extra-minter-details-helpers";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

// minter-level configuration events

/**
 * handles the update of a Linear Dutch Auction's minimum auction length in seconds.
 * @param event The event containing the updated minimum auction length in seconds.
 */
export function handleAuctionMinimumLengthSecondsUpdated(
  event: AuctionMinimumLengthSecondsUpdated
): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue(
    "minimumAuctionLengthInSeconds",
    event.params._minimumAuctionLengthSeconds,
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

// project-level configuration events

/**
 * Handles the event that updates the auction details for a project using an
 * linear Dutch auction minter.
 * @param event The event carrying the updated lin auction data.
 */
export function handleSetAuctionDetailsLin(event: SetAuctionDetailsLin): void {
  const minterProjectAndConfig = loadOrCreateMinterProjectAndConfigIfProject(
    event.address, // minter
    event.params._coreContract,
    event.params._projectId,
    event.block.timestamp
  );
  if (!minterProjectAndConfig) {
    // project wasn't found, warning already logged in helper function
    return;
  }

  const projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
  // remove the auction details from the project minter config

  projectMinterConfig.basePrice = event.params._basePrice;
  projectMinterConfig.priceIsConfigured = true;
  setProjectMinterConfigExtraMinterDetailsValue(
    "startPrice",
    event.params._startPrice.toString(), // Price is likely to overflow js Number.MAX_SAFE_INTEGER so store as string
    projectMinterConfig
  );
  setProjectMinterConfigExtraMinterDetailsValue(
    "startTime",
    event.params._auctionTimestampStart,
    projectMinterConfig
  );
  setProjectMinterConfigExtraMinterDetailsValue(
    "endTime",
    event.params._auctionTimestampEnd,
    projectMinterConfig
  );

  projectMinterConfig.save();

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    projectMinterConfig,
    event.block.timestamp
  );
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////
