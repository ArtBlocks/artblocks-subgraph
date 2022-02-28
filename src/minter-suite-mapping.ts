import { ProjectMinterConfiguration } from "../generated/schema";
import { generateContractSpecificId } from "./helpers";

//TODO: generate types for these contracts for event type

export function handleSetAuctionDetails(event) {
  const {
    _auctionTimeStampStart,
    _auctionTimeStampEnd,
    _startPrice,
    _basePrice
  } = event.params;
  let minterConfiguration = new ProjectMinterConfiguration(
    generateContractSpecificId(event.address, event.projectId)
  );

  if (minterConfiguration) {
    minterConfiguration.startTime = _auctionTimeStampStart;
    minterConfiguration.endTime = _auctionTimeStampEnd;
    minterConfiguration.startPrice = _startPrice;
    minterConfiguration.basePrice = _basePrice;
    minterConfiguration.project = event.projectId;
    minterConfiguration.save();
  }

  if (minterConfiguration.basePrice && minterConfiguration.startPrice) {
    minterConfiguration.priceIsConfigured = true;
    minterConfiguration.save();
  }
}

export function handleResetAuctionDetails(event) {
  let minterConfiguration = ProjectMinterConfiguration.load(
    generateContractSpecificId(event.address, event.projectId)
  );

  if (minterConfiguration) {
    minterConfiguration.startTime = null;
    minterConfiguration.endTime = null;
    minterConfiguration.startPrice = null;
    minterConfiguration.basePrice = null;
    minterConfiguration.priceIsConfigured = false;
    minterConfiguration.save();
  }
}
