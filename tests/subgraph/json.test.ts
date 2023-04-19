import { describe, test, assert } from "matchstick-as";
import {
  indexOfValueInArray,
  toJSONValue,
  typedMapToJSONString,
  createUpdatedTypedMapWithEntryAdded,
  createUpdatedTypedMapWithEntryRemoved,
  createUpdatedTypedMapWithArrayValueAdded,
  createUpdatedTypedMapWithArrayValueRemoved,
  jsonValueArrayToCommaSeparatedString,
  jsonValueArrayToJSONValue,
  createTypedMapFromEntries,
  typedMapToJSONValue,
  jsonValueToJSONString,
  jsonValueEquals,
  isTypedMapOfStringJSONValue,
  createModifiedArray,
  ArrayOperation
} from "../../src/json";
import {
  Bytes,
  json,
  TypedMap,
  JSONValue,
  JSONValueKind,
  BigInt,
  Address
} from "@graphprotocol/graph-ts";

describe("json", () => {
  describe("toJSONValue", () => {
    test("toJSONValue converts boolean correctly", () => {
      const value = true;
      const jsonValue = toJSONValue(value);
      assert.assertTrue(jsonValue.kind == JSONValueKind.BOOL);
      assert.booleanEquals(jsonValue.toBool(), value);
    });

    test("toJSONValue converts BigInt correctly", () => {
      const value = BigInt.fromI32(42);
      const jsonValue = toJSONValue(value);
      assert.assertTrue(jsonValue.kind == JSONValueKind.NUMBER);
      assert.bigIntEquals(jsonValue.toBigInt(), value);
    });

    test("toJSONValue converts Address correctly", () => {
      const value = Address.zero();
      const jsonValue = toJSONValue(value);
      assert.assertTrue(jsonValue.kind == JSONValueKind.STRING);
      assert.stringEquals(jsonValue.toString(), value.toHexString());
    });

    test("toJSONValue converts Bytes correctly", () => {
      const value = Bytes.fromHexString("0x1234567890abcdef");
      const jsonValue = toJSONValue(value);
      assert.assertTrue(jsonValue.kind == JSONValueKind.STRING);
      assert.stringEquals(jsonValue.toString(), value.toHexString());
    });

    test("toJSONValue converts string correctly", () => {
      const value = "Hello, World!";
      const jsonValue = toJSONValue(value);
      assert.assertTrue(jsonValue.kind == JSONValueKind.STRING);
      assert.stringEquals(jsonValue.toString(), value);
    });

    test("toJSONValue converts TypedMap correctly", () => {
      const value = createTypedMapFromEntries([
        {
          key: "key1",
          value: toJSONValue("value1")
        },
        {
          key: "key2",
          value: toJSONValue(BigInt.fromI32(42))
        }
      ]);
      const jsonValue = toJSONValue(value);
      assert.assertTrue(jsonValue.kind == JSONValueKind.OBJECT);
      assert.stringEquals(
        typedMapToJSONString(value),
        typedMapToJSONString(jsonValue.toObject())
      );
    });

    test("toJSONValue does not change JSONValue", () => {
      const value = toJSONValue("Hello, World!");
      const jsonValue = toJSONValue(value);
      assert.assertTrue(jsonValue.kind == JSONValueKind.STRING);
      assert.stringEquals(value.toString(), jsonValue.toString());
    });

    test("toJSONValue converts null correctly", () => {
      const value = null;
      const jsonValue = toJSONValue(value);
      assert.assertTrue(jsonValue.kind == JSONValueKind.NULL);
    });

    test(
      "toJSONValue throws error for unsupported type",
      () => {
        toJSONValue([1, 2, 3]);
      },
      true
    );
  });

  describe("jsonValueToJSONString", () => {
    test("jsonValueToJSONString converts BOOL correctly", () => {
      const value = true;
      const jsonValue = toJSONValue(value);
      const jsonStringValue = jsonValueToJSONString(jsonValue);
      assert.stringEquals("true", jsonStringValue);
    });

    test("jsonValueToJSONString converts NUMBER correctly", () => {
      const value = BigInt.fromI32(42);
      const jsonValue = toJSONValue(value);
      const jsonStringValue = jsonValueToJSONString(jsonValue);
      assert.stringEquals("42", jsonStringValue);
    });

    test("jsonValueToJSONString converts STRING correctly", () => {
      const value = "Hello, World!";
      const jsonValue = toJSONValue(value);
      const jsonStringValue = jsonValueToJSONString(jsonValue);
      assert.stringEquals('"Hello, World!"', jsonStringValue);
    });

    test("jsonValueToJSONString converts OBJECT correctly", () => {
      const value = createTypedMapFromEntries([
        {
          key: "key1",
          value: toJSONValue("value1")
        },
        {
          key: "key2",
          value: toJSONValue(BigInt.fromI32(42))
        }
      ]);
      const jsonValue = toJSONValue(value);
      const jsonStringValue = jsonValueToJSONString(jsonValue);
      assert.stringEquals('{"key1":"value1","key2":42}', jsonStringValue);
    });

    test("jsonValueToJSONString converts ARRAY correctly", () => {
      const value = jsonValueArrayToJSONValue([
        toJSONValue(true),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value1")
      ]);
      const jsonStringValue = jsonValueToJSONString(value);
      assert.stringEquals('[true,42,"value1"]', jsonStringValue);
    });

    test("jsonValueToJSONString converts NULL correctly", () => {
      const value = null;
      const jsonValue = toJSONValue(value);
      const jsonStringValue = jsonValueToJSONString(jsonValue);
      assert.stringEquals("null", jsonStringValue);
    });
  });

  test("typedMapToJSONString serializes TypedMap correctly", () => {
    const map = new TypedMap<string, JSONValue>();
    map.set("key1", toJSONValue(true));
    map.set("key2", toJSONValue(BigInt.fromI32(42)));
    map.set("key3", toJSONValue("value1"));
    map.set(
      "key4",
      jsonValueArrayToJSONValue([
        toJSONValue(true),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value1")
      ])
    );

    const jsonString = typedMapToJSONString(map);
    const expectedJsonString =
      '{"key1":true,"key2":42,"key3":"value1","key4":[true,42,"value1"]}';
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

  describe("createUpdatedTypedMapWithArrayValueAdded", () => {
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
      assert.stringEquals(expectedJsonString, jsonString);

      updated = createUpdatedTypedMapWithArrayValueAdded(
        updated,
        "key2",
        "value3"
      );

      const jsonString2 = typedMapToJSONString(updated);
      const expectedJsonString2 =
        '{"key1":"value1","key2":["value2","value3"]}';
      assert.stringEquals(expectedJsonString2, jsonString2);
    });

    test("createUpdatedTypedMapWithArrayValueAdded should handle non-array JSONValueKind", () => {
      let tm = new TypedMap<string, JSONValue>();
      tm.set("key", toJSONValue("hello"));
      let updatedTM = createUpdatedTypedMapWithArrayValueAdded(
        tm,
        "key",
        "newValue"
      );
      let expectedArray = json.fromString('["newValue"]');

      assert.assertNotNull(updatedTM.get("key"));
      assert.stringEquals(
        jsonValueToJSONString(changetype<JSONValue>(updatedTM.get("key"))),
        jsonValueToJSONString(expectedArray)
      );
    });
  });

  describe("createUpdatedTypedMapWithArrayValueRemoved", () => {
    test("createUpdatedTypedMapWithArrayValueRemoved removes values from array correctly", () => {
      const original = new TypedMap<string, JSONValue>();
      original.set(
        "key1",
        jsonValueArrayToJSONValue([
          toJSONValue("value1"),
          toJSONValue("value2"),
          toJSONValue("value3")
        ])
      );

      let updated = createUpdatedTypedMapWithArrayValueRemoved(
        original,
        "key1",
        "value2"
      );
      const jsonString = typedMapToJSONString(updated);
      const expectedJsonString = '{"key1":["value1","value3"]}';
      assert.stringEquals(expectedJsonString, jsonString);
    });

    test("createUpdatedTypedMapWithArrayValueRemoved should handle non-array JSONValueKind", () => {
      let tm = new TypedMap<string, JSONValue>();
      tm.set("key", toJSONValue("hello"));
      let updatedTM = createUpdatedTypedMapWithArrayValueRemoved(
        tm,
        "key",
        "newValue"
      );
      let expectedArray = json.fromString("[]");

      assert.assertNotNull(updatedTM.get("key"));
      assert.stringEquals(
        jsonValueToJSONString(changetype<JSONValue>(updatedTM.get("key"))),
        jsonValueToJSONString(expectedArray)
      );
    });
  });

  describe("isTypedMapOfStringJSONValue", () => {
    test("returns true for a TypedMap of string and JSONValue", () => {
      const map = new TypedMap<string, JSONValue>();
      map.set("key1", toJSONValue("value1"));
      map.set("key2", toJSONValue(BigInt.fromI32(42)));

      assert.assertTrue(isTypedMapOfStringJSONValue(map));
    });

    test("returns false for a TypedMap of different key or value types", () => {
      const map = new TypedMap<number, JSONValue>();
      map.set(1, toJSONValue("value1"));
      map.set(2, toJSONValue(BigInt.fromI32(42)));

      assert.assertTrue(!isTypedMapOfStringJSONValue(map));
    });

    test("returns false for a non-TypedMap value", () => {
      const array: JSONValue[] = [
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ];

      assert.assertTrue(!isTypedMapOfStringJSONValue(array));
    });
  });

  describe("createModifiedArray", () => {
    test("returns an array with added value", () => {
      const originalArray: JSONValue[] = [
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ];

      const newValue = toJSONValue("newValue");

      const modifiedArray = createModifiedArray(
        originalArray,
        newValue,
        ArrayOperation.ADD
      );
      const expectedArray: JSONValue[] = originalArray.concat([newValue]);

      assert.stringEquals(
        jsonValueArrayToCommaSeparatedString(modifiedArray),
        jsonValueArrayToCommaSeparatedString(expectedArray)
      );
    });

    test("returns an array with removed value", () => {
      const originalArray: JSONValue[] = [
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ];

      const valueToRemove = toJSONValue(BigInt.fromI32(42));

      const modifiedArray = createModifiedArray(
        originalArray,
        valueToRemove,
        ArrayOperation.REMOVE
      );
      const expectedArray: JSONValue[] = [
        toJSONValue("value1"),
        toJSONValue("value2")
      ];

      assert.stringEquals(
        jsonValueArrayToCommaSeparatedString(modifiedArray),
        jsonValueArrayToCommaSeparatedString(expectedArray)
      );
    });

    test("returns the original array when removing a non-existent value", () => {
      const originalArray: JSONValue[] = [
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ];

      const valueToRemove = toJSONValue("nonExistentValue");

      const modifiedArray = createModifiedArray(
        originalArray,
        valueToRemove,
        ArrayOperation.REMOVE
      );

      assert.stringEquals(
        jsonValueArrayToCommaSeparatedString(modifiedArray),
        jsonValueArrayToCommaSeparatedString(originalArray)
      );
    });
  });

  describe("indexOfValueInArray", () => {
    test("indexOfValueInArray returns correct index", () => {
      const array: JSONValue[] = [
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ];

      const index = indexOfValueInArray(array, BigInt.fromI32(42));
      assert.i32Equals(index, 1);
    });

    test("indexOfValueInArray returns -1 if value not found", () => {
      const array: JSONValue[] = [
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ];

      const index = indexOfValueInArray(array, BigInt.fromI32(43));
      assert.i32Equals(index, -1);
    });
  });

  describe("jsonValueEquals", () => {
    test("returns true for equal NULL values", () => {
      const a = toJSONValue(null);
      const b = toJSONValue(null);
      assert.assertTrue(jsonValueEquals(a, b));
    });

    test("returns true for equal BOOL values", () => {
      const a = toJSONValue(true);
      const b = toJSONValue(true);
      assert.assertTrue(jsonValueEquals(a, b));
    });

    test("returns false for unequal BOOL values", () => {
      const a = toJSONValue(true);
      const b = toJSONValue(false);
      assert.assertTrue(!jsonValueEquals(a, b));
    });

    test("returns true for equal NUMBER values", () => {
      const a = toJSONValue(BigInt.fromI32(42));
      const b = toJSONValue(BigInt.fromI32(42));
      assert.assertTrue(jsonValueEquals(a, b));
    });

    test("returns false for unequal NUMBER values", () => {
      const a = toJSONValue(BigInt.fromI32(42));
      const b = toJSONValue(BigInt.fromI32(43));
      assert.assertTrue(!jsonValueEquals(a, b));
    });

    test("returns true for equal STRING values", () => {
      const a = toJSONValue("hello");
      const b = toJSONValue("hello");
      assert.assertTrue(jsonValueEquals(a, b));
    });

    test("returns false for unequal STRING values", () => {
      const a = toJSONValue("hello");
      const b = toJSONValue("world");
      assert.assertTrue(!jsonValueEquals(a, b));
    });

    test("returns true for equal ARRAY values", () => {
      const a = jsonValueArrayToJSONValue([
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ]);
      const b = jsonValueArrayToJSONValue([
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ]);
      assert.assertTrue(jsonValueEquals(a, b));
    });

    test("returns false for unequal ARRAY values", () => {
      const a = jsonValueArrayToJSONValue([
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value2")
      ]);
      const b = jsonValueArrayToJSONValue([
        toJSONValue("value1"),
        toJSONValue(BigInt.fromI32(42)),
        toJSONValue("value3")
      ]);
      assert.assertTrue(!jsonValueEquals(a, b));
    });

    test("returns true for equal OBJECT values", () => {
      const a = toJSONValue(
        createTypedMapFromEntries([
          { key: "key1", value: toJSONValue("value1") },
          { key: "key2", value: toJSONValue(BigInt.fromI32(42)) }
        ])
      );
      const b = toJSONValue(
        createTypedMapFromEntries([
          { key: "key1", value: toJSONValue("value1") },
          { key: "key2", value: toJSONValue(BigInt.fromI32(42)) }
        ])
      );
      assert.assertTrue(jsonValueEquals(a, b));
    });

    test("returns false for unequal OBJECT values", () => {
      const a = toJSONValue(
        createTypedMapFromEntries([
          { key: "key1", value: toJSONValue("value1") },
          { key: "key2", value: toJSONValue(BigInt.fromI32(42)) }
        ])
      );
      const b = toJSONValue(
        createTypedMapFromEntries([
          { key: "key1", value: toJSONValue("value1") },
          { key: "key2", value: toJSONValue(BigInt.fromI32(43)) }
        ])
      );
      assert.assertTrue(!jsonValueEquals(a, b));
    });
  });

  test("jsonValueArrayToCommaSeparatedString generates correct string", () => {
    const array: JSONValue[] = [
      toJSONValue("value1"),
      toJSONValue(BigInt.fromI32(42)),
      toJSONValue("value2")
    ];

    const result = jsonValueArrayToCommaSeparatedString(array);
    const expected = '"value1",42,"value2"';
    assert.stringEquals(result, expected);
  });

  test("typedMapToJSONValue should convert TypedMap to JSONValue object", () => {
    const map = createTypedMapFromEntries([
      { key: "key1", value: toJSONValue("value1") },
      { key: "key2", value: toJSONValue(BigInt.fromI32(42)) }
    ]);

    const jsonValue = typedMapToJSONValue(map);

    const expected = createTypedMapFromEntries([
      { key: "key1", value: toJSONValue("value1") },
      { key: "key2", value: toJSONValue(BigInt.fromI32(42)) }
    ]);

    assert.assertTrue(jsonValueEquals(jsonValue, toJSONValue(expected)));
  });
});
