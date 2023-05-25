import { json, JSONValue, TypedMap, log } from "@graphprotocol/graph-ts";

import { Minter, ProjectMinterConfiguration } from "../generated/schema";

import {
  typedMapToJSONString,
  createMergedTypedMap,
  createUpdatedTypedMapWithEntryAdded,
  createUpdatedTypedMapWithEntryRemoved,
  createUpdatedTypedMapWithArrayValueRemoved,
  createUpdatedTypedMapWithArrayValueAdded
} from "./json";

import {
  getProjectMinterConfigExtraMinterDetailsTypedMap,
  getMinterExtraMinterDetailsTypedMap
} from "./helpers";

// Generic Handlers
// Below is all logic pertaining to generic handlers used for maintaining JSON config stores on both the ProjectMinterConfiguration and Minter entities.
// Most logic is shared and bubbled up each respective handler for each action. We utilize ducktype to allow these to work on either a Minter or ProjectMinterConfiguration
// Because AssemblyScript does not support union types, we need to manually type check inside each method, to ensure correct usage.
// Currently supported key-value types (value: T) include boolean, BigInt, ETH address, and bytes values.
// For any questions reach out to @jon or @ryley-o.eth. or see the following document https://docs.google.com/document/d/1XSxl04eJyTxc_rbj6cmq-j00zaYDzApBBLT67JXtaOw/edit?disco=AAAAZa8xp-Q

export function setProjectMinterConfigExtraMinterDetailsValue<ValueType>(
  key: string,
  value: ValueType,
  config: ProjectMinterConfiguration
): void {
  let minterDetails = getProjectMinterConfigExtraMinterDetailsTypedMap(config);

  minterDetails = createUpdatedTypedMapWithEntryAdded(
    minterDetails,
    key,
    value
  );

  config.extraMinterDetails = typedMapToJSONString(minterDetails);
  config.save();
}

export function setMinterExtraMinterDetailsValue<ValueType>(
  key: string,
  value: ValueType,
  minter: Minter
): void {
  let minterDetails = getMinterExtraMinterDetailsTypedMap(minter);

  minterDetails = createUpdatedTypedMapWithEntryAdded(
    minterDetails,
    key,
    value
  );

  minter.extraMinterDetails = typedMapToJSONString(minterDetails);
  minter.save();
}

export function removeProjectMinterConfigExtraMinterDetailsEntry(
  key: string,
  config: ProjectMinterConfiguration
): void {
  let minterDetails = getProjectMinterConfigExtraMinterDetailsTypedMap(config);
  minterDetails = createUpdatedTypedMapWithEntryRemoved(minterDetails, key);

  config.extraMinterDetails = typedMapToJSONString(minterDetails);
  config.save();
}

export function removeMinterExtraMinterDetailsEntry(
  key: string,
  minter: Minter
): void {
  let minterDetails = getMinterExtraMinterDetailsTypedMap(minter);
  minterDetails = createUpdatedTypedMapWithEntryRemoved(minterDetails, key);

  minter.extraMinterDetails = typedMapToJSONString(minterDetails);
  minter.save();
}

export function addProjectMinterConfigExtraMinterDetailsManyValue<ValueType>(
  config: ProjectMinterConfiguration,
  key: string,
  value: ValueType
): void {
  let minterDetails = getProjectMinterConfigExtraMinterDetailsTypedMap(config);
  minterDetails = createUpdatedTypedMapWithArrayValueAdded(
    minterDetails,
    key,
    value
  );
  config.extraMinterDetails = typedMapToJSONString(minterDetails);
  config.save();
}

export function addMinterExtraMinterDetailsManyValue<ValueType>(
  minter: Minter,
  key: string,
  value: ValueType
): void {
  let minterDetails = getMinterExtraMinterDetailsTypedMap(minter);
  minterDetails = createUpdatedTypedMapWithArrayValueAdded(
    minterDetails,
    key,
    value
  );
  minter.extraMinterDetails = typedMapToJSONString(minterDetails);
  minter.save();
}

export function removeProjectMinterConfigExtraMinterDetailsManyValue<ValueType>(
  config: ProjectMinterConfiguration,
  key: string,
  value: ValueType
): void {
  let minterDetails = getProjectMinterConfigExtraMinterDetailsTypedMap(config);
  minterDetails = createUpdatedTypedMapWithArrayValueRemoved(
    minterDetails,
    key,
    value
  );
  config.extraMinterDetails = typedMapToJSONString(minterDetails);
  config.save();
}

export function removeMinterExtraMinterDetailsManyValue<ValueType>(
  minter: Minter,
  key: string,
  value: ValueType
): void {
  let minterDetails = getMinterExtraMinterDetailsTypedMap(minter);
  minterDetails = createUpdatedTypedMapWithArrayValueRemoved(
    minterDetails,
    key,
    value
  );
  minter.extraMinterDetails = typedMapToJSONString(minterDetails);
  minter.save();
}

export function mergeProjectMinterConfigExtraMinterDetails(
  projectMinterConfig: ProjectMinterConfiguration,
  extraMinterDetails: TypedMap<string, JSONValue>
): void {
  let currentExtraMinterDetailsResult = json.try_fromString(
    projectMinterConfig.extraMinterDetails
  );

  if (currentExtraMinterDetailsResult.isOk) {
    const newExtraMinterDetails = createMergedTypedMap(
      currentExtraMinterDetailsResult.value.toObject(),
      extraMinterDetails
    );

    projectMinterConfig.extraMinterDetails = typedMapToJSONString(
      newExtraMinterDetails
    );
  } else {
    log.warning(
      "Failed to parse extraMinterDetails json string for project minter config {}",
      [projectMinterConfig.id]
    );
  }

  projectMinterConfig.save();
}
