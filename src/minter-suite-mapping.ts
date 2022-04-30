// We're importing these event types from MinterSetPriceV0
// but the signature should be the same for all filtered minters
import { Address, BigInt } from "@graphprotocol/graph-ts";

import {
  PricePerTokenInWeiUpdated,
  ProjectCurrencyInfoUpdated,
  PurchaseToDisabledUpdated
} from "../generated/MinterSetPriceV0/IFilteredMinterV0";

import {
  MinimumAuctionLengthSecondsUpdated,
  ResetAuctionDetails as DALinV0ResetAuctionDetails,
  SetAuctionDetails as DALinV0SetAuctionDetails
} from "../generated/MinterDALinV0/MinterDALinV0";

import {
  AuctionHalfLifeRangeSecondsUpdated,
  ResetAuctionDetails as DAExpV0ResetAuctionDetails,
  SetAuctionDetails as DAExpV0SetAuctionDetails
} from "../generated/MinterDAExpV0/MinterDAExpV0";

import {
  Minter,
  Project,
  ProjectMinterConfiguration
} from "../generated/schema";
import { generateContractSpecificId, loadOrCreateMinter } from "./helpers";

// IFilteredMinterV0 events
export function handlePricePerTokenInWeiUpdated(
  event: PricePerTokenInWeiUpdated
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  let project = minterProjectAndConfig.project;
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  projectMinterConfig.basePrice = event.params._pricePerTokenInWei;
  projectMinterConfig.priceIsConfigured = true;
  projectMinterConfig.save();

  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleProjectCurrencyInfoUpdated(
  event: ProjectCurrencyInfoUpdated
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  let project = minterProjectAndConfig.project;
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  projectMinterConfig.currencyAddress = event.params._currencyAddress;
  projectMinterConfig.currencySymbol = event.params._currencySymbol;
  projectMinterConfig.save();

  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handlePurchaseToDisabledUpdated(
  event: PurchaseToDisabledUpdated
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params._projectId,
    event.block.timestamp
  );

  if (!minterProjectAndConfig) {
    return;
  }

  let project = minterProjectAndConfig.project;
  let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;

  projectMinterConfig.purchaseToDisabled = event.params._purchaseToDisabled;
  projectMinterConfig.save();

  project.updatedAt = event.block.timestamp;
  project.save();
}

// MinterDALinV0 events
export function handleMinimumAuctionLengthSecondsUpdated(
  event: MinimumAuctionLengthSecondsUpdated
): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);

  minter.minimumAuctionLengthInSeconds =
    event.params._minimumAuctionLengthSeconds;
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleDALinV0SetAuctionDetails(
  event: DALinV0SetAuctionDetails
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = event.params._basePrice;
    projectMinterConfig.startPrice = event.params._startPrice;
    projectMinterConfig.startTime = event.params._auctionTimestampStart;
    projectMinterConfig.endTime = event.params._auctionTimestampEnd;
    projectMinterConfig.priceIsConfigured = true;

    projectMinterConfig.save();

    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleDALinV0ResetAuctionDetails(
  event: DALinV0ResetAuctionDetails
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = null;
    projectMinterConfig.startPrice = null;
    projectMinterConfig.startTime = null;
    projectMinterConfig.endTime = null;
    projectMinterConfig.priceIsConfigured = false;

    projectMinterConfig.save();

    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

// MinterDAExpV0 events
export function handleAuctionHalfLifeRangeSecondsUpdated(
  event: AuctionHalfLifeRangeSecondsUpdated
): void {
  let minter = loadOrCreateMinter(event.address, event.block.timestamp);

  minter.minimumHalfLifeInSeconds =
    event.params._minimumPriceDecayHalfLifeSeconds;
  minter.maximumHalfLifeInSeconds =
    event.params._maximumPriceDecayHalfLifeSeconds;

  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleDAExpV0SetAuctionDetails(
  event: DAExpV0SetAuctionDetails
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = event.params._basePrice;
    projectMinterConfig.startPrice = event.params._startPrice;
    projectMinterConfig.startTime = event.params._auctionTimestampStart;
    projectMinterConfig.halfLifeSeconds =
      event.params._priceDecayHalfLifeSeconds;
    projectMinterConfig.priceIsConfigured = true;

    projectMinterConfig.save();

    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleDAExpV0ResetAuctionDetails(
  event: DAExpV0ResetAuctionDetails
): void {
  let minterProjectAndConfig = loadMinterProjectAndConfig(
    event.address,
    event.params.projectId,
    event.block.timestamp
  );

  if (minterProjectAndConfig) {
    let projectMinterConfig = minterProjectAndConfig.projectMinterConfiguration;
    let project = minterProjectAndConfig.project;

    projectMinterConfig.basePrice = null;
    projectMinterConfig.startPrice = null;
    projectMinterConfig.startTime = null;
    projectMinterConfig.halfLifeSeconds = null;
    projectMinterConfig.priceIsConfigured = false;

    projectMinterConfig.save();

    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

// Helpers
class MinterProjectAndConfig {
  minter: Minter;
  project: Project;
  projectMinterConfiguration: ProjectMinterConfiguration;
}

function loadMinterProjectAndConfig(
  minterAddress: Address,
  projectId: BigInt,
  timestamp: BigInt
): MinterProjectAndConfig | null {
  let minter = loadOrCreateMinter(minterAddress, timestamp);

  let project = Project.load(
    generateContractSpecificId(
      Address.fromString(minter.coreContract),
      projectId
    )
  );
  if (!project) {
    return null;
  }

  let projectMinterConfig = ProjectMinterConfiguration.load(project.id);
  if (
    !projectMinterConfig ||
    projectMinterConfig.minter != minterAddress.toHexString()
  ) {
    return null;
  }

  return {
    minter: minter,
    project: project,
    projectMinterConfiguration: projectMinterConfig
  };
}
