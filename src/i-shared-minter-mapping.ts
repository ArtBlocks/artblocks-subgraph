import { BigInt, log, Address } from "@graphprotocol/graph-ts";
import { Project } from "../generated/schema";

import {
  PricePerTokenInWeiUpdated,
  ProjectCurrencyInfoUpdated,
  ProjectMaxInvocationsLimitUpdated,
  // generic events
  ConfigValueSet as ConfigValueSetBool,
  ConfigValueSet1 as ConfigValueSetBigInt,
  ConfigValueSet2 as ConfigValueSetAddress,
  ConfigValueSet3 as ConfigValueSetBytes,
  ConfigKeyRemoved,
  ConfigValueAddedToSet as ConfigValueAddedToSetBigInt,
  ConfigValueAddedToSet1 as ConfigValueAddedToSetAddress,
  ConfigValueAddedToSet2 as ConfigValueAddedToSetBytes,
  ConfigValueRemovedFromSet as ConfigValueRemovedFromSetBigInt,
  ConfigValueRemovedFromSet1 as ConfigValueRemovedFromSetAddress,
  ConfigValueRemovedFromSet2 as ConfigValueRemovedFromSetBytes
} from "../generated/ISharedMinterV0/ISharedMinterV0";

import {
  MinterProjectAndConfig,
  loadOrCreateMinter,
  generateContractSpecificId,
  loadOrCreateProjectMinterConfiguration
} from "./helpers";

import {
  setProjectMinterConfigExtraMinterDetailsValue,
  removeProjectMinterConfigExtraMinterDetailsEntry,
  addProjectMinterConfigExtraMinterDetailsManyValue
} from "./extra-minter-details-helpers";

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
  projectMinterConfig.currencyAddress = event.params._currencyAddress;
  projectMinterConfig.currencySymbol = event.params._currencySymbol;
  projectMinterConfig.save();

  // update project's updatedAt timestamp to induce a sync
  // @dev this may induce a sync if the project's minter is not this minter,
  // but good to consider the project as "updated", as it could switch to this
  // minter in the future
  const project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleProjectMaxInvocationsLimitUpdated(
  event: ProjectMaxInvocationsLimitUpdated
): void {
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
  projectMinterConfig.maxInvocations = event.params._maxInvocations;
  projectMinterConfig.save();

  // update project's updatedAt timestamp to induce a sync
  // @dev this may induce a sync if the project's minter is not this minter,
  // but good to consider the project as "updated", as it could switch to this
  // minter in the future
  const project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// GENERIC EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

// CONFIG VALUE SET HANDLERS
export function handleConfigValueSetBool(event: ConfigValueSetBool): void {
  handleSetValueProjectMinterConfig(event);
}

export function handleConfigValueSetBigInt(event: ConfigValueSetBigInt): void {
  handleSetValueProjectMinterConfig(event);
}

export function handleConfigValueSetAddress(
  event: ConfigValueSetAddress
): void {
  handleSetValueProjectMinterConfig(event);
}

export function handleConfigValueSetBytes(event: ConfigValueSetBytes): void {
  handleSetValueProjectMinterConfig(event);
}

export function handleSetValueProjectMinterConfig<EventType>(
  event: EventType
): void {
  if (
    !(
      event instanceof ConfigValueSetBool ||
      event instanceof ConfigValueSetBigInt ||
      event instanceof ConfigValueSetAddress ||
      event instanceof ConfigValueSetBytes
    )
  ) {
    return;
  }

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
  setProjectMinterConfigExtraMinterDetailsValue(
    event.params._key.toString(),
    event.params._value,
    projectMinterConfig
  );

  const project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

// CONFIG VALUE REMOVED HANDLER
export function handleConfigKeyRemoved(event: ConfigKeyRemoved): void {
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
  removeProjectMinterConfigExtraMinterDetailsEntry(
    event.params._key.toString(),
    projectMinterConfig
  );

  const project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

// CONFIG VALUE ADDED TO SET HANDLERS
export function handleConfigValueAddedToSetBigInt(
  event: ConfigValueAddedToSetBigInt
): void {
  handleAddToSetProjectMinterConfig(event);
}

export function handleConfigValueAddedToSetAddress(
  event: ConfigValueAddedToSetAddress
): void {
  handleAddToSetProjectMinterConfig(event);
}

export function handleConfigValueAddedToSetBytes(
  event: ConfigValueAddedToSetBytes
): void {
  handleAddToSetProjectMinterConfig(event);
}

export function handleAddToSetProjectMinterConfig<EventType>(
  event: EventType
): void {
  if (
    !(
      event instanceof ConfigValueAddedToSetBigInt ||
      event instanceof ConfigValueAddedToSetAddress ||
      event instanceof ConfigValueAddedToSetBytes
    )
  ) {
    return;
  }

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
  addProjectMinterConfigExtraMinterDetailsManyValue(
    projectMinterConfig,
    event.params._key.toString(),
    event.params._value
  );

  const project = minterProjectAndConfig.project;
  project.updatedAt = event.block.timestamp;
  project.save();
}

///////////////////////////////////////////////////////////////////////////////
// GENERIC EVENT HANDLERS end here
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

function loadOrCreateMinterProjectAndConfigIfProject(
  minterAddress: Address,
  coreContractAddress: Address,
  projectNumber: BigInt,
  timestamp: BigInt
): MinterProjectAndConfig | null {
  // attempt to load project, if it doesn't exist, log a warning and return
  // @dev we don't support or allow minters to pre-configure projects that do
  // not yet exist
  const project = tryLoadProject(coreContractAddress, projectNumber);
  if (!project) {
    log.warning("Project {} not found for core contract {}", [
      projectNumber.toString(),
      coreContractAddress.toHexString()
    ]);
    return null;
  }
  const minter = loadOrCreateMinter(minterAddress, timestamp);
  const projectMinterConfiguration = loadOrCreateProjectMinterConfiguration(
    project,
    minter
  );
  return { project, minter, projectMinterConfiguration };
}

///////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS end here
///////////////////////////////////////////////////////////////////////////////
