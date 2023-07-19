import { BigInt, log, Address } from "@graphprotocol/graph-ts";
import { Project } from "../generated/schema";

import {
  PricePerTokenInWeiUpdated,
  ProjectCurrencyInfoUpdated,
  ProjectMaxInvocationsLimitUpdated
} from "../generated/ISharedMinterV0/ISharedMinterV0";

import {
  loadOrCreateMinter,
  generateContractSpecificId,
  loadOrCreateProjectMinterConfiguration
} from "./helpers";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

/**
 * Handles the update of price per token in wei. Attempts to load associated project and 
 * its minter configuration, then updates base price in the configuration.
 * @param event The event carrying new price per token in wei
 */
export function handlePricePerTokenInWeiUpdated(
  event: PricePerTokenInWeiUpdated
): void {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = loadProjectByCoreAddressAndProjectNumber(
    event.params._coreContract,
    event.params._projectId
  );
  if (!project) {
    log.warning("Project {} not found for core contract {}", [
      event.params._projectId.toString(),
      event.params._coreContract.toHexString()
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

  projectMinterConfig.basePrice = event.params._pricePerTokenInWei;
  projectMinterConfig.priceIsConfigured = true;
  projectMinterConfig.save();

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

/**
 * Handles the update of a project's currency information. Attempts to load associated 
 * project and its minter configuration, then updates currency address and symbol.
 * @param event The event carrying updated currency information
 */
export function handleProjectCurrencyInfoUpdated(
  event: ProjectCurrencyInfoUpdated
): void {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = loadProjectByCoreAddressAndProjectNumber(
    event.params._coreContract,
    event.params._projectId
  );
  if (!project) {
    log.warning("Project {} not found for core contract {}", [
      event.params._projectId.toString(),
      event.params._coreContract.toHexString()
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

  projectMinterConfig.currencyAddress = event.params._currencyAddress;
  projectMinterConfig.currencySymbol = event.params._currencySymbol;
  projectMinterConfig.save();

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

/**
 * Handles the update of a project's max invocations limit. Attempts to load associated 
 * project and its minter configuration, then updates max invocations in the configuration.
 * @param event The event carrying updated max invocations limit
 */
export function handleProjectMaxInvocationsLimitUpdated(
  event: ProjectMaxInvocationsLimitUpdated
): void {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = loadProjectByCoreAddressAndProjectNumber(
    event.params._coreContract,
    event.params._projectId
  );
  if (!project) {
    log.warning("Project {} not found for core contract {}", [
      event.params._projectId.toString(),
      event.params._coreContract.toHexString()
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

  projectMinterConfig.maxInvocations = event.params._maxInvocations;
  projectMinterConfig.save();

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS start here
///////////////////////////////////////////////////////////////////////////////
/**
 * Helper function to attempt to load a project from the store, based on core
 * contract address and project number. If the project does not exist, returns
 * null.
 * @param coreContractAddress core contract address of the project
 * @param projectNumber project number of the project (BigInt)
 * @returns The Project entity from the store if it exists, otherwise null
 */
function loadProjectByCoreAddressAndProjectNumber(
  coreContractAddress: Address,
  projectNumber: BigInt
): Project | null {
  const fullProjectId = generateContractSpecificId(
    coreContractAddress,
    projectNumber
  );
  return Project.load(fullProjectId);
}

///////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS end here
///////////////////////////////////////////////////////////////////////////////
