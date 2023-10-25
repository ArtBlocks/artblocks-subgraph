import { BigInt, log, Address } from "@graphprotocol/graph-ts";
import { Project } from "../generated/schema";

import { PricePerTokenUpdated } from "../generated/SetPriceLib/SetPriceLib";

import {
  loadOrCreateMinter,
  loadOrCreateProjectMinterConfiguration,
  updateProjectIfMinterConfigIsActive
} from "./helpers";

import { loadProjectByCoreAddressAndProjectNumber } from "./generic-minter-events-lib-mapping";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

/**
 * Handles the update of price per token. Attempts to load associated project and
 * its minter configuration, then updates base price in the configuration.
 * @param event The event carrying new price per token (no decimals)
 */
export function handlePricePerTokenUpdated(event: PricePerTokenUpdated): void {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = loadProjectByCoreAddressAndProjectNumber(
    event.params.coreContract,
    event.params.projectId
  );
  if (!project) {
    log.warning("Project {} not found for core contract {}", [
      event.params.projectId.toString(),
      event.params.coreContract.toHexString()
    ]);
    return;
  }

  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // load or create project minter configuration
  const projectMinterConfig = loadOrCreateProjectMinterConfiguration(
    project,
    minter
  );

  projectMinterConfig.basePrice = event.params.pricePerToken;
  projectMinterConfig.priceIsConfigured = true;
  projectMinterConfig.save();

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    project,
    projectMinterConfig,
    event.block.timestamp
  );
}

/**
 * Handles the reset of price per token. Attempts to load associated project and
 * its minter configuration, then resets base price in the configuration,
 * marking its price as not configured and setting price to 0.
 * @param event The event carrying which project was reset
 */
export function handlePricePerTokenReset(event: PricePerTokenUpdated): void {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = loadProjectByCoreAddressAndProjectNumber(
    event.params.coreContract,
    event.params.projectId
  );
  if (!project) {
    log.warning("Project {} not found for core contract {}", [
      event.params.projectId.toString(),
      event.params.coreContract.toHexString()
    ]);
    return;
  }

  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // load or create project minter configuration
  const projectMinterConfig = loadOrCreateProjectMinterConfiguration(
    project,
    minter
  );

  projectMinterConfig.basePrice = BigInt.fromI32(0);
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.save();

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    project,
    projectMinterConfig,
    event.block.timestamp
  );
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////
