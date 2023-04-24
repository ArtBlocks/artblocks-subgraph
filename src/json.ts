/**
 * This file contains a set of utility functions for working with TypedMap<string, JSONValue>
 * objects in AssemblyScript. These utilities provide a way to create, update, and convert
 * TypedMaps to and from JSON strings. Additionally, they offer functionality for adding,
 * removing, or updating TypedMap entries and performing operations on arrays within TypedMaps.
 *
 * Due to AssemblyScript's limitations when working with JSON, TypedMap<string, JSONValue> is
 * used as a close approximation of a regular JavaScript object. These utility functions aim
 * to bridge the gap, making it easier to work with TypedMaps in a similar way to how one
 * would work with objects in JavaScript.
 */

import {
  Address,
  BigInt,
  Bytes,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap,
  log
} from "@graphprotocol/graph-ts";
import { booleanToString } from "./helpers";

/*** Utils for converting values to JSONValue ***/

/**
 * Converts a given value to a JSONValue. Note that this function only supports a subset of types
 * and does not support arrays. For arrays, manually iterate over the array in context and convert
 * each element to a JSONValue before converting it with the jsonValueArrayToJSONValue.
 * @dev note that this function is not exhaustive and only supports a subset of types.
 * Note, specifically, that it does not support arrays. This is because AssemblyScript
 * can't iterate over generic arrays of objects because the memory layout of the array
 * is not known at compile time. This means that we can't iterate over the array to
 * convert each element to a JSONValue. If you need to convert an array, you can manually
 * iterate over the array in context and convert each element to a JSONValue before
 * converting it with the jsonValueArrayToJSONValue.
 */
export function toJSONValue<ValueType>(value: ValueType): JSONValue {
  if (isBoolean(value)) {
    return json.fromString(booleanToString(value as boolean));
  } else if (value instanceof BigInt) {
    return json.fromString(value.toString());
  } else if (value instanceof Address) {
    return stringToJSONValue(value.toHexString());
  } else if (value instanceof Bytes) {
    return bytesToJSONValue(value);
  } else if (value instanceof String) {
    return stringToJSONValue(value.toString());
  } else if (isTypedMapOfStringJSONValue(value)) {
    return typedMapToJSONValue(changetype<TypedMap<string, JSONValue>>(value));
  } else if (value instanceof JSONValue) {
    return value;
  } else if (!value) {
    return json.fromString("null");
  } else {
    throw Error("Unsupported type for JSONValue conversion");
  }
}

/**
 * Converts a single string value to a JSONValue.
 */
export function stringToJSONValue(value: string): JSONValue {
  return json.fromString('["' + value + '"]').toArray()[0];
}

/**
 * Converts an array of JSONValues to a single JSONValue.
 */
export function jsonValueArrayToJSONValue(arr: JSONValue[]): JSONValue {
  return json.fromString("[" + jsonValueArrayToCommaSeparatedString(arr) + "]");
}

/**
 * Converts a TypedMap<string, JSONValue> to a JSONValue.
 */
export function typedMapToJSONValue(
  value: TypedMap<string, JSONValue>
): JSONValue {
  return json.fromString(typedMapToJSONString(value));
}

/**
 * Converts a Bytes value to a JSONValue. If the byte data is parseable to a valid unicode string,
 * it is parsed as such; otherwise, the byte data is parsed to a hex string.
 */
export function bytesToJSONValue(value: Bytes): JSONValue {
  // fallback - assume the data is a hex string (always valid)
  let result = json.try_fromString('["' + value.toHexString() + '"]');
  // If the bytes can be parsed as a string, then losslessly re-encoded into
  // UTF-8 bytes, then consider a valid UTF-8 encoded string and store
  // string value in json.
  // note: Bytes.toString() uses WTF-8 encoding as opposed to UTF-8.  Solidity
  // encodes UTF-8 strings, so safe assume any string data are UTF-8 encoded.
  let stringValue: string = value.toString();
  let reEncodedBytesValue: Bytes = Bytes.fromUTF8(stringValue);
  if (reEncodedBytesValue.toHexString() == value.toHexString()) {
    // if the bytes are the same then the string was valid UTF-8
    let potentialResult = json.try_fromString('["' + stringValue + '"]');
    if (potentialResult.isOk) {
      result = potentialResult;
    }
  }
  return result.value.toArray()[0];
}

/*** Utils for creating and updating TypedMap<string, JSONValue> objects ***/

/**
 * Creates a new TypedMap with an entry added or updated.
 */
export function createUpdatedTypedMapWithEntryAdded<ValueType>(
  object: TypedMap<string, JSONValue>,
  key: string,
  value: ValueType
): TypedMap<string, JSONValue> {
  const updated = json.fromString(typedMapToJSONString(object)).toObject();

  let jsonValue: JSONValue = toJSONValue(value);

  updated.set(key, jsonValue);
  return updated;
}

/**
 * Creates a new TypedMap with an entry removed.
 */
export function createUpdatedTypedMapWithEntryRemoved(
  object: TypedMap<string, JSONValue>,
  key: string
): TypedMap<string, JSONValue> {
  const withRemovedTypedMap: TypedMap<string, JSONValue> = new TypedMap();

  for (let i = 0; i < object.entries.length; i++) {
    let entry = object.entries[i];
    if (entry.key != key) {
      withRemovedTypedMap.set(entry.key.toString(), entry.value);
    }
  }

  return withRemovedTypedMap;
}

/**
 * Creates a new TypedMap with a value added to an array at a given key. If the key does not exist
 * or is not an array, a new array is created.
 */
export function createUpdatedTypedMapWithArrayValueAdded<ValueType>(
  object: TypedMap<string, JSONValue>,
  key: string,
  value: ValueType
): TypedMap<string, JSONValue> {
  const stringified = typedMapToJSONString(object);
  const updated = json.fromString(stringified).toObject();

  let currentValue = object.get(key);

  // Convert json value to array so we can add the new value
  let arr =
    currentValue && currentValue.kind === JSONValueKind.ARRAY
      ? currentValue.toArray()
      : [];

  let modifiedArray = createModifiedArray(arr, value, ArrayOperation.ADD);
  let newValue = jsonValueArrayToJSONValue(modifiedArray);

  updated.set(key, newValue);

  return updated;
}

/**
 * @dev note this function will overwrite the value at the given key if
 * it already exists and is not an array.
 */
export function createUpdatedTypedMapWithArrayValueRemoved<ValueType>(
  object: TypedMap<string, JSONValue>,
  key: string,
  value: ValueType
): TypedMap<string, JSONValue> {
  const updated = json.fromString(typedMapToJSONString(object)).toObject();

  let currentValue = updated.get(key);
  let arr =
    currentValue && currentValue.kind === JSONValueKind.ARRAY
      ? currentValue.toArray()
      : [];
  let modifiedArray = createModifiedArray(arr, value, ArrayOperation.REMOVE);
  let newValue = jsonValueArrayToJSONValue(modifiedArray);
  updated.set(key, newValue);

  return updated;
}

/**
 * Enum for array operations (add or remove).
 */
export enum ArrayOperation {
  ADD,
  REMOVE
}

/**
 * Helper that returns a new array with a value added or removed based on the specified operation.
 * @dev note that this function does not mutate the original array.
 */
export function createModifiedArray<ValueType>(
  arr: JSONValue[],
  value: ValueType,
  operation: ArrayOperation
): JSONValue[] {
  const updated = arr.slice();
  const index = indexOfValueInArray(arr, value);
  const jsonValue = toJSONValue(value);

  if (operation === ArrayOperation.ADD && index === -1) {
    updated.push(jsonValue);
  } else if (operation === ArrayOperation.REMOVE && index !== -1) {
    updated.splice(index, 1);
  }

  return updated;
}

/**
 * Determines if two JSONValues are equal.
 */
export function jsonValueEquals(a: JSONValue, b: JSONValue): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  switch (a.kind) {
    case JSONValueKind.NULL:
      return true;
    case JSONValueKind.BOOL:
      return a.toBool() == b.toBool();
    case JSONValueKind.NUMBER:
      return a.toBigInt() == b.toBigInt();
    case JSONValueKind.STRING:
      return a.toString() == b.toString();
    case JSONValueKind.ARRAY: {
      return (
        jsonValueArrayToCommaSeparatedString(a.toArray()) ==
        jsonValueArrayToCommaSeparatedString(b.toArray())
      );
    }
    case JSONValueKind.OBJECT: {
      return (
        typedMapToJSONString(a.toObject()) == typedMapToJSONString(b.toObject())
      );
    }
    default:
      return false;
  }
}

/**
 * Helper that returns the index of a value in an array of JSONValues or -1 if not found.
 * This is used to find the index of a value of arbitrary type in an array of JSONValue objects.
 */
export function indexOfValueInArray<ValueType>(
  array: JSONValue[],
  value: ValueType
): i32 {
  const jsonValue = toJSONValue(value);
  for (let i = 0; i < array.length; i++) {
    if (jsonValueEquals(array[i], jsonValue)) return i;
  }
  return -1;
}

/**
 * Class representing a TypedMap entry with a key and a JSONValue.
 */
export class TypedMapEntry {
  key: string;
  value: JSONValue;
}

/**
 * Creates a TypedMap from an array of TypedMapEntry objects.
 */
export function createTypedMapFromEntries(
  entries: TypedMapEntry[]
): TypedMap<string, JSONValue> {
  let map = new TypedMap<string, JSONValue>();
  for (let i = 0; i < entries.length; i++) {
    map.set(entries[i].key, entries[i].value);
  }
  return map;
}

/**
 * Creates a new TypedMap by merging the source TypedMap into the target TypedMap.
 */
export function createMergedTypedMap(
  target: TypedMap<string, JSONValue>,
  source: TypedMap<string, JSONValue>
): TypedMap<string, JSONValue> {
  const updated = json.fromString(typedMapToJSONString(target)).toObject();

  let entries = source.entries;
  for (let i = 0; i < entries.length; i++) {
    let entry = entries[i];
    let key = entry.key.toString();
    let value = entry.value;

    updated.set(key, value);
  }

  return updated;
}

/**
 * Creates a TypedMap from a JSON string.
 */
export function createTypedMapFromJSONString(
  jsonString: string
): TypedMap<string, JSONValue> {
  let jsonResult = json.try_fromString(jsonString);
  let typedMap: TypedMap<string, JSONValue>;
  if (jsonResult.isOk && jsonResult.value.kind == JSONValueKind.OBJECT) {
    typedMap = jsonResult.value.toObject();
  } else {
    typedMap = new TypedMap();
  }
  return typedMap;
}

/*** Helper functions to stringify values to be included in JSON strings ***/

/**
 * Converts a TypedMap<string, JSONValue> to a JSON string.
 */
export function typedMapToJSONString(map: TypedMap<string, JSONValue>): string {
  let jsonString = "{";
  for (let i = 0; i < map.entries.length; i++) {
    const entry = map.entries[i];
    const newVal = jsonValueToJSONString(entry.value);

    jsonString +=
      stringToJSONString(entry.key.toString()) +
      ":" +
      newVal +
      (i == map.entries.length - 1 ? "" : ",");
  }
  jsonString += "}";
  return jsonString;
}

/**
 * Converts a string value to a JSON-formatted string.
 */
export function stringToJSONString(value: string): string {
  return '"' + value + '"';
}

/**
 * Converts an array of JSONValues to a comma-separated string.
 */
export function jsonValueArrayToCommaSeparatedString(
  jsonValueArray: JSONValue[]
): string {
  let stringArray = jsonValueArray.map<string>((v: JSONValue) => {
    return jsonValueToJSONString(v);
  });
  return stringArray.join(",");
}

/**
 * Converts a JSONValue to a JSON-formatted string.
 */
export function jsonValueToJSONString(value: JSONValue): string {
  let jsonString = "";
  if (JSONValueKind.BOOL == value.kind) {
    jsonString = booleanToString(value.toBool());
  } else if (JSONValueKind.NUMBER == value.kind) {
    jsonString = value.toBigInt().toString();
  } else if (JSONValueKind.STRING == value.kind) {
    jsonString = stringToJSONString(value.toString());
  } else if (JSONValueKind.ARRAY == value.kind) {
    jsonString =
      "[" + jsonValueArrayToCommaSeparatedString(value.toArray()) + "]";
  } else if (JSONValueKind.OBJECT == value.kind) {
    jsonString = typedMapToJSONString(value.toObject());
  } else if (JSONValueKind.NULL == value.kind) {
    jsonString = "null";
  }
  return jsonString;
}

/**
 * Determines if a given value is a TypedMap<string, JSONValue>.
 */
export function isTypedMapOfStringJSONValue<ValueType>(
  value: ValueType
): boolean {
  if (!(value instanceof TypedMap)) {
    return false;
  }

  for (let i = 0; i < value.entries.length; i++) {
    let entry = value.entries[i];
    if (!(entry.key instanceof String) || !(entry.value instanceof JSONValue)) {
      return false;
    }
  }

  return true;
}
