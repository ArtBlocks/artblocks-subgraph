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

export function typedMapToJSONString(map: TypedMap<string, JSONValue>): string {
  let jsonString = "{";
  for (let i = 0; i < map.entries.length; i++) {
    let entry = map.entries[i];
    let val = entry.value;
    let newVal = "";
    let quoted = "";
    if (JSONValueKind.BOOL == val.kind) {
      newVal = booleanToString(val.toBool());
    } else if (JSONValueKind.NUMBER == val.kind) {
      newVal = val.toBigInt().toString();
    } else if (JSONValueKind.STRING == val.kind) {
      newVal = val.toString();
      quoted = '"';
    } else if (JSONValueKind.ARRAY == val.kind) {
      newVal =
        "[" +
        val
          .toArray()
          .map<string>((v: JSONValue) => {
            let mapped = "";
            if (JSONValueKind.BOOL == v.kind) {
              mapped = booleanToString(v.toBool());
            } else if (JSONValueKind.STRING == v.kind) {
              mapped = '"' + v.toString() + '"';
            } else if (JSONValueKind.NUMBER == v.kind) {
              mapped = v.toBigInt().toString();
            }
            return mapped;
          })
          .toString() +
        "]";
    }

    jsonString +=
      stringToJSONString(entry.key.toString()) +
      ":" +
      quoted +
      newVal +
      quoted +
      (i == map.entries.length - 1 ? "" : ",");
  }
  jsonString += "}";
  return jsonString;
}

export function indexOfValueInArray<ValueType>(
  array: JSONValue[],
  value: ValueType
): i32 {
  const jsonValue = toJSONValue(value);
  for (let i = 0; i < array.length; i++) {
    if (
      jsonValue.kind === JSONValueKind.STRING &&
      array[i].kind === JSONValueKind.STRING &&
      // Note the double equals here, this is intentional
      // as assemblyscript checks for reference equality
      // with triple equals and we want to check for value
      // equality
      jsonValue.toString() == array[i].toString()
    ) {
      return i;
    }
    if (
      jsonValue.kind === JSONValueKind.NUMBER &&
      array[i].kind === JSONValueKind.NUMBER &&
      jsonValue.toBigInt().equals(array[i].toBigInt())
    ) {
      return i;
    }
    if (
      jsonValue.kind === JSONValueKind.BOOL &&
      array[i].kind === JSONValueKind.BOOL &&
      jsonValue.toBool() === array[i].toBool()
    ) {
      return i;
    }
  }
  return -1;
}

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
  } else if (!value) {
    return json.fromString("null");
  } else {
    log.warning("Unexpected value type provided, returning null JSONValue", []);
    return json.fromString("null");
  }
}

export function stringToJSONValue(value: string): JSONValue {
  return json.fromString('["' + value + '"]').toArray()[0];
}

export function arrayToJSONValue(value: string): JSONValue {
  return json.fromString("[" + value + "]");
}

// If byte data is parseable to a valid unicode string then do so
// otherwise parse the byte data to a hex string
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

export function stringToJSONString(value: string): string {
  return '"' + value + '"';
}

export class TypedMapEntry {
  key: string;
  value: JSONValue;
}

export function createTypedMapFromEntries(
  entries: TypedMapEntry[]
): TypedMap<string, JSONValue> {
  let map = new TypedMap<string, JSONValue>();
  for (let i = 0; i < entries.length; i++) {
    map.set(entries[i].key, entries[i].value);
  }
  return map;
}

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

enum ArrayOperation {
  Add,
  Remove
}

// Helper function to modify the array based on the value type and operation (add or remove)
// Note: this function does not mutate the original array
function createModifiedArray<ValueType>(
  arr: JSONValue[],
  value: ValueType,
  operation: ArrayOperation
): JSONValue[] {
  const updated = arr.slice();
  if (value instanceof BigInt) {
    const index = indexOfValueInArray(updated, value);

    if (operation === ArrayOperation.Add && index === -1) {
      updated.push(toJSONValue(value));
    } else if (operation === ArrayOperation.Remove && index !== -1) {
      updated.splice(index, 1);
    }

    return updated;
  } else if (
    value instanceof Address ||
    value instanceof Bytes ||
    typeof value === "string"
  ) {
    const jsonValue = toJSONValue(value);
    const stringValue = jsonValue.toString();
    const index = indexOfValueInArray(updated, stringValue);

    if (operation === ArrayOperation.Add && index === -1) {
      updated.push(jsonValue);
    } else if (operation === ArrayOperation.Remove && index !== -1) {
      updated.splice(index, 1);
    }

    return updated;
  }

  log.warning("Unexpected type, returning unmodified array", []);
  return updated;
}

export function jsonValueArrayToCommaSeparatedString(
  jsonValueArray: JSONValue[]
): string {
  let stringArray = jsonValueArray.map<string>((v: JSONValue) => {
    let mapped = "";
    if (JSONValueKind.BOOL == v.kind) {
      mapped = booleanToString(v.toBool());
    } else if (JSONValueKind.NUMBER == v.kind) {
      mapped = v.toBigInt().toString();
    } else if (JSONValueKind.STRING == v.kind) {
      mapped = stringToJSONString(v.toString());
    } else if (JSONValueKind.ARRAY == v.kind) {
      mapped = jsonValueArrayToCommaSeparatedString(v.toArray());
    } else if (JSONValueKind.NULL == v.kind) {
      mapped = "null";
    } else if (JSONValueKind.OBJECT == v.kind) {
      mapped = typedMapToJSONString(v.toObject());
    }
    return mapped;
  });
  return stringArray.join(",");
}

export function createUpdatedTypedMapWithArrayValueAdded<ValueType>(
  object: TypedMap<string, JSONValue>,
  key: string,
  value: ValueType
): TypedMap<string, JSONValue> {
  const updated = json.fromString(typedMapToJSONString(object)).toObject();
  let currentValue = object.get(key);

  // Convert json value to array so we can add the new value
  let arr =
    currentValue && currentValue.kind === JSONValueKind.ARRAY
      ? currentValue.toArray()
      : [];

  let modifiedArray = createModifiedArray(arr, value, ArrayOperation.Add);
  let newValue = arrayToJSONValue(
    jsonValueArrayToCommaSeparatedString(modifiedArray)
  );
  updated.set(key, newValue);

  return updated;
}

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
  let modifiedArray = createModifiedArray(arr, value, ArrayOperation.Remove);
  let newValue = arrayToJSONValue(
    jsonValueArrayToCommaSeparatedString(modifiedArray)
  );
  updated.set(key, newValue);

  return updated;
}

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
