import {
  assert,
  clearStore,
  test,
  createMockedFunction,
  newMockEvent,
  describe,
  beforeEach
} from "matchstick-as/assembly/index";

import { BigInt, Bytes, ethereum, Address } from "@graphprotocol/graph-ts";

import {
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
  addTestContractToStore,
  addNewProjectToStore,
  addNewContractToStore
} from "../shared-helpers";

import {
  generateDependencyAdditionalCDNId,
  generateDependencyAdditionalRepositoryId,
  generateDependencyScriptId
} from "../../../src/helpers";

import {
  DependencyAdded,
  DependencyAdditionalCDNRemoved,
  DependencyAdditionalCDNUpdated,
  DependencyAdditionalRepositoryRemoved,
  DependencyAdditionalRepositoryUpdated,
  DependencyPreferredCDNUpdated,
  DependencyPreferredRepositoryUpdated,
  DependencyReferenceWebsiteUpdated,
  DependencyRemoved,
  DependencyScriptUpdated,
  ProjectDependencyTypeOverrideAdded,
  ProjectDependencyTypeOverrideRemoved,
  SupportedCoreContractAdded,
  SupportedCoreContractRemoved
} from "../../../generated/IDependencyRegistryV0/IDependencyRegistryV0";

import { OwnershipTransferred } from "../../../generated/OwnableUpgradeable/OwnableUpgradeable";

import {
  handleDependencyAdded,
  handleDependencyAdditionalCDNRemoved,
  handleDependencyAdditionalCDNUpdated,
  handleDependencyAdditionalRepositoryRemoved,
  handleDependencyAdditionalRepositoryUpdated,
  handleDependencyPreferredCDNUpdated,
  handleDependencyPreferredRepositoryUpdated,
  handleDependencyReferenceWebsiteUpdated,
  handleDependencyRemoved,
  handleDependencyScriptUpdated,
  handleOwnershipTransferred,
  handleProjectDependencyTypeOverrideAdded,
  handleProjectDependencyTypeOverrideRemoved,
  handleSupportedCoreContractAdded,
  handleSupportedCoreContractRemoved
} from "../../../src/dependency-registry";

import {
  Dependency,
  DependencyAdditionalCDN,
  DependencyAdditionalRepository,
  DependencyRegistry,
  DependencyScript
} from "../../../generated/schema";

const randomAddressGenerator = new RandomAddressGenerator();
const DEPENDENCY_REGISTRY_ADDRESS = randomAddressGenerator.generateRandomAddress();
const EXISTING_DEPENDENCY_TYPE = "p5js@1.0.0";

describe("DependencyRegistry", () => {
  beforeEach(() => {
    clearStore();
    const dependencyType = EXISTING_DEPENDENCY_TYPE;
    const preferredCDN = "cdn.com";
    const preferredRepository = "repository.com";
    const referenceWebsite = "p5js.org";
    const dependency = new Dependency(dependencyType);
    dependency.preferredCDN = preferredCDN;
    dependency.preferredRepository = preferredRepository;
    dependency.referenceWebsite = referenceWebsite;
    dependency.additionalCDNCount = BigInt.fromI32(0);
    dependency.additionalRepositoryCount = BigInt.fromI32(0);
    dependency.scriptCount = BigInt.fromI32(0);
    dependency.dependencyRegistry = DEPENDENCY_REGISTRY_ADDRESS;
    dependency.updatedAt = CURRENT_BLOCK_TIMESTAMP;
    dependency.save();
  });

  test("handleDependencyAdded should add a new Depdendency", () => {
    const dependencyType = "threejs@1.0.0";
    const preferredCDN = "cdn.com";
    const preferredRepository = "repository.com";
    const referenceWebsite = "p5js.org";
    const dependencyRegistryAddress = DEPENDENCY_REGISTRY_ADDRESS;

    const dependencyRegistry = new DependencyRegistry(
      dependencyRegistryAddress
    );
    dependencyRegistry.owner = randomAddressGenerator.generateRandomAddress();
    dependencyRegistry.updatedAt = CURRENT_BLOCK_TIMESTAMP;
    dependencyRegistry.save();

    const event: DependencyAdded = changetype<DependencyAdded>(newMockEvent());
    event.address = dependencyRegistryAddress;
    event.parameters = [
      new ethereum.EventParam(
        "_dependencyType",
        ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
      ),
      new ethereum.EventParam(
        "_preferredCDN",
        ethereum.Value.fromString(preferredCDN)
      ),
      new ethereum.EventParam(
        "_preferredRepository",
        ethereum.Value.fromString(preferredRepository)
      ),
      new ethereum.EventParam(
        "_referenceWebsite",
        ethereum.Value.fromString(referenceWebsite)
      )
    ];
    const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
      BigInt.fromI32(1)
    );
    event.block.timestamp = updatedAtBlockTimestamp;

    handleDependencyAdded(event);

    assert.entityCount("Dependency", 2);
    assert.fieldEquals("Dependency", dependencyType, "id", dependencyType);
    assert.fieldEquals(
      "Dependency",
      dependencyType,
      "updatedAt",
      updatedAtBlockTimestamp.toString()
    );

    assert.fieldEquals(
      "DependencyRegistry",
      dependencyRegistryAddress.toHexString(),
      "updatedAt",
      updatedAtBlockTimestamp.toString()
    );
  });

  describe("handleDependencyRemoved", () => {
    test("should do nothing if dependency does not exist", () => {
      assert.entityCount("Dependency", 1);

      const dependencyType = "does@notexist";

      const event: DependencyRemoved = changetype<DependencyRemoved>(
        newMockEvent()
      );
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        )
      ];

      handleDependencyRemoved(event);

      assert.entityCount("Dependency", 1);
    });
    test("should remove existing dependency", () => {
      const dependencyRegistry = new DependencyRegistry(
        DEPENDENCY_REGISTRY_ADDRESS
      );
      dependencyRegistry.owner = randomAddressGenerator.generateRandomAddress();
      dependencyRegistry.updatedAt = CURRENT_BLOCK_TIMESTAMP;
      dependencyRegistry.save();

      assert.entityCount("Dependency", 1);

      // redefining here because closures aren't supported in AssemblyScript
      const dependencyType = EXISTING_DEPENDENCY_TYPE;

      const event: DependencyRemoved = changetype<DependencyRemoved>(
        newMockEvent()
      );
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;
      event.address = DEPENDENCY_REGISTRY_ADDRESS;

      handleDependencyRemoved(event);

      assert.entityCount("Dependency", 0);

      assert.fieldEquals(
        "DependencyRegistry",
        DEPENDENCY_REGISTRY_ADDRESS.toHexString(),
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyPreferredCDNUpdated", () => {
    test("should do nothing if dependency does not exist", () => {
      const existingDependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      assert.assertNotNull(existingDependency);

      const dependencyType = "does@notexist";
      const preferredCDN = "newCdn.com";

      const event: DependencyPreferredCDNUpdated = changetype<
        DependencyPreferredCDNUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_preferredCDN",
          ethereum.Value.fromString(preferredCDN)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp == updatedAtBlockTimestamp;

      handleDependencyPreferredCDNUpdated(event);

      assert.assertTrue(existingDependency.preferredCDN !== preferredCDN);
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "preferredCDN",
        existingDependency.preferredCDN
      );
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    test("should update existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyType = dependency.id;
      const newCDN = "newCdn.com";

      const event = changetype<DependencyPreferredCDNUpdated>(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_preferredCDN",
          ethereum.Value.fromString(newCDN)
        )
      ];
      const upddatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = upddatedAtBlockTimestamp;

      handleDependencyPreferredCDNUpdated(event);

      assert.fieldEquals("Dependency", dependencyType, "preferredCDN", newCDN);
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        upddatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyPreferredRepositoryUpdated", () => {
    test("should do nothing if dependency does not exist", () => {
      const existingDependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const nonExistantDependencyType = "does@notexist";
      const preferredRepository = "newRepository.com";

      const event: DependencyPreferredRepositoryUpdated = changetype<
        DependencyPreferredRepositoryUpdated
      >(newMockEvent());

      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(nonExistantDependencyType))
        ),
        new ethereum.EventParam(
          "_preferredRepository",
          ethereum.Value.fromString(preferredRepository)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyPreferredRepositoryUpdated(event);

      assert.assertTrue(
        existingDependency.preferredRepository !== preferredRepository
      );
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "preferredRepository",
        existingDependency.preferredRepository
      );
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });
    test("should update existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyType = dependency.id;
      const newRepository = "newRepository.com";

      const event: DependencyPreferredRepositoryUpdated = changetype<
        DependencyPreferredRepositoryUpdated
      >(newMockEvent());

      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_preferredRepository",
          ethereum.Value.fromString(newRepository)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyPreferredRepositoryUpdated(event);

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "preferredRepository",
        newRepository
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyReferenceWebsiteUpdated", () => {
    test("should do nothing if dependency does not exist", () => {
      const existingDependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const nonExistantDependencyType = "does@notexist";
      const referenceWebsite = "newReferenceWebsite.com";

      const event: DependencyReferenceWebsiteUpdated = changetype<
        DependencyReferenceWebsiteUpdated
      >(newMockEvent());

      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(nonExistantDependencyType))
        ),
        new ethereum.EventParam(
          "_referenceWebsite",
          ethereum.Value.fromString(referenceWebsite)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyReferenceWebsiteUpdated(event);

      assert.assertTrue(
        existingDependency.referenceWebsite !== referenceWebsite
      );
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "referenceWebsite",
        existingDependency.referenceWebsite
      );
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });
    test("should update existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyType = dependency.id;
      const referenceWebsite = "newReferenceWebsite.com";

      const event: DependencyReferenceWebsiteUpdated = changetype<
        DependencyReferenceWebsiteUpdated
      >(newMockEvent());

      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_referenceWebsite",
          ethereum.Value.fromString(referenceWebsite)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyReferenceWebsiteUpdated(event);

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "referenceWebsite",
        referenceWebsite
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyAdditionalCDNUpdated", () => {
    test("should do nothing if dependency does not exist", () => {
      const existingDependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const nonExistantDependencyType = "does@notexist";
      const additionalCDN = "newAdditionalCDN.com";
      const additionalCDNIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalCDNUpdated = changetype<
        DependencyAdditionalCDNUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(nonExistantDependencyType))
        ),
        new ethereum.EventParam(
          "_additionalCDN",
          ethereum.Value.fromString(additionalCDN)
        ),
        new ethereum.EventParam(
          "_additionalCDNIndex",
          ethereum.Value.fromUnsignedBigInt(additionalCDNIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyAdditionalCDNUpdated(event);

      assert.assertTrue(
        existingDependency.additionalCDNCount.equals(BigInt.fromI32(0))
      );
      assert.entityCount("DependencyAdditionalCDN", 0);
      assert.notInStore(
        "DependencyAdditionalCDN",
        generateDependencyAdditionalCDNId(
          nonExistantDependencyType,
          additionalCDNIndex
        )
      );
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });
    test("should add a new additional CDN for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyType = dependency.id;
      const additionalCDN = "newAdditionalCDN.com";
      const additionalCDNIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalCDNUpdated = changetype<
        DependencyAdditionalCDNUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_additionalCDN",
          ethereum.Value.fromString(additionalCDN)
        ),
        new ethereum.EventParam(
          "_additionalCDNIndex",
          ethereum.Value.fromUnsignedBigInt(additionalCDNIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyAdditionalCDNUpdated(event);

      assert.entityCount("DependencyAdditionalCDN", 1);
      assert.fieldEquals(
        "DependencyAdditionalCDN",
        generateDependencyAdditionalCDNId(dependencyType, additionalCDNIndex),
        "cdn",
        additionalCDN
      );
      assert.fieldEquals(
        "DependencyAdditionalCDN",
        generateDependencyAdditionalCDNId(dependencyType, additionalCDNIndex),
        "dependency",
        dependencyType
      );

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "additionalCDNCount",
        additionalCDNIndex.plus(BigInt.fromI32(1)).toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
    test("should update existing additional CDN for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyType = dependency.id;
      const additionalCDN = "existingAdditionalCDN.com";
      const additionalCDNIndex = BigInt.fromI32(0);
      const additionalCDNId = generateDependencyAdditionalCDNId(
        dependencyType,
        additionalCDNIndex
      );

      const existingDependency = new DependencyAdditionalCDN(additionalCDNId);
      existingDependency.cdn = additionalCDN;
      existingDependency.dependency = dependencyType;
      existingDependency.index = additionalCDNIndex;
      existingDependency.save();

      dependency.additionalCDNCount = BigInt.fromI32(1);
      dependency.save();

      const updatedAdditionalCDN = "updatedAdditionalCDN.com";

      const event: DependencyAdditionalCDNUpdated = changetype<
        DependencyAdditionalCDNUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_additionalCDN",
          ethereum.Value.fromString(updatedAdditionalCDN)
        ),
        new ethereum.EventParam(
          "_additionalCDNIndex",
          ethereum.Value.fromUnsignedBigInt(additionalCDNIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyAdditionalCDNUpdated(event);

      assert.entityCount("DependencyAdditionalCDN", 1);
      assert.fieldEquals(
        "DependencyAdditionalCDN",
        additionalCDNId,
        "cdn",
        updatedAdditionalCDN
      );
      assert.fieldEquals(
        "DependencyAdditionalCDN",
        additionalCDNId,
        "dependency",
        dependencyType
      );

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "additionalCDNCount",
        additionalCDNIndex.plus(BigInt.fromI32(1)).toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyAdditionalRepositoryUpdated", () => {
    test("should do nothing if dependency does not exist", () => {
      const existingDependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const nonExistantDependencyType = "does@notexist";
      const additionalRepository = "newadditionalRepository.com";
      const additionalRepositoryIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalRepositoryUpdated = changetype<
        DependencyAdditionalRepositoryUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(nonExistantDependencyType))
        ),
        new ethereum.EventParam(
          "_additionalRepository",
          ethereum.Value.fromString(additionalRepository)
        ),
        new ethereum.EventParam(
          "_additionalRepositoryIndex",
          ethereum.Value.fromUnsignedBigInt(additionalRepositoryIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyAdditionalRepositoryUpdated(event);

      assert.assertTrue(
        existingDependency.additionalRepositoryCount.equals(BigInt.fromI32(0))
      );
      assert.entityCount("DependencyAdditionalRepository", 0);
      assert.notInStore(
        "DependencyAdditionalRepository",
        generateDependencyAdditionalRepositoryId(
          nonExistantDependencyType,
          additionalRepositoryIndex
        )
      );
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });
    test("should add a new additional repository for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyType = dependency.id;
      const additionalRepository = "newadditionalRepository.com";
      const additionalRepositoryIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalRepositoryUpdated = changetype<
        DependencyAdditionalRepositoryUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_additionalRepository",
          ethereum.Value.fromString(additionalRepository)
        ),
        new ethereum.EventParam(
          "_additionalRepositoryIndex",
          ethereum.Value.fromUnsignedBigInt(additionalRepositoryIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyAdditionalRepositoryUpdated(event);

      assert.entityCount("DependencyAdditionalRepository", 1);
      assert.fieldEquals(
        "DependencyAdditionalRepository",
        generateDependencyAdditionalRepositoryId(
          dependencyType,
          additionalRepositoryIndex
        ),
        "repository",
        additionalRepository
      );
      assert.fieldEquals(
        "DependencyAdditionalRepository",
        generateDependencyAdditionalRepositoryId(
          dependencyType,
          additionalRepositoryIndex
        ),
        "dependency",
        dependencyType
      );

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "additionalRepositoryCount",
        additionalRepositoryIndex.plus(BigInt.fromI32(1)).toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
    test("should update existing additional repository for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyType = dependency.id;
      const additionalRepository = "existingadditionalRepository.com";
      const additionalRepositoryIndex = BigInt.fromI32(0);
      const additionalRepositoryId = generateDependencyAdditionalRepositoryId(
        dependencyType,
        additionalRepositoryIndex
      );

      const existingDependency = new DependencyAdditionalRepository(
        additionalRepositoryId
      );
      existingDependency.repository = additionalRepository;
      existingDependency.dependency = dependencyType;
      existingDependency.index = additionalRepositoryIndex;
      existingDependency.save();

      dependency.additionalRepositoryCount = BigInt.fromI32(1);
      dependency.save();

      const updatedadditionalRepository = "updatedadditionalRepository.com";

      const event: DependencyAdditionalRepositoryUpdated = changetype<
        DependencyAdditionalRepositoryUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_additionalRepository",
          ethereum.Value.fromString(updatedadditionalRepository)
        ),
        new ethereum.EventParam(
          "_additionalRepositoryIndex",
          ethereum.Value.fromUnsignedBigInt(additionalRepositoryIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyAdditionalRepositoryUpdated(event);

      assert.entityCount("DependencyAdditionalRepository", 1);
      assert.fieldEquals(
        "DependencyAdditionalRepository",
        additionalRepositoryId,
        "repository",
        updatedadditionalRepository
      );
      assert.fieldEquals(
        "DependencyAdditionalRepository",
        additionalRepositoryId,
        "dependency",
        dependencyType
      );

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "additionalRepositoryCount",
        additionalRepositoryIndex.plus(BigInt.fromI32(1)).toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyAdditionalCDNRemoved", () => {
    beforeEach(() => {
      const dependencyAdditionalCDN = new DependencyAdditionalCDN(
        generateDependencyAdditionalCDNId(
          EXISTING_DEPENDENCY_TYPE,
          BigInt.fromI32(0)
        )
      );
      dependencyAdditionalCDN.cdn = "existingcdn.com";
      dependencyAdditionalCDN.dependency = EXISTING_DEPENDENCY_TYPE;
      dependencyAdditionalCDN.index = BigInt.fromI32(0);
      dependencyAdditionalCDN.save();

      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);
      if (!dependency) {
        throw Error("Dependency should exist");
      }
      dependency.additionalCDNCount = BigInt.fromI32(1);
      dependency.save();
    });

    test("should not remove additional cdn for non existant dependency", () => {
      const nonExistantDependencyType = "nonExistantDependencyType";
      const additionalCDNIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalCDNRemoved = changetype<
        DependencyAdditionalCDNRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(nonExistantDependencyType))
        ),
        new ethereum.EventParam(
          "_additionalCDNIndex",
          ethereum.Value.fromUnsignedBigInt(additionalCDNIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyAdditionalCDN", 1);

      handleDependencyAdditionalCDNRemoved(event);

      assert.entityCount("DependencyAdditionalCDN", 1);
    });

    test("should do nothing if additional cdn does not exist", () => {
      const dependencyType = EXISTING_DEPENDENCY_TYPE;
      const additionalCDNIndex = BigInt.fromI32(1);
      const existingDependency = Dependency.load(dependencyType);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const event: DependencyAdditionalCDNRemoved = changetype<
        DependencyAdditionalCDNRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_additionalCDNIndex",
          ethereum.Value.fromUnsignedBigInt(additionalCDNIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyAdditionalCDN", 1);

      handleDependencyAdditionalCDNRemoved(event);

      assert.entityCount("DependencyAdditionalCDN", 1);

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "additionalCDNCount",
        existingDependency.additionalCDNCount.toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    test("should remove existing additional cdn for existing dependency", () => {
      const dependencyType = EXISTING_DEPENDENCY_TYPE;
      const additionalCDNIndex = BigInt.fromI32(0);
      const existingDependency = Dependency.load(dependencyType);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const event: DependencyAdditionalCDNRemoved = changetype<
        DependencyAdditionalCDNRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_additionalCDNIndex",
          ethereum.Value.fromUnsignedBigInt(additionalCDNIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyAdditionalCDN", 1);

      handleDependencyAdditionalCDNRemoved(event);

      assert.entityCount("DependencyAdditionalCDN", 0);

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "additionalCDNCount",
        existingDependency.additionalCDNCount
          .minus(BigInt.fromI32(1))
          .toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyAdditionalRepositoryRemoved", () => {
    beforeEach(() => {
      const dependencyAdditionalRepository = new DependencyAdditionalRepository(
        generateDependencyAdditionalRepositoryId(
          EXISTING_DEPENDENCY_TYPE,
          BigInt.fromI32(0)
        )
      );
      dependencyAdditionalRepository.repository = "existingcdn.com";
      dependencyAdditionalRepository.dependency = EXISTING_DEPENDENCY_TYPE;
      dependencyAdditionalRepository.index = BigInt.fromI32(0);
      dependencyAdditionalRepository.save();

      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);
      if (!dependency) {
        throw Error("Dependency should exist");
      }
      dependency.additionalRepositoryCount = BigInt.fromI32(1);
      dependency.save();
    });

    test("should not remove additional cdn for non existant dependency", () => {
      const nonExistantDependencyType = "nonExistantDependencyType";
      const additionalRepositoryIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalRepositoryRemoved = changetype<
        DependencyAdditionalRepositoryRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(nonExistantDependencyType))
        ),
        new ethereum.EventParam(
          "_additionalRepositoryIndex",
          ethereum.Value.fromUnsignedBigInt(additionalRepositoryIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyAdditionalRepository", 1);

      handleDependencyAdditionalRepositoryRemoved(event);

      assert.entityCount("DependencyAdditionalRepository", 1);
    });

    test("should do nothing if additional cdn does not exist", () => {
      const dependencyType = EXISTING_DEPENDENCY_TYPE;
      const additionalRepositoryIndex = BigInt.fromI32(1);
      const existingDependency = Dependency.load(dependencyType);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const event: DependencyAdditionalRepositoryRemoved = changetype<
        DependencyAdditionalRepositoryRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_additionalRepositoryIndex",
          ethereum.Value.fromUnsignedBigInt(additionalRepositoryIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyAdditionalRepository", 1);

      handleDependencyAdditionalRepositoryRemoved(event);

      assert.entityCount("DependencyAdditionalRepository", 1);

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "additionalRepositoryCount",
        existingDependency.additionalRepositoryCount.toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    test("should remove existing additional cdn for existing dependency", () => {
      const dependencyType = EXISTING_DEPENDENCY_TYPE;
      const additionalRepositoryIndex = BigInt.fromI32(0);
      const existingDependency = Dependency.load(dependencyType);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const event: DependencyAdditionalRepositoryRemoved = changetype<
        DependencyAdditionalRepositoryRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyType))
        ),
        new ethereum.EventParam(
          "_additionalRepositoryIndex",
          ethereum.Value.fromUnsignedBigInt(additionalRepositoryIndex)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyAdditionalRepository", 1);

      handleDependencyAdditionalRepositoryRemoved(event);

      assert.entityCount("DependencyAdditionalRepository", 0);

      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "additionalRepositoryCount",
        existingDependency.additionalRepositoryCount
          .minus(BigInt.fromI32(1))
          .toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyType,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyScriptUpdated", () => {
    test("should not update script for non existant dependency", () => {
      const nonExistantDependencyType = "nonExistantDependencyType";

      const event: DependencyScriptUpdated = changetype<
        DependencyScriptUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(nonExistantDependencyType))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyScript", 0);

      handleDependencyScriptUpdated(event);

      assert.entityCount("DependencyScript", 0);
    });
    test("should add a new script for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);
      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const script = "script";

      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "scriptCount",
        "0"
      );

      createMockedFunction(
        DEPENDENCY_REGISTRY_ADDRESS,
        "getDependencyScriptCount",
        "getDependencyScriptCount(bytes32):(uint256)"
      )
        .withArgs([
          ethereum.Value.fromFixedBytes(
            Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE)
          )
        ])
        .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))]);

      createMockedFunction(
        DEPENDENCY_REGISTRY_ADDRESS,
        "getDependencyScriptAtIndex",
        "getDependencyScriptAtIndex(bytes32,uint256):(string)"
      )
        .withArgs([
          ethereum.Value.fromFixedBytes(
            Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE)
          ),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
        ])
        .returns([ethereum.Value.fromString(script)]);

      const scriptAddress = randomAddressGenerator.generateRandomAddress();
      createMockedFunction(
        DEPENDENCY_REGISTRY_ADDRESS,
        "getDependencyScriptBytecodeAddressAtIndex",
        "getDependencyScriptBytecodeAddressAtIndex(bytes32,uint256):(address)"
      )
        .withArgs([
          ethereum.Value.fromFixedBytes(
            Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE)
          ),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
        ])
        .returns([ethereum.Value.fromAddress(scriptAddress)]);

      const event: DependencyScriptUpdated = changetype<
        DependencyScriptUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;
      event.address = DEPENDENCY_REGISTRY_ADDRESS;
      handleDependencyScriptUpdated(event);

      const dependencyScriptId = generateDependencyScriptId(
        EXISTING_DEPENDENCY_TYPE,
        BigInt.fromI32(0)
      );
      assert.entityCount("DependencyScript", 1);
      assert.fieldEquals(
        "DependencyScript",
        dependencyScriptId,
        "script",
        script
      );
      assert.fieldEquals(
        "DependencyScript",
        dependencyScriptId,
        "address",
        scriptAddress.toHexString()
      );
      assert.fieldEquals(
        "DependencyScript",
        dependencyScriptId,
        "dependency",
        EXISTING_DEPENDENCY_TYPE
      );

      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "scriptCount",
        "1"
      );
      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "script",
        script
      );
      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
    test("should update existing script for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);
      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const existingScript = "existing script";
      const existingScriptIndex = BigInt.fromI32(0);
      const existingScriptAddress = randomAddressGenerator.generateRandomAddress();
      const existingDependencyScript = new DependencyScript(
        generateDependencyScriptId(EXISTING_DEPENDENCY_TYPE, BigInt.fromI32(0))
      );
      existingDependencyScript.script = existingScript;
      existingDependencyScript.address = existingScriptAddress;
      existingDependencyScript.dependency = dependency.id;
      existingDependencyScript.index = existingScriptIndex;
      existingDependencyScript.save();

      dependency.scriptCount = BigInt.fromI32(1);
      dependency.save();

      const updatedScript = "new script";
      const updatedScriptAddress = randomAddressGenerator.generateRandomAddress();

      createMockedFunction(
        DEPENDENCY_REGISTRY_ADDRESS,
        "getDependencyScriptCount",
        "getDependencyScriptCount(bytes32):(uint256)"
      )
        .withArgs([
          ethereum.Value.fromFixedBytes(
            Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE)
          )
        ])
        .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))]);

      createMockedFunction(
        DEPENDENCY_REGISTRY_ADDRESS,
        "getDependencyScriptAtIndex",
        "getDependencyScriptAtIndex(bytes32,uint256):(string)"
      )
        .withArgs([
          ethereum.Value.fromFixedBytes(
            Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE)
          ),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
        ])
        .returns([ethereum.Value.fromString(updatedScript)]);

      createMockedFunction(
        DEPENDENCY_REGISTRY_ADDRESS,
        "getDependencyScriptBytecodeAddressAtIndex",
        "getDependencyScriptBytecodeAddressAtIndex(bytes32,uint256):(address)"
      )
        .withArgs([
          ethereum.Value.fromFixedBytes(
            Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE)
          ),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
        ])
        .returns([ethereum.Value.fromAddress(updatedScriptAddress)]);

      const event: DependencyScriptUpdated = changetype<
        DependencyScriptUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;
      event.address = DEPENDENCY_REGISTRY_ADDRESS;

      handleDependencyScriptUpdated(event);

      const dependencyScriptId = generateDependencyScriptId(
        EXISTING_DEPENDENCY_TYPE,
        BigInt.fromI32(0)
      );
      assert.entityCount("DependencyScript", 1);
      assert.fieldEquals(
        "DependencyScript",
        dependencyScriptId,
        "script",
        updatedScript
      );
      assert.fieldEquals(
        "DependencyScript",
        dependencyScriptId,
        "address",
        updatedScriptAddress.toHexString()
      );
      assert.fieldEquals(
        "DependencyScript",
        dependencyScriptId,
        "dependency",
        EXISTING_DEPENDENCY_TYPE
      );

      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "scriptCount",
        "1"
      );
      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "script",
        updatedScript
      );
      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
    test("should remove existing script for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);
      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const existingScript = "existing script";
      const existingScriptIndex = BigInt.fromI32(0);
      const existingScriptAddress = randomAddressGenerator.generateRandomAddress();
      const existingDependencyScript = new DependencyScript(
        generateDependencyScriptId(EXISTING_DEPENDENCY_TYPE, BigInt.fromI32(0))
      );
      existingDependencyScript.script = existingScript;
      existingDependencyScript.address = existingScriptAddress;
      existingDependencyScript.dependency = dependency.id;
      existingDependencyScript.index = existingScriptIndex;
      existingDependencyScript.save();

      dependency.scriptCount = BigInt.fromI32(1);
      dependency.save();

      createMockedFunction(
        DEPENDENCY_REGISTRY_ADDRESS,
        "getDependencyScriptCount",
        "getDependencyScriptCount(bytes32):(uint256)"
      )
        .withArgs([
          ethereum.Value.fromFixedBytes(
            Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE)
          )
        ])
        .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))]);

      const event: DependencyScriptUpdated = changetype<
        DependencyScriptUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;
      event.address = DEPENDENCY_REGISTRY_ADDRESS;

      assert.entityCount("DependencyScript", 1);

      handleDependencyScriptUpdated(event);

      assert.entityCount("DependencyScript", 0);

      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "scriptCount",
        "0"
      );
      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "script",
        "null"
      );
      assert.fieldEquals(
        "Dependency",
        EXISTING_DEPENDENCY_TYPE,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleSupportedCoreContractAdded", () => {
    test("should do nothing if core contract does not exist", () => {
      const event: SupportedCoreContractAdded = changetype<
        SupportedCoreContractAdded
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContract",
          ethereum.Value.fromAddress(
            randomAddressGenerator.generateRandomAddress()
          )
        )
      ];
      handleSupportedCoreContractAdded(event);

      assert.entityCount("Contract", 0);
    });
    test("should update core contract if core contract exists", () => {
      const dependencyRegistryAddress = randomAddressGenerator.generateRandomAddress();
      const coreContract = addTestContractToStore(BigInt.fromI32(1));

      const event: SupportedCoreContractAdded = changetype<
        SupportedCoreContractAdded
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContract",
          ethereum.Value.fromAddress(Address.fromString(coreContract.id))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.address = dependencyRegistryAddress;
      event.block.timestamp = updatedAtBlockTimestamp;

      handleSupportedCoreContractAdded(event);

      assert.fieldEquals(
        "Contract",
        coreContract.id,
        "dependencyRegistry",
        dependencyRegistryAddress.toHexString()
      );
      assert.fieldEquals(
        "Contract",
        coreContract.id,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleSupportedCoreContractRemoved", () => {
    test("should do nothing if core contract does not exist", () => {
      const event: SupportedCoreContractRemoved = changetype<
        SupportedCoreContractRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContract",
          ethereum.Value.fromAddress(
            randomAddressGenerator.generateRandomAddress()
          )
        )
      ];
      handleSupportedCoreContractRemoved(event);

      assert.entityCount("Contract", 0);
    });
    test("should update core contract if core contract exists", () => {
      const dependencyRegistryAddress = randomAddressGenerator.generateRandomAddress();
      const coreContract = addTestContractToStore(BigInt.fromI32(1));
      coreContract.dependencyRegistry = dependencyRegistryAddress;
      coreContract.save();

      const event: SupportedCoreContractRemoved = changetype<
        SupportedCoreContractRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContract",
          ethereum.Value.fromAddress(Address.fromString(coreContract.id))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.address = dependencyRegistryAddress;
      event.block.timestamp = updatedAtBlockTimestamp;

      handleSupportedCoreContractRemoved(event);

      assert.fieldEquals(
        "Contract",
        coreContract.id,
        "dependencyRegistry",
        "null"
      );
      assert.fieldEquals(
        "Contract",
        coreContract.id,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleProjectDependencyTypeOverrideAdded", () => {
    test("should do nothing if project does not exist", () => {
      const event: ProjectDependencyTypeOverrideAdded = changetype<
        ProjectDependencyTypeOverrideAdded
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContractAddress",
          ethereum.Value.fromAddress(
            randomAddressGenerator.generateRandomAddress()
          )
        ),
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
        ),
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
        )
      ];
      handleProjectDependencyTypeOverrideAdded(event);

      assert.entityCount("Project", 0);
    });
    test("should add project dependency type override if project exists", () => {
      const contract = addNewContractToStore();
      const contractAddress = Address.fromString(contract.id);

      const project = addNewProjectToStore(
        contractAddress,
        BigInt.fromI32(0),
        "test project",
        randomAddressGenerator.generateRandomAddress(),
        BigInt.fromI32(0),
        CURRENT_BLOCK_TIMESTAMP
      );

      const event: ProjectDependencyTypeOverrideAdded = changetype<
        ProjectDependencyTypeOverrideAdded
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContractAddress",
          ethereum.Value.fromAddress(Address.fromString(contract.id))
        ),
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(project.projectId)
        ),
        new ethereum.EventParam(
          "_dependencyType",
          ethereum.Value.fromBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.assertNull(project.scriptTypeAndVersion);

      handleProjectDependencyTypeOverrideAdded(event);

      assert.fieldEquals(
        "Project",
        project.id,
        "scriptTypeAndVersion",
        EXISTING_DEPENDENCY_TYPE
      );
      assert.fieldEquals(
        "Project",
        project.id,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleProjectDependencyTypeOverrideRemoved", () => {
    test("should do nothing if project does not exist", () => {
      const event: ProjectDependencyTypeOverrideRemoved = changetype<
        ProjectDependencyTypeOverrideRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContractAddress",
          ethereum.Value.fromAddress(
            randomAddressGenerator.generateRandomAddress()
          )
        ),
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
        )
      ];
      handleProjectDependencyTypeOverrideRemoved(event);

      assert.entityCount("Project", 0);
    });
    test("should remove project dependency type override and reset to address on contract", () => {
      const coreContract = addNewContractToStore();
      const coreContractAddress = Address.fromString(coreContract.id);
      const coreContractScriptTypeAndVersion = "three@0.0.24";

      const project = addNewProjectToStore(
        coreContractAddress,
        BigInt.fromI32(0),
        "test project",
        randomAddressGenerator.generateRandomAddress(),
        BigInt.fromI32(0),
        CURRENT_BLOCK_TIMESTAMP
      );
      project.scriptTypeAndVersion = EXISTING_DEPENDENCY_TYPE;
      project.save();

      createMockedFunction(
        coreContractAddress,
        "projectScriptDetails",
        "projectScriptDetails(uint256):(string,string,uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(project.projectId)])
        .returns([
          ethereum.Value.fromString(coreContractScriptTypeAndVersion),
          ethereum.Value.fromString("1.77"),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
        ]);

      const event: ProjectDependencyTypeOverrideRemoved = changetype<
        ProjectDependencyTypeOverrideRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContractAddress",
          ethereum.Value.fromAddress(coreContractAddress)
        ),
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(project.projectId)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.fieldEquals(
        "Project",
        project.id,
        "scriptTypeAndVersion",
        EXISTING_DEPENDENCY_TYPE
      );

      handleProjectDependencyTypeOverrideRemoved(event);

      assert.fieldEquals(
        "Project",
        project.id,
        "scriptTypeAndVersion",
        coreContractScriptTypeAndVersion
      );
      assert.fieldEquals(
        "Project",
        project.id,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
    test("should remove project dependency type override and reset to null if not dependency registry compatible", () => {
      const coreContract = addNewContractToStore();
      const coreContractAddress = Address.fromString(coreContract.id);

      const project = addNewProjectToStore(
        coreContractAddress,
        BigInt.fromI32(0),
        "test project",
        randomAddressGenerator.generateRandomAddress(),
        BigInt.fromI32(0),
        CURRENT_BLOCK_TIMESTAMP
      );
      project.scriptTypeAndVersion = EXISTING_DEPENDENCY_TYPE;
      project.save();

      createMockedFunction(
        coreContractAddress,
        "projectScriptDetails",
        "projectScriptDetails(uint256):(string,string,uint256)"
      )
        .withArgs([ethereum.Value.fromUnsignedBigInt(project.projectId)])
        .reverts();

      const event: ProjectDependencyTypeOverrideRemoved = changetype<
        ProjectDependencyTypeOverrideRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_coreContractAddress",
          ethereum.Value.fromAddress(coreContractAddress)
        ),
        new ethereum.EventParam(
          "_projectId",
          ethereum.Value.fromUnsignedBigInt(project.projectId)
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.fieldEquals(
        "Project",
        project.id,
        "scriptTypeAndVersion",
        EXISTING_DEPENDENCY_TYPE
      );

      handleProjectDependencyTypeOverrideRemoved(event);

      assert.fieldEquals("Project", project.id, "scriptTypeAndVersion", "null");
      assert.fieldEquals(
        "Project",
        project.id,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleOwnershipTransferred", () => {
    test("should set owner on new dependency registry", () => {
      const prevOwner = Address.zero();
      const newOwner = randomAddressGenerator.generateRandomAddress();

      const event = changetype<OwnershipTransferred>(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_previousOwner",
          ethereum.Value.fromAddress(prevOwner)
        ),
        new ethereum.EventParam(
          "_newOwner",
          ethereum.Value.fromAddress(newOwner)
        )
      ];
      event.address = DEPENDENCY_REGISTRY_ADDRESS;

      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyRegistry", 0);

      handleOwnershipTransferred(event);

      assert.entityCount("DependencyRegistry", 1);
      assert.fieldEquals(
        "DependencyRegistry",
        event.address.toHexString(),
        "owner",
        newOwner.toHexString()
      );
      assert.fieldEquals(
        "DependencyRegistry",
        event.address.toHexString(),
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
    test("should update owner on existing dependency registry", () => {
      const prevOwner = randomAddressGenerator.generateRandomAddress();
      const newOwner = randomAddressGenerator.generateRandomAddress();

      const dependencyRegistry = new DependencyRegistry(
        DEPENDENCY_REGISTRY_ADDRESS
      );
      dependencyRegistry.owner = prevOwner;
      dependencyRegistry.updatedAt = CURRENT_BLOCK_TIMESTAMP;
      dependencyRegistry.save();

      const event = changetype<OwnershipTransferred>(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "_previousOwner",
          ethereum.Value.fromAddress(prevOwner)
        ),
        new ethereum.EventParam(
          "_newOwner",
          ethereum.Value.fromAddress(newOwner)
        )
      ];
      event.address = DEPENDENCY_REGISTRY_ADDRESS;

      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.entityCount("DependencyRegistry", 1);

      handleOwnershipTransferred(event);

      assert.entityCount("DependencyRegistry", 1);
      assert.fieldEquals(
        "DependencyRegistry",
        event.address.toHexString(),
        "owner",
        newOwner.toHexString()
      );
      assert.fieldEquals(
        "DependencyRegistry",
        event.address.toHexString(),
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
});
