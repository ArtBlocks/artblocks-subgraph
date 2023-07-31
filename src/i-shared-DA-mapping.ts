import { ResetAuctionDetails } from "../generated/ISharedDA/ISharedMinterDAV0";

import {
  AuctionMinHalfLifeSecondsUpdated,
  SetAuctionDetailsExp
} from "../generated/ISharedDAExp/ISharedMinterDAExpV0";

import {
  AuctionMinimumLengthSecondsUpdated,
  SetAuctionDetailsLin
} from "../generated/ISharedDALin/ISharedMinterDALinV0";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./i-shared-minter-mapping";

import {
  loadOrCreateMinter,
  updateProjectIfMinterConfigIsActive,
  getTotalDAExpAuctionTime
} from "./helpers";

import {
  setMinterExtraMinterDetailsValue,
  setProjectMinterConfigExtraMinterDetailsValue,
  removeProjectMinterConfigExtraMinterDetailsEntry
} from "./extra-minter-details-helpers";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

// minter-level configuration events

/**
 * handles the update of Exponential Dutch Auction's minimum price decay half life in seconds.
 * @param event The event containing the updated minimum price decay half life in seconds.
 */
export function handleAuctionMinHalfLifeSecondsUpdated(
  event: AuctionMinHalfLifeSecondsUpdated
): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue(
    "minimumHalfLifeInSeconds",
    event.params._minimumPriceDecayHalfLifeSeconds,
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

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
 * Handles the event that resets the auction details for a project.
 * @param event The event carrying the project's core address and project number.
 */
export function handleResetAuctionDetails(event: ResetAuctionDetails): void {
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
  projectMinterConfig.basePrice = null;
  projectMinterConfig.priceIsConfigured = false;
  // @dev we remove all possible auction details for both Exp and Lin auctions,
  // because they share a common interface
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "startPrice",
    projectMinterConfig
  );
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "startTime",
    projectMinterConfig
  );
  // @dev only populated in linear auctions
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "endTime",
    projectMinterConfig
  );
  // @dev only populated in exponential auctions
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "halfLifeSeconds",
    projectMinterConfig
  );
  // @dev only populated in exponential auctions
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "approximateDAExpEndTime",
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

/**
 * Handles the event that updates the auction details for a project using an
 * exponential Dutch auction minter.
 * @param event The event carrying the updated exp auction data.
 */
export function handleSetAuctionDetailsExp(event: SetAuctionDetailsExp): void {
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
    "halfLifeSeconds",
    event.params._priceDecayHalfLifeSeconds,
    projectMinterConfig
  );

  // pre-calculate the approximate DA end time
  const totalAuctionTime = getTotalDAExpAuctionTime(
    event.params._startPrice,
    event.params._basePrice,
    event.params._priceDecayHalfLifeSeconds
  );
  setProjectMinterConfigExtraMinterDetailsValue(
    "approximateDAExpEndTime",
    event.params._auctionTimestampStart.plus(totalAuctionTime),
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
