import {
  describe,
  beforeEach,
  test,
  clearStore,
  log,
  assert
} from "matchstick-as";
import {
  indexOfValueInArray,
  toJSONValue,
  typedMapToJSONString,
  createUpdatedTypedMapWithEntryAdded,
  createUpdatedTypedMapWithEntryRemoved,
  createUpdatedTypedMapWithArrayValueAdded
} from "../../src/json";
import {
  Bytes,
  json,
  TypedMap,
  JSONValue,
  JSONValueKind,
  BigInt
} from "@graphprotocol/graph-ts";

describe("json", () => {
  test("toJSONValue converts string correctly", () => {
    const value = "Hello, World!";
    const jsonValue = toJSONValue(value);
    assert.assertTrue(jsonValue.kind == JSONValueKind.STRING);
    assert.stringEquals(jsonValue.toString(), value);
  });

  test("typedMapToJSONString serializes TypedMap correctly", () => {
    const map = new TypedMap<string, JSONValue>();
    map.set("key1", toJSONValue("value1"));
    map.set("key2", toJSONValue(BigInt.fromI32(42)));

    const jsonString = typedMapToJSONString(map);
    const expectedJsonString = '{"key1":"value1","key2":42}';
    assert.stringEquals(jsonString, expectedJsonString);
  });

  test("createUpdatedTypedMapWithEntryAdded adds entry correctly", () => {
    const original = new TypedMap<string, JSONValue>();
    original.set("key1", toJSONValue("value1"));

    const updated = createUpdatedTypedMapWithEntryAdded(
      original,
      "key2",
      "value2"
    );
    const jsonString = typedMapToJSONString(updated);
    const expectedJsonString = '{"key1":"value1","key2":"value2"}';
    assert.stringEquals(jsonString, expectedJsonString);
  });

  test("createUpdatedTypedMapWithEntryRemoved removes entry correctly", () => {
    const original = new TypedMap<string, JSONValue>();
    original.set("key1", toJSONValue("value1"));
    original.set("key2", toJSONValue("value2"));

    const updated = createUpdatedTypedMapWithEntryRemoved(original, "key2");
    const jsonString = typedMapToJSONString(updated);
    const expectedJsonString = '{"key1":"value1"}';
    assert.stringEquals(jsonString, expectedJsonString);
  });

  test("createUpdatedTypedMapWithArrayValueAdded adds values to array correctly", () => {
    const original = new TypedMap<string, JSONValue>();
    original.set("key1", toJSONValue("value1"));

    let updated = createUpdatedTypedMapWithArrayValueAdded(
      original,
      "key2",
      "value2"
    );

    const jsonString = typedMapToJSONString(updated);
    const expectedJsonString = '{"key1":"value1","key2":["value2"]}';
    assert.stringEquals(jsonString, expectedJsonString);

    updated = createUpdatedTypedMapWithArrayValueAdded(
      updated,
      "key2",
      "value3"
    );

    const jsonString2 = typedMapToJSONString(updated);
    const expectedJsonString2 = '{"key1":"value1","key2":["value2","value3"]}';
    assert.stringEquals(jsonString2, expectedJsonString2);
  });
});
