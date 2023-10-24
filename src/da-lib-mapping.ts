import { ResetAuctionDetails } from "../generated/DALib/DALib";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./generic-minter-events-lib-mapping";

import { updateProjectIfMinterConfigIsActive } from "./helpers";

import { removeProjectMinterConfigExtraMinterDetailsEntry } from "./extra-minter-details-helpers";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

// project-level configuration events

/**
 * Handles the event that resets the auction details for a project.
 * @param event The event carrying the project's core address and project number.
 */
export function handleResetAuctionDetails(event: ResetAuctionDetails): void {
  const minterProjectAndConfig = loadOrCreateMinterProjectAndConfigIfProject(
    event.address, // minter
    event.params.coreContract,
    event.params.projectId,
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

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////
