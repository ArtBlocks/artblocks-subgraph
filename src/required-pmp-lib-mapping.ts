import { JSONValue, log } from "@graphprotocol/graph-ts";

import { ProjectRequiredPMPKeysUpdated } from "../generated/RequiredPMPLib/ISharedMinterRequiredPMPV0";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./generic-minter-events-lib-mapping";

import { updateProjectIfMinterConfigIsActive } from "./helpers";

import { setProjectMinterConfigExtraMinterDetailsValue } from "./extra-minter-details-helpers";

import { jsonValueArrayToJSONValue, stringToJSONValue } from "./json";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

export function handleProjectRequiredPMPKeysUpdated(
  event: ProjectRequiredPMPKeysUpdated
): void {
  // load projectMinterConfiguration
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

  const requiredPMPKeys = event.params.requiredPMPKeys;
  const requiredPMPKeysJSON: JSONValue[] = [];
  for (let i = 0; i < requiredPMPKeys.length; i++) {
    const key = requiredPMPKeys[i];
    // @dev json helpers do not escape strings, and extraMinterDetails is
    // re-parsed on every update, so a key that is not JSON-safe would halt
    // indexing of this project minter configuration
    if (!isJSONSafeString(key)) {
      log.warning(
        "[WARN] Skipping required PMP key that is not JSON-safe for project {} on core contract {}, minter {}",
        [
          event.params.projectId.toString(),
          event.params.coreContract.toHexString(),
          event.address.toHexString()
        ]
      );
      continue;
    }
    requiredPMPKeysJSON.push(stringToJSONValue(key));
  }

  // @dev an empty array indicates the project has no required PMP keys
  setProjectMinterConfigExtraMinterDetailsValue(
    "requiredPMPKeys",
    jsonValueArrayToJSONValue(requiredPMPKeysJSON),
    minterProjectAndConfig.projectMinterConfiguration
  );

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    minterProjectAndConfig.projectMinterConfiguration,
    event.block.timestamp
  );
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS start here
///////////////////////////////////////////////////////////////////////////////

function isJSONSafeString(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    // double quote, backslash, and control characters require escaping
    if (charCode == 0x22 || charCode == 0x5c || charCode < 0x20) {
      return false;
    }
  }
  return true;
}

///////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS end here
///////////////////////////////////////////////////////////////////////////////
