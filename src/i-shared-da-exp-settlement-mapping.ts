import { Address, BigInt, log, ethereum } from "@graphprotocol/graph-ts";
import {
  ReceiptUpdated,
  ISharedMinterDAExpSettlementV0
} from "../generated/ISharedDAExpSettlement/ISharedMinterDAExpSettlementV0";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./i-shared-minter-mapping";

import {
  loadOrCreateMinter,
  updateProjectIfMinterConfigIsActive,
  getTotalDAExpAuctionTime,
  generateContractSpecificId,
  loadOrCreateReceipt,
  MinterProjectAndConfig
} from "./helpers";

import {
  setMinterExtraMinterDetailsValue,
  setProjectMinterConfigExtraMinterDetailsValue
} from "./extra-minter-details-helpers";

import { Receipt } from "../generated/schema";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

// project-level configuration events

// note: state at the time of updating auctionRevenuesCollected to true is performed
// in an after-update hook in the handler for the generic event

/**
 * Handles the event that updates the Receipt of a collector on a project.
 * @param event The event carrying the updated Receipt data.
 */
export function handleReceiptUpdated(event: ReceiptUpdated): void {
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

  // load or create receipt
  let projectId = generateContractSpecificId(
    event.params._coreContract,
    event.params._projectId
  );
  let receipt: Receipt = loadOrCreateReceipt(
    minterProjectAndConfig.minter.id,
    projectId,
    event.params._purchaser,
    event.block.timestamp
  );
  // update receipt state
  receipt.netPosted = event.params._netPosted;
  receipt.numPurchased = BigInt.fromI32(event.params._numPurchased);
  receipt.updatedAt = event.block.timestamp;
  receipt.save();

  // additionally, sync latest purchase price and number of settleable
  // purchases for project on this minter
  // @dev this is because this can be the only event emitted from the
  // minter during a purchase on a settleable minter
  syncLatestPurchasePrice(minterProjectAndConfig, event.block.timestamp);
  syncNumSettleableInvocations(minterProjectAndConfig, event.block.timestamp);

  // sync functions already induce sync if the project minter configuration is
  // the active one, so no need to induce sync here
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// HELPERS start here
///////////////////////////////////////////////////////////////////////////////

/**
 * @notice Syncs a settleable minter's project latest purchase price in
 * extraMinterDetails to the current value on the minter.
 * @param minterProjectAndConfig MinterProjectAndConfig object to by synced
 * @param timestamp The timestamp of the event that triggered this sync
 */
function syncLatestPurchasePrice(
  minterProjectAndConfig: MinterProjectAndConfig,
  timestamp: BigInt
): void {
  const settleableMinter = ISharedMinterDAExpSettlementV0.bind(
    Address.fromString(minterProjectAndConfig.minter.id)
  );
  const coreContractAddress = minterProjectAndConfig.project.contract;
  const latestPurchasePriceResult = settleableMinter.try_getProjectLatestPurchasePrice(
    minterProjectAndConfig.project.projectId,
    Address.fromString(coreContractAddress)
  );
  // handle revert (unexpected, so log warning for debugging)
  if (latestPurchasePriceResult.reverted) {
    log.warning(
      "Failed to sync latest purchase price for project {} on core contract {} on minter {}",
      [
        minterProjectAndConfig.project.projectId.toString(),
        coreContractAddress,
        minterProjectAndConfig.minter.id
      ]
    );
    // return early and abort sync.
    return;
  }
  // update extraMinterDetails key `currentSettledPrice` to be latestPurchasePrice
  setProjectMinterConfigExtraMinterDetailsValue(
    "currentSettledPrice",
    latestPurchasePriceResult.value.toString(), // Price is likely to overflow js Number.MAX_SAFE_INTEGER, so store as string
    minterProjectAndConfig.projectMinterConfiguration
  );

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    minterProjectAndConfig.projectMinterConfiguration,
    timestamp
  );
}

/**
 * @notice Syncs a settleable minter's project num settleable invocations in
 * extraMinterDetails to the current value on the minter.
 * @param minterProjectAndConfig MinterProjectAndConfig object to by synced
 * @param timestamp The timestamp of the event that triggered this sync
 */
function syncNumSettleableInvocations(
  minterProjectAndConfig: MinterProjectAndConfig,
  timestamp: BigInt
): void {
  const settleableMinter = ISharedMinterDAExpSettlementV0.bind(
    Address.fromString(minterProjectAndConfig.minter.id)
  );
  const coreContractAddress = minterProjectAndConfig.project.contract;
  const numSettleableInvocationsResult = settleableMinter.try_getNumSettleableInvocations(
    minterProjectAndConfig.project.projectId,
    Address.fromString(coreContractAddress)
  );
  // handle revert (unexpected, so log warning for debugging)
  if (numSettleableInvocationsResult.reverted) {
    log.warning(
      "Failed to sync num settleable invocations for project {} on core contract {} on minter {}",
      [
        minterProjectAndConfig.project.projectId.toString(),
        coreContractAddress,
        minterProjectAndConfig.minter.id
      ]
    );
    // return early and abort sync.
    return;
  }
  // update extraMinterDetails key `currentSettledPrice` to be latestPurchasePrice
  setProjectMinterConfigExtraMinterDetailsValue(
    "numSettleableInvocations",
    numSettleableInvocationsResult.value,
    minterProjectAndConfig.projectMinterConfiguration
  );

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    minterProjectAndConfig.projectMinterConfiguration,
    timestamp
  );
}

///////////////////////////////////////////////////////////////////////////////
// HELPERS end here
///////////////////////////////////////////////////////////////////////////////
