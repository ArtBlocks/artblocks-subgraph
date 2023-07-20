import { Bytes } from "@graphprotocol/graph-ts";

import {
  DelegationRegistryUpdated,
  AllowedHoldersOfProjects,
  RemovedHoldersOfProjects
} from "../generated/ISharedHolder/ISharedMinterHolderV0";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./i-shared-minter-mapping";

import {
  loadOrCreateMinter,
  updateProjectIfMinterConfigIsActive
} from "./helpers";

import {
  setMinterExtraMinterDetailsValue,
  addProjectMinterConfigExtraMinterDetailsManyValue,
  removeProjectMinterConfigExtraMinterDetailsManyValue
} from "./extra-minter-details-helpers";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

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

export function handleAllowedHoldersOfProjects(
  event: AllowedHoldersOfProjects
): void {
  handleHoldersOfProjectsGeneric(event);
}

export function handleRemovedHoldersOfProjects(
  event: RemovedHoldersOfProjects
): void {
  handleHoldersOfProjectsGeneric(event);
}

/**
 * Helper function for both AllowedHoldersOfProjects and RemovedHoldersOfProjects.
 * @dev This function is used because the two events induce nearly the same
 * behavior, except one adds to the allowlist and the other removes from it,
 * therefore much of the event handling logic can be shared.
 */
function handleHoldersOfProjectsGeneric<EventType>(event: EventType): void {
  if (
    !(
      event instanceof AllowedHoldersOfProjects ||
      event instanceof RemovedHoldersOfProjects
    )
  ) {
    return;
  }
  // load projectMinterConfiguration
  let minterProjectAndConfig = loadOrCreateMinterProjectAndConfigIfProject(
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
  for (let i = 0; i < event.params._ownedNFTAddresses.length; i++) {
    let address = event.params._ownedNFTAddresses[i].toHexString();
    let holderProjectId = event.params._ownedNFTProjectIds[i].toString();
    let bytesValueCombined = Bytes.fromUTF8(address + "-" + holderProjectId);

    if (event instanceof AllowedHoldersOfProjects) {
      addProjectMinterConfigExtraMinterDetailsManyValue(
        projectMinterConfig,
        "allowlistedAddressAndProjectId",
        bytesValueCombined
      );
    } else {
      // event instanceof RemovedHoldersOfProjects
      removeProjectMinterConfigExtraMinterDetailsManyValue(
        projectMinterConfig,
        "allowlistedAddressAndProjectId",
        bytesValueCombined
      );
    }
  }

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
