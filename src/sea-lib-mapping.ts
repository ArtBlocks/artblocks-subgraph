import { BigInt, log, JSONValue, TypedMap } from "@graphprotocol/graph-ts";

import {
  MinAuctionDurationSecondsUpdated,
  MinterTimeBufferUpdated,
  MinterRefundGasLimitUpdated,
  ConfiguredFutureAuctions,
  AuctionInitialized,
  AuctionBid,
  AuctionSettled,
  ResetAuctionDetails,
  ProjectNextTokenUpdated,
  ProjectNextTokenEjected
} from "../generated/SEALib/SEALib";

import { Account, Bid } from "../generated/schema";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./generic-minter-events-lib-mapping";

import {
  loadOrCreateMinter,
  generateProjectIdNumberFromTokenIdNumber,
  getMinterExtraMinterDetailsTypedMap,
  getProjectMinterConfigExtraMinterDetailsTypedMap,
  updateProjectIfMinterConfigIsActive,
  generateContractSpecificId,
  generateSEAMinterBidId
} from "./helpers";

import {
  setMinterExtraMinterDetailsValue,
  setProjectMinterConfigExtraMinterDetailsValue,
  mergeProjectMinterConfigExtraMinterDetails,
  removeProjectMinterConfigExtraMinterDetailsEntry
} from "./extra-minter-details-helpers";

import { createTypedMapFromEntries, toJSONValue } from "./json";

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS start here
///////////////////////////////////////////////////////////////////////////////

// minter-level events
export function handleMinAuctionDurationSecondsUpdated(
  event: MinAuctionDurationSecondsUpdated
): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue(
    "minAuctionDurationSeconds",
    event.params.minAuctionDurationSeconds,
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleMinterTimeBufferUpdated(
  event: MinterTimeBufferUpdated
): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue(
    "minterTimeBufferSeconds",
    event.params.minterTimeBufferSeconds,
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleMinterRefundGasLimitUpdated(
  event: MinterRefundGasLimitUpdated
): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue(
    "refundGasLimit",
    BigInt.fromI32(event.params.refundGasLimit),
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

// project-level events
export function handleConfiguredFutureAuctions(
  event: ConfiguredFutureAuctions
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
  // update project minter configuration fields
  projectMinterConfig.priceIsConfigured = true;
  projectMinterConfig.basePrice = event.params.basePrice;
  // update project minter configuration extraMinterDetails json field
  setProjectMinterConfigExtraMinterDetailsValue(
    "startTime",
    event.params.timestampStart,
    projectMinterConfig
  );
  setProjectMinterConfigExtraMinterDetailsValue(
    "projectAuctionDurationSeconds",
    event.params.auctionDurationSeconds,
    projectMinterConfig
  );
  setProjectMinterConfigExtraMinterDetailsValue(
    "minBidIncrementPercentage",
    BigInt.fromI32(event.params.minBidIncrementPercentage),
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

export function handleAuctionInitialized(event: AuctionInitialized): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  const minterProjectAndConfig = loadOrCreateMinterProjectAndConfigIfProject(
    event.address, // minter
    event.params.coreContract,
    projectIdNumber,
    event.block.timestamp
  );
  if (!minterProjectAndConfig) {
    // project wasn't found, warning already logged in helper function
    return;
  }

  const projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
  // update all auction details in project minter configuration extraMinterDetails json field
  let auctionInitializedDetails: TypedMap<
    string,
    JSONValue
  > = createTypedMapFromEntries([
    {
      key: "auctionCurrentBid",
      value: toJSONValue(event.params.bidAmount.toString()) // Bid is likely to overflow js Number.MAX_SAFE_INTEGER so store as string
    },
    {
      key: "auctionCurrentBidder",
      value: toJSONValue(event.params.bidder)
    },
    { key: "auctionEndTime", value: toJSONValue(event.params.endTime) },
    { key: "auctionInitialized", value: toJSONValue(true) },
    { key: "auctionSettled", value: toJSONValue(false) },
    { key: "auctionTokenId", value: toJSONValue(event.params.tokenId) },
    {
      key: "auctionMinBidIncrementPercentage",
      value: toJSONValue(BigInt.fromI32(event.params.minBidIncrementPercentage))
    }
  ]);

  mergeProjectMinterConfigExtraMinterDetails(
    projectMinterConfig,
    auctionInitializedDetails
  );

  removeProjectMinterConfigExtraMinterDetailsEntry(
    "projectNextTokenId",
    projectMinterConfig
  );
  projectMinterConfig.save();

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    projectMinterConfig,
    event.block.timestamp
  );

  // Update Bids entity
  createBidFromValidEvent(event);
}

export function handleAuctionBid(event: AuctionBid): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  const minterProjectAndConfig = loadOrCreateMinterProjectAndConfigIfProject(
    event.address, // minter
    event.params.coreContract,
    projectIdNumber,
    event.block.timestamp
  );
  if (!minterProjectAndConfig) {
    // project wasn't found, warning already logged in helper function
    return;
  }

  const projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  // Get the previous highest bid
  let currentProjectMinterConfigDetails = getProjectMinterConfigExtraMinterDetailsTypedMap(
    projectMinterConfig
  );

  const previousHighestBidValueJSON = currentProjectMinterConfigDetails.get(
    "auctionCurrentBid"
  );
  const previousHighestBidderJSON = currentProjectMinterConfigDetails.get(
    "auctionCurrentBidder"
  );

  // Update winningBid on the previous highest bid, as it is now outbid
  if (previousHighestBidderJSON && previousHighestBidValueJSON) {
    const previousHighestBidId = generateSEAMinterBidId(
      event.address.toHexString(),
      previousHighestBidderJSON.toString(),
      previousHighestBidValueJSON.toString(),
      event.params.tokenId.toString()
    );

    const previousWinningBid = Bid.load(previousHighestBidId);
    if (previousWinningBid) {
      previousWinningBid.winningBid = false;
      previousWinningBid.updatedAt = event.block.timestamp;
      previousWinningBid.save();
    }
  }

  // update relevant auction details in project minter configuration extraMinterDetails json field
  setProjectMinterConfigExtraMinterDetailsValue(
    "auctionCurrentBid",
    event.params.bidAmount.toString(), // Bid is likely to overflow js Number.MAX_SAFE_INTEGER so store as string
    projectMinterConfig
  );
  setProjectMinterConfigExtraMinterDetailsValue(
    "auctionCurrentBidder",
    event.params.bidder,
    projectMinterConfig
  );
  setProjectMinterConfigExtraMinterDetailsValue(
    "auctionCurrentBidTimestamp",
    event.block.timestamp.toString(),
    projectMinterConfig
  );

  // determine if auction end time needs to be updated
  let minterDetails = getMinterExtraMinterDetailsTypedMap(
    minterProjectAndConfig.minter
  );
  const bufferTimeSecondsJSON = minterDetails.get("minterTimeBufferSeconds");
  // @dev: treat null value as zero, even though we will never encounter it, but we check to keep AS happy.
  let bufferTimeSeconds = BigInt.fromI32(0);
  if (bufferTimeSecondsJSON instanceof JSONValue) {
    bufferTimeSeconds = bufferTimeSecondsJSON.toBigInt();
  }
  let earliestAuctionEndTime = event.block.timestamp.plus(bufferTimeSeconds);
  let projectMinterConfigDetails = getProjectMinterConfigExtraMinterDetailsTypedMap(
    projectMinterConfig
  );
  const currentEndTimeJSON = projectMinterConfigDetails.get("auctionEndTime");
  // @dev: treat null value as zero, even though we will never encounter it, but we check to keep AS happy.
  let currentEndTime = BigInt.fromI32(0);
  if (currentEndTimeJSON instanceof JSONValue) {
    currentEndTime = currentEndTimeJSON.toBigInt();
  }
  if (currentEndTime.lt(earliestAuctionEndTime)) {
    setProjectMinterConfigExtraMinterDetailsValue(
      "auctionEndTime",
      earliestAuctionEndTime,
      projectMinterConfig
    );
  }

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    projectMinterConfig,
    event.block.timestamp
  );

  // Update Bids entity
  createBidFromValidEvent(event);
}

export function handleAuctionSettled(event: AuctionSettled): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  const minterProjectAndConfig = loadOrCreateMinterProjectAndConfigIfProject(
    event.address, // minter
    event.params.coreContract,
    projectIdNumber,
    event.block.timestamp
  );
  if (!minterProjectAndConfig) {
    // project wasn't found, warning already logged in helper function
    return;
  }

  const projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
  // update relevant auction details in project minter configuration extraMinterDetails json field
  setProjectMinterConfigExtraMinterDetailsValue(
    "auctionSettled",
    true,
    projectMinterConfig
  );

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    projectMinterConfig,
    event.block.timestamp
  );
}

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
  // reset project minter configuration fields
  projectMinterConfig.priceIsConfigured = false;
  projectMinterConfig.basePrice = BigInt.fromI32(0);
  // clear project minter configuration extraMinterDetails json field
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "startTime",
    projectMinterConfig
  );
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "projectAuctionDurationSeconds",
    projectMinterConfig
  );
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "minBidIncrementPercentage",
    projectMinterConfig
  );

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    projectMinterConfig,
    event.block.timestamp
  );
}

export function handleProjectNextTokenUpdated(
  event: ProjectNextTokenUpdated
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
  // update project next token id in project minter configuration extraMinterDetails json field
  setProjectMinterConfigExtraMinterDetailsValue(
    "projectNextTokenId",
    event.params.tokenId,
    projectMinterConfig
  );

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    projectMinterConfig,
    event.block.timestamp
  );
}

export function handleProjectNextTokenEjected(
  event: ProjectNextTokenEjected
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
  // update project next token id in project minter configuration extraMinterDetails json field
  removeProjectMinterConfigExtraMinterDetailsEntry(
    "projectNextTokenId",
    projectMinterConfig
  );

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

/**
 *
 * @param event AuctionInitialized or AuctionBid event
 * @description This helper function handles the Bid creation for AuctionInitialized and AuctionBid events
 */
function createBidFromValidEvent<T>(event: T): void {
  // Invalid call, not a valid event
  if (
    !(event instanceof AuctionInitialized) &&
    !(event instanceof AuctionBid)
  ) {
    return;
  }
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );
  const minterProjectAndConfig = loadOrCreateMinterProjectAndConfigIfProject(
    event.address, // minter
    event.params.coreContract,
    projectIdNumber,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    // project wasn't found, warning already logged in helper function
    return;
  }

  // Update Bids entity
  const bidId = generateSEAMinterBidId(
    event.address.toHexString(),
    event.params.bidder.toHexString(),
    event.params.bidAmount.toString(),
    event.params.tokenId.toString()
  );

  // @dev: a bid with this ID should not already exist for the SEA Minter
  const bid = new Bid(bidId);
  // Create new account entity if one for the bidder doesn't exist
  const bidderAccount = new Account(event.params.bidder.toHexString());
  bidderAccount.save();

  bid.project = minterProjectAndConfig.project.id;
  bid.minter = event.address.toHexString();
  bid.token = generateContractSpecificId(
    event.params.coreContract,
    event.params.tokenId
  );
  bid.bidder = bidderAccount.id;
  bid.value = event.params.bidAmount;
  bid.winningBid = true;
  bid.timestamp = event.block.timestamp;
  bid.updatedAt = event.block.timestamp;
  bid.save();
}
