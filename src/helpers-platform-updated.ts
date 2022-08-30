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
import { PlatformUpdated } from "../generated/GenArt721CoreV3/GenArt721CoreV3";

export function handlePlatformUpdatedNextProjectId(
  event: PlatformUpdated
): void {
  logTest.debug("Platform updated field: {}", [event.params._field.toString()]);
}
