import {
  BigInt,
  Bytes,
  store,
  json,
  JSONValueKind,
  log,
  Address,
  ByteArray
} from "@graphprotocol/graph-ts";
import { logStore, log as logTest } from "matchstick-as";
import {
  GenArt721CoreV3,
  PlatformUpdated
} from "../generated/GenArt721CoreV3/GenArt721CoreV3";

import {
  Project,
  Token,
  Transfer as TokenTransfer,
  Account,
  AccountProject,
  Contract,
  Whitelisting,
  ProjectScript,
  MinterFilter,
  ProjectMinterConfiguration,
  ProposedArtistAddressesAndSplits
} from "../generated/schema";

// sync Contract nextProjectId to current value
// @dev this is only expected to be called once when the contract is first
// deployed, incrementing nextProjectId is handled in ProjectUpdated event.
// @dev warning: if this event is emitted >1 time in a single block, only the
// value at the end of the block will be set.
export function handlePlatformUpdatedNextProjectId(
  event: PlatformUpdated
): void {
  // get current value from blockchain
  let contractV3 = GenArt721CoreV3.bind(event.address);
  // update contract entity
  let contract = Contract.load(event.address.toHexString());
  if (contract) {
    contract.nextProjectId = contractV3.nextProjectId();
    contract.save();
  }
}
