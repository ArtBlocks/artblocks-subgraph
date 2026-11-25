import {
  assert,
  clearStore,
  test,
  createMockedFunction,
  newMockEvent,
  describe,
  beforeEach,
} from "matchstick-as/assembly/index";

import { BigInt, Bytes, ethereum, Address } from "@graphprotocol/graph-ts";

import {
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
} from "../shared-helpers";

import { generateDependencyScriptId } from "../../../src/helpers";

import {
  DependencyAbxfsFileCidUpdated,
  DependencyScriptUpdated,
} from "../../../generated/IDependencyRegistryV0/IDependencyRegistryV0";

import {
  handleDependencyAbxfsFileCidUpdated,
  handleDependencyScriptUpdated,
} from "../../../src/dependency-registry";

import {
  Dependency,
  DependencyScript,
  License,
} from "../../../generated/schema";

const randomAddressGenerator = new RandomAddressGenerator();
const DEPENDENCY_REGISTRY_ADDRESS =
  randomAddressGenerator.generateRandomAddress();
const EXISTING_DEPENDENCY_TYPE = "p5js@1.0.0";
const CID = Bytes.fromHexString(
  "0xd51a97d197e052299e2ef11718c4185435ea3d14ec04ec3276c807dc5d1654d0"
);
const ZERO_CID = Bytes.fromHexString(
  "0x0000000000000000000000000000000000000000000000000000000000000000"
);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function dependencyKey(): ethereum.Value {
  return ethereum.Value.fromFixedBytes(
    Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE)
  );
}

function mockScriptCount(count: i32): void {
  createMockedFunction(
    DEPENDENCY_REGISTRY_ADDRESS,
    "getDependencyScriptCount",
    "getDependencyScriptCount(bytes32):(uint256)"
  )
    .withArgs([dependencyKey()])
    .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(count))]);
}

function mockScriptCountReverts(): void {
  createMockedFunction(
    DEPENDENCY_REGISTRY_ADDRESS,
    "getDependencyScriptCount",
    "getDependencyScriptCount(bytes32):(uint256)"
  )
    .withArgs([dependencyKey()])
    .reverts();
}

function mockScript(index: i32, script: string): void {
  createMockedFunction(
    DEPENDENCY_REGISTRY_ADDRESS,
    "getDependencyScript",
    "getDependencyScript(bytes32,uint256):(string)"
  )
    .withArgs([
      dependencyKey(),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(index)),
    ])
    .returns([ethereum.Value.fromString(script)]);
}

function mockScriptBytecodeAddress(index: i32, address: Address): void {
  createMockedFunction(
    DEPENDENCY_REGISTRY_ADDRESS,
    "getDependencyScriptBytecodeAddress",
    "getDependencyScriptBytecodeAddress(bytes32,uint256):(address)"
  )
    .withArgs([
      dependencyKey(),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(index)),
    ])
    .returns([ethereum.Value.fromAddress(address)]);
}

function abxfsFileCidUpdatedEvent(
  cid: Bytes,
  timestamp: BigInt
): DependencyAbxfsFileCidUpdated {
  const event = changetype<DependencyAbxfsFileCidUpdated>(newMockEvent());
  event.parameters = [
    new ethereum.EventParam(
      "dependencyNameAndVersion",
      ethereum.Value.fromFixedBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
    ),
    new ethereum.EventParam("abxfsFileCid", ethereum.Value.fromFixedBytes(cid)),
  ];
  event.block.timestamp = timestamp;
  event.address = DEPENDENCY_REGISTRY_ADDRESS;
  return event;
}

function scriptUpdatedEvent(timestamp: BigInt): DependencyScriptUpdated {
  const event = changetype<DependencyScriptUpdated>(newMockEvent());
  event.parameters = [
    new ethereum.EventParam(
      "dependencyNameAndVersion",
      ethereum.Value.fromBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
    ),
  ];
  event.block.timestamp = timestamp;
  event.address = DEPENDENCY_REGISTRY_ADDRESS;
  return event;
}

// Scripts as indexed from the registry's own script storage, before ABX FS.
function storeRegistryScripts(count: i32): void {
  const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);
  if (!dependency) {
    throw Error("Dependency should exist");
  }
  let scripts: string[] = [];
  for (let i = 0; i < count; i++) {
    const dependencyScript = new DependencyScript(
      generateDependencyScriptId(EXISTING_DEPENDENCY_TYPE, BigInt.fromI32(i))
    );
    dependencyScript.index = BigInt.fromI32(i);
    dependencyScript.dependency = EXISTING_DEPENDENCY_TYPE;
    dependencyScript.script = "registry-".concat(i.toString());
    dependencyScript.address = randomAddressGenerator.generateRandomAddress();
    dependencyScript.save();
    scripts.push(dependencyScript.script);
  }
  dependency.script = scripts.join("");
  dependency.scriptCount = BigInt.fromI32(count);
  dependency.save();
}

// Bytes overloads ==, which assert.assertNull's null comparison cannot compile against.
function assertNoCid(dependency: Dependency): void {
  if (dependency.abxfsFileCid !== null) {
    throw Error("abxfsFileCid should be null");
  }
}

function assertScripts(expected: string[]): void {
  assert.entityCount("DependencyScript", expected.length);
  for (let i = 0; i < expected.length; i++) {
    const id = generateDependencyScriptId(
      EXISTING_DEPENDENCY_TYPE,
      BigInt.fromI32(i)
    );
    assert.fieldEquals("DependencyScript", id, "script", expected[i]);
    assert.fieldEquals("DependencyScript", id, "address", ZERO_ADDRESS);
    assert.fieldEquals("DependencyScript", id, "index", i.toString());
  }
  assert.fieldEquals(
    "Dependency",
    EXISTING_DEPENDENCY_TYPE,
    "scriptCount",
    expected.length.toString()
  );
  // An empty script reads back as null, as in the registry script tests.
  assert.fieldEquals(
    "Dependency",
    EXISTING_DEPENDENCY_TYPE,
    "script",
    expected.length > 0 ? expected.join("") : "null"
  );
}

describe("handleDependencyAbxfsFileCidUpdated", () => {
  beforeEach(() => {
    clearStore();
    const dependency = new Dependency(EXISTING_DEPENDENCY_TYPE);
    dependency.licenseType = "MIT";
    dependency.preferredCDN = "cdn.com";
    dependency.preferredRepository = "repository.com";
    dependency.website = "p5js.org";
    dependency.additionalCDNCount = BigInt.fromI32(0);
    dependency.additionalRepositoryCount = BigInt.fromI32(0);
    dependency.scriptCount = BigInt.fromI32(0);
    dependency.dependencyRegistry = DEPENDENCY_REGISTRY_ADDRESS;
    dependency.updatedAt = CURRENT_BLOCK_TIMESTAMP;
    dependency.save();

    const license = new License("MIT");
    license.updatedAt = CURRENT_BLOCK_TIMESTAMP;
    license.save();
  });

  test("does nothing for a dependency that does not exist", () => {
    const event = abxfsFileCidUpdatedEvent(CID, CURRENT_BLOCK_TIMESTAMP);
    event.parameters[0] = new ethereum.EventParam(
      "dependencyNameAndVersion",
      ethereum.Value.fromFixedBytes(Bytes.fromUTF8("missing@1.0.0"))
    );
    handleDependencyAbxfsFileCidUpdated(event);

    assert.entityCount("Dependency", 1);
    assert.notInStore("Dependency", "missing@1.0.0");
    const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);
    if (!dependency) {
      throw Error("Dependency should exist");
    }
    assertNoCid(dependency);
  });

  test("sets the CID and replaces registry scripts with the file's slices", () => {
    storeRegistryScripts(2);
    mockScriptCount(1);
    mockScript(0, "H4sIAAAA");

    const updatedAt = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(1));
    handleDependencyAbxfsFileCidUpdated(
      abxfsFileCidUpdatedEvent(CID, updatedAt)
    );

    assert.fieldEquals(
      "Dependency",
      EXISTING_DEPENDENCY_TYPE,
      "abxfsFileCid",
      CID.toHexString()
    );
    assertScripts(["H4sIAAAA"]);
    assert.fieldEquals(
      "Dependency",
      EXISTING_DEPENDENCY_TYPE,
      "updatedAt",
      updatedAt.toString()
    );
  });

  test("removes the scripts past a smaller slice count", () => {
    storeRegistryScripts(10);
    let slices: string[] = [];
    mockScriptCount(7);
    for (let i = 0; i < 7; i++) {
      const slice = "slice-".concat(i.toString());
      mockScript(i, slice);
      slices.push(slice);
    }

    handleDependencyAbxfsFileCidUpdated(
      abxfsFileCidUpdatedEvent(CID, CURRENT_BLOCK_TIMESTAMP)
    );

    assertScripts(slices);
    for (let i = 7; i < 10; i++) {
      assert.notInStore(
        "DependencyScript",
        generateDependencyScriptId(EXISTING_DEPENDENCY_TYPE, BigInt.fromI32(i))
      );
    }
  });

  test("a zero CID clears the CID and the scripts", () => {
    mockScriptCount(2);
    mockScript(0, "a");
    mockScript(1, "b");
    handleDependencyAbxfsFileCidUpdated(
      abxfsFileCidUpdatedEvent(CID, CURRENT_BLOCK_TIMESTAMP)
    );
    assertScripts(["a", "b"]);

    mockScriptCount(0);
    handleDependencyAbxfsFileCidUpdated(
      abxfsFileCidUpdatedEvent(
        ZERO_CID,
        CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(1))
      )
    );

    const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);
    if (!dependency) {
      throw Error("Dependency should exist");
    }
    assertNoCid(dependency);
    assertScripts([]);
  });

  test("registry script history followed by the file ends in the file's state", () => {
    // Before the registry upgrade: scripts stored in the registry.
    const first = randomAddressGenerator.generateRandomAddress();
    const second = randomAddressGenerator.generateRandomAddress();
    mockScriptCount(2);
    mockScript(0, "registry-0");
    mockScript(1, "registry-1");
    mockScriptBytecodeAddress(0, first);
    mockScriptBytecodeAddress(1, second);
    handleDependencyScriptUpdated(scriptUpdatedEvent(CURRENT_BLOCK_TIMESTAMP));
    assert.fieldEquals(
      "DependencyScript",
      generateDependencyScriptId(EXISTING_DEPENDENCY_TYPE, BigInt.fromI32(1)),
      "address",
      second.toHexString()
    );
    assert.fieldEquals(
      "Dependency",
      EXISTING_DEPENDENCY_TYPE,
      "script",
      "registry-0registry-1"
    );

    // After it: the same views serve the ABX FS file.
    mockScriptCount(3);
    mockScript(0, "file-0");
    mockScript(1, "file-1");
    mockScript(2, "file-2");
    handleDependencyAbxfsFileCidUpdated(
      abxfsFileCidUpdatedEvent(
        CID,
        CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(1))
      )
    );

    assert.fieldEquals(
      "Dependency",
      EXISTING_DEPENDENCY_TYPE,
      "abxfsFileCid",
      CID.toHexString()
    );
    assertScripts(["file-0", "file-1", "file-2"]);
  });

  test("keeps the indexed scripts when the script count cannot be read", () => {
    storeRegistryScripts(2);
    mockScriptCountReverts();

    handleDependencyAbxfsFileCidUpdated(
      abxfsFileCidUpdatedEvent(CID, CURRENT_BLOCK_TIMESTAMP)
    );

    assert.fieldEquals(
      "Dependency",
      EXISTING_DEPENDENCY_TYPE,
      "abxfsFileCid",
      CID.toHexString()
    );
    assert.entityCount("DependencyScript", 2);
    assert.fieldEquals(
      "Dependency",
      EXISTING_DEPENDENCY_TYPE,
      "scriptCount",
      "2"
    );
    assert.fieldEquals(
      "Dependency",
      EXISTING_DEPENDENCY_TYPE,
      "script",
      "registry-0registry-1"
    );
  });
});
