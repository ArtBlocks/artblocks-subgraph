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

export function handlePricePerTokenInWeiUpdated(
  event: PricePerTokenInWeiUpdated
): void {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = tryLoadProject(
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

  // update project's updatedAt timestamp to induce a sync
  // @dev this may induce a sync if the project's minter is not this minter,
  // but good to consider the project as "updated", as it could switch to this
  // minter in the future
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleProjectCurrencyInfoUpdated(
  event: ProjectCurrencyInfoUpdated
): void {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = tryLoadProject(
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

  // update project's updatedAt timestamp to induce a sync
  // @dev this may induce a sync if the project's minter is not this minter,
  // but good to consider the project as "updated", as it could switch to this
  // minter in the future
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleProjectMaxInvocationsLimitUpdated(
  event: ProjectMaxInvocationsLimitUpdated
): void {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = tryLoadProject(
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

  // update project's updatedAt timestamp to induce a sync
  // @dev this may induce a sync if the project's minter is not this minter,
  // but good to consider the project as "updated", as it could switch to this
  // minter in the future
  project.updatedAt = event.block.timestamp;
  project.save();
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS start here
///////////////////////////////////////////////////////////////////////////////
/**
 * Helper function to attempt to load a project from the store. If the project
 * does not exist, returns null.
 * @param coreContractAddress core contract address of the project
 * @param projectNumber project number of the project (BigInt)
 * @returns The Project entity from the store if it exists, otherwise null
 */
function tryLoadProject(
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
