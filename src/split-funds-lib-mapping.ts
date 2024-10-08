import { BigInt, log, Address } from "@graphprotocol/graph-ts";
import { Project } from "../generated/schema";

import { ProjectCurrencyInfoUpdated } from "../generated/SplitFundsLib/SplitFundsLib";

import { updateProjectIfMinterConfigIsActive } from "./helpers";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./generic-minter-events-lib-mapping";
import { ERC20 } from "../generated/MinterSetPriceERC20/ERC20";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

/**
 * Handles the update of a project's currency information. Attempts to load associated
 * project and its minter configuration, then updates currency address and symbol.
 * @param event The event carrying updated currency information
 */
export function handleProjectCurrencyInfoUpdated(
  event: ProjectCurrencyInfoUpdated
): void {
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
  projectMinterConfig.currencyAddress = event.params.currencyAddress;
  projectMinterConfig.currencySymbol = event.params.currencySymbol;
  projectMinterConfig.currencyDecimals = 18;
  if (event.params.currencyAddress != Address.zero()) {
    let currencyContract = ERC20.bind(event.params.currencyAddress);
    let decimals = currencyContract.try_decimals();
    if (!decimals.reverted) {
      projectMinterConfig.currencyDecimals = decimals.value;
    }
  }

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
