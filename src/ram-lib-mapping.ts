import { BigInt, log, JSONValue, TypedMap } from "@graphprotocol/graph-ts";

import {
  MinAuctionDurationSecondsUpdated,
  MinterRefundGasLimitUpdated,
  NumSlotsUpdated,
  AuctionBufferTimeParamsUpdated,
  AuctionConfigUpdated,
  NumTokensInAuctionUpdated,
  AuctionTimestampEndUpdated,
  BidCreated,
  BidRemoved,
  BidToppedUp,
  BidSettled,
  BidMinted,
  BidRefunded
} from "../generated/RAMLib/RAMLib";

import { Account, Bid } from "../generated/schema";

import { loadOrCreateMinterProjectAndConfigIfProject } from "./generic-minter-events-lib-mapping";

import {
  loadOrCreateMinter,
  updateProjectIfMinterConfigIsActive,
  generateContractSpecificId,
  generateRAMMinterBidId,
  slotIndexToBidValue
} from "./helpers";

import {
  setMinterExtraMinterDetailsValue,
  setProjectMinterConfigExtraMinterDetailsValue,
  mergeProjectMinterConfigExtraMinterDetails
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

export function handleNumSlotsUpdated(event: NumSlotsUpdated): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue("numSlots", event.params.numSlots, minter);

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleAuctionBufferTimeParamsUpdated(
  event: AuctionBufferTimeParamsUpdated
): void {
  // load minter
  const minter = loadOrCreateMinter(event.address, event.block.timestamp);

  // update minter extra minter details value
  setMinterExtraMinterDetailsValue(
    "auctionBufferSeconds",
    event.params.auctionBufferSeconds,
    minter
  );

  setMinterExtraMinterDetailsValue(
    "maxAuctionExtraSeconds",
    event.params.maxAuctionExtraSeconds,
    minter
  );

  // update minter's updatedAt timestamp to induce a sync, and save
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

// project-level events
export function handleAuctionTimestampEndUpdated(
  event: AuctionTimestampEndUpdated
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
  // update project minter configuration extraMinterDetails json field
  setProjectMinterConfigExtraMinterDetailsValue(
    "auctionEndTime",
    event.params.timestampEnd,
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

export function handleAuctionConfigUpdated(event: AuctionConfigUpdated): void {
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
  // update all auction details in project minter configuration extraMinterDetails json field
  let auctionConfigUpdateDetails: TypedMap<
    string,
    JSONValue
  > = createTypedMapFromEntries([
    {
      key: "startTime",
      value: toJSONValue(event.params.timestampStart)
    },
    { key: "auctionEndTime", value: toJSONValue(event.params.timestampEnd) },
    {
      key: "numTokensInAuction",
      value: toJSONValue(event.params.numTokensInAuction)
    },
    {
      key: "adminArtistOnlyMintPeriodIfSellout",
      value: toJSONValue(event.params.adminArtistOnlyMintPeriodIfSellout)
    }
  ]);

  mergeProjectMinterConfigExtraMinterDetails(
    projectMinterConfig,
    auctionConfigUpdateDetails
  );

  projectMinterConfig.save();

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    projectMinterConfig,
    event.block.timestamp
  );
}

export function handleNumTokensInAuctionUpdated(
  event: NumTokensInAuctionUpdated
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
  // update num tokens in auction detail in project minter configuration extraMinterDetails json field
  let auctionConfigUpdateDetails: TypedMap<
    string,
    JSONValue
  > = createTypedMapFromEntries([
    {
      key: "numTokensInAuction",
      value: toJSONValue(event.params.numTokensInAuction)
    }
  ]);

  mergeProjectMinterConfigExtraMinterDetails(
    projectMinterConfig,
    auctionConfigUpdateDetails
  );

  projectMinterConfig.save();

  // induce sync if the project minter configuration is the active one
  updateProjectIfMinterConfigIsActive(
    minterProjectAndConfig.project,
    projectMinterConfig,
    event.block.timestamp
  );
}

export function handleBidCreated(event: BidCreated): void {
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
  const auctionBasePrice = projectMinterConfig.basePrice;

  if (!auctionBasePrice) {
    log.warning(
      "Auction base price for minter {} not found for core contract {}",
      [event.address.toString(), event.params.coreContract.toHexString()]
    );
    return;
  }
  const bidValue = slotIndexToBidValue(
    auctionBasePrice,
    event.params.slotIndex
  );

  const fullProjectId = generateContractSpecificId(
    event.params.coreContract,
    event.params.projectId
  );

  const ramBidId = generateRAMMinterBidId(
    event.address.toHexString(),
    fullProjectId,
    event.params.bidId.toString()
  );
  // @dev: a bid with this ID should not already exist for the RAM Minter
  let bid = Bid.load(ramBidId);
  if (bid) {
    log.warning("Bid ID {} already exists for minter {}", [
      ramBidId,
      event.address.toHexString()
    ]);
    return;
  }
  bid = new Bid(ramBidId);
  // Create new account entity if one for the bidder doesn't exist
  const bidderAccount = new Account(event.params.bidder.toHexString());
  bidderAccount.save();

  bid.project = minterProjectAndConfig.project.id;
  bid.bidType = "RAM";
  bid.winningBid = false;
  bid.minter = event.address.toHexString();
  bid.value = bidValue;
  bid.bidder = bidderAccount.id;
  bid.settled = false;
  bid.isRemoved = false;
  bid.slotIndex = event.params.slotIndex;
  bid.timestamp = event.block.timestamp;
  bid.logIndex = event.logIndex;
  bid.updatedAt = event.block.timestamp;
  bid.save();
}

export function handleBidRemoved(event: BidRemoved): void {
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

  const fullProjectId = generateContractSpecificId(
    event.params.coreContract,
    event.params.projectId
  );

  const ramBidId = generateRAMMinterBidId(
    event.address.toHexString(),
    fullProjectId,
    event.params.bidId.toString()
  );

  // @dev: a bid with this ID should exist for the RAM Minter
  const bid = Bid.load(ramBidId);

  if (!bid) {
    log.warning("Bid ID {} not found for minter {}", [
      ramBidId,
      event.address.toHexString()
    ]);
    return;
  }

  // update bid
  bid.isRemoved = true;
  bid.updatedAt = event.block.timestamp;
  bid.save();
}

export function handleBidToppedUp(event: BidToppedUp): void {
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
  // Get the auction base price
  const auctionBasePrice = projectMinterConfig.basePrice;

  if (!auctionBasePrice) {
    log.warning(
      "Auction base price for minter {} not found for core contract {}",
      [event.address.toString(), event.params.coreContract.toHexString()]
    );
    return;
  }
  const bidValue = slotIndexToBidValue(
    auctionBasePrice,
    event.params.newSlotIndex
  );

  const fullProjectId = generateContractSpecificId(
    event.params.coreContract,
    event.params.projectId
  );

  const ramBidId = generateRAMMinterBidId(
    event.address.toHexString(),
    fullProjectId,
    event.params.bidId.toString()
  );

  // @dev: a bid with this ID should exist for the RAM Minter
  const bid = Bid.load(ramBidId);
  if (!bid) {
    log.warning("Bid ID {} not found for minter {}", [
      ramBidId,
      event.address.toHexString()
    ]);
    return;
  }
  // Update slot index and value
  bid.slotIndex = event.params.newSlotIndex;
  bid.value = bidValue;
  bid.timestamp = event.block.timestamp;
  bid.logIndex = event.logIndex;
  bid.updatedAt = event.block.timestamp;
  bid.save();
}

export function handleBidSettled(event: BidSettled): void {
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

  const fullProjectId = generateContractSpecificId(
    event.params.coreContract,
    event.params.projectId
  );

  const ramBidId = generateRAMMinterBidId(
    event.address.toHexString(),
    fullProjectId,
    event.params.bidId.toString()
  );

  // @dev: a bid with this ID should exist for the RAM Minter
  const bid = Bid.load(ramBidId);

  if (!bid) {
    log.warning("Bid ID {} not found for minter {}", [
      ramBidId,
      event.address.toHexString()
    ]);
    return;
  }
  // Update settled to true
  bid.settled = true;
  bid.updatedAt = event.block.timestamp;
  bid.save();
}

export function handleBidMinted(event: BidMinted): void {
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

  const fullProjectId = generateContractSpecificId(
    event.params.coreContract,
    event.params.projectId
  );

  const ramBidId = generateRAMMinterBidId(
    event.address.toHexString(),
    fullProjectId,
    event.params.bidId.toString()
  );

  // @dev: a bid with this ID should exist for the RAM Minter
  const bid = Bid.load(ramBidId);

  if (!bid) {
    log.warning("Bid ID {} not found for minter {}", [
      ramBidId,
      event.address.toHexString()
    ]);
    return;
  }
  // Update associated token on Bid now that token has been minted
  bid.token = generateContractSpecificId(
    event.params.coreContract,
    event.params.tokenId
  );
  bid.winningBid = true;
  bid.updatedAt = event.block.timestamp;
  bid.save();
}

export function handleBidRefunded(event: BidRefunded): void {
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

  const fullProjectId = generateContractSpecificId(
    event.params.coreContract,
    event.params.projectId
  );

  const ramBidId = generateRAMMinterBidId(
    event.address.toHexString(),
    fullProjectId,
    event.params.bidId.toString()
  );

  // @dev: a bid with this ID should exist for the RAM Minter
  const bid = Bid.load(ramBidId);

  if (!bid) {
    log.warning("Bid ID {} not found for minter {}", [
      ramBidId,
      event.address.toHexString()
    ]);
    return;
  }
  // update bid
  bid.isRemoved = true;
  bid.updatedAt = event.block.timestamp;
  bid.save();
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS end here
///////////////////////////////////////////////////////////////////////////////
