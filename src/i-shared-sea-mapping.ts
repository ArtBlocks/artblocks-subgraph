import { Bytes, JSONValue, TypedMap } from "@graphprotocol/graph-ts";

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
} from "../generated/ISharedSEA/ISharedMinterSEAV0";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./i-shared-minter-mapping";

import {
  loadOrCreateMinter,
  generateProjectIdNumberFromTokenIdNumber,
  getMinterExtraMinterDetailsTypedMap,
  getProjectMinterConfigExtraMinterDetailsTypedMap
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
    event.params.refundGasLimit,
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
    event.params.minBidIncrementPercentage,
    projectMinterConfig
  );
  projectMinterConfig.save();

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  const project = minterProjectAndConfig.project;
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
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
    { key: "auctionCurrentBidder", value: toJSONValue(event.params.bidder) },
    { key: "auctionEndTime", value: toJSONValue(event.params.endTime) },
    { key: "auctionInitialized", value: toJSONValue(true) },
    { key: "auctionSettled", value: toJSONValue(false) },
    { key: "auctionTokenId", value: toJSONValue(event.params.tokenId) },
    {
      key: "auctionMinBidIncrementPercentage",
      value: toJSONValue(event.params.minBidIncrementPercentage)
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

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  const project = minterProjectAndConfig.project;
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
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
  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  const project = minterProjectAndConfig.project;
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
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

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  const project = minterProjectAndConfig.project;
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
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

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  const project = minterProjectAndConfig.project;
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
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

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  const project = minterProjectAndConfig.project;
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
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

  // only induce sync via updating project's updatedAt if the
  // projectMinterConfig is the active minter configuration for the project
  const project = minterProjectAndConfig.project;
  if (project.minterConfiguration == projectMinterConfig.id) {
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////
