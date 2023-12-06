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
  DependencyWebsiteUpdated,
  DependencyRemoved,
  DependencyScriptUpdated,
  LicenseTextUpdated,
  LicenseTypeAdded,
  ProjectDependencyOverrideAdded,
  ProjectDependencyOverrideRemoved,
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
  handleDependencyWebsiteUpdated,
  handleDependencyRemoved,
  handleDependencyScriptUpdated,
  handleLicenseTextUpdated,
  handleLicenseTypeAdded,
  handleOwnershipTransferred,
  handleProjectDependencyOverrideAdded,
  handleProjectDependencyOverrideRemoved,
  handleSupportedCoreContractAdded,
  handleSupportedCoreContractRemoved
} from "../../../src/dependency-registry";

import {
  Dependency,
  DependencyAdditionalCDN,
  DependencyAdditionalRepository,
  DependencyRegistry,
  DependencyScript,
  License,
  Project
} from "../../../generated/schema";

const randomAddressGenerator = new RandomAddressGenerator();
const DEPENDENCY_REGISTRY_ADDRESS = randomAddressGenerator.generateRandomAddress();
const EXISTING_DEPENDENCY_TYPE = "p5js@1.0.0";

describe("DependencyRegistry", () => {
  beforeEach(() => {
    clearStore();
    const dependencyNameAndVersion = EXISTING_DEPENDENCY_TYPE;
    const preferredCDN = "cdn.com";
    const preferredRepository = "repository.com";
    const website = "p5js.org";
    const licenseType = "MIT";
    const dependency = new Dependency(dependencyNameAndVersion);
    dependency.licenseType = licenseType;
    dependency.preferredCDN = preferredCDN;
    dependency.preferredRepository = preferredRepository;
    dependency.website = website;
    dependency.additionalCDNCount = BigInt.fromI32(0);
    dependency.additionalRepositoryCount = BigInt.fromI32(0);
    dependency.scriptCount = BigInt.fromI32(0);
    dependency.dependencyRegistry = DEPENDENCY_REGISTRY_ADDRESS;
    dependency.updatedAt = CURRENT_BLOCK_TIMESTAMP;
    dependency.save();

    const licenseId = licenseType;
    const license = new License(licenseId);
    license.updatedAt = CURRENT_BLOCK_TIMESTAMP;
    license.save();
  });

  test("handleLicenseTextUpdated should update license text", () => {
    const licenseType = "MIT";
    const licenseText =
      "Permission is hereby granted, free of charge, to any person...";
    const dependencyRegistryAddress = DEPENDENCY_REGISTRY_ADDRESS;

    const dependencyRegistry = new DependencyRegistry(
      dependencyRegistryAddress
    );
    dependencyRegistry.owner = randomAddressGenerator.generateRandomAddress();
    dependencyRegistry.updatedAt = CURRENT_BLOCK_TIMESTAMP;
    dependencyRegistry.save();

    const event = changetype<LicenseTextUpdated>(newMockEvent());
    event.address = dependencyRegistryAddress;
    event.parameters = [
      new ethereum.EventParam(
        "licenseType",
        ethereum.Value.fromBytes(Bytes.fromUTF8(licenseType))
      ),
      new ethereum.EventParam(
        "licenseText",
        ethereum.Value.fromBytes(Bytes.fromUTF8(licenseText))
      )
    ];
    const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP;
    event.block.timestamp = updatedAtBlockTimestamp;

    handleLicenseTextUpdated(event);
    // note: currently the license text is not stored in the subgraph
    // so we can't assert on it, but we can assert that the updatedAt
    // field was updated. If we decide to store the license text in the
    // subgraph in the future, we should update this test.

    assert.fieldEquals(
      "DependencyRegistry",
      dependencyRegistryAddress.toHexString(),
      "updatedAt",
      updatedAtBlockTimestamp.toString()
    );
  });

  test("handleLicenseTypeAdded should add a new LicenseType", () => {
    const licenseType = "GPLv3";
    const dependencyRegistryAddress = DEPENDENCY_REGISTRY_ADDRESS;

    const dependencyRegistry = new DependencyRegistry(
      dependencyRegistryAddress
    );
    dependencyRegistry.owner = randomAddressGenerator.generateRandomAddress();
    dependencyRegistry.updatedAt = CURRENT_BLOCK_TIMESTAMP;
    dependencyRegistry.save();

    const event: LicenseTypeAdded = changetype<LicenseTypeAdded>(
      newMockEvent()
    );
    event.address = dependencyRegistryAddress;
    event.parameters = [
      new ethereum.EventParam(
        "licenseType",
        ethereum.Value.fromBytes(Bytes.fromUTF8(licenseType))
      )
    ];
    const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP;
    event.block.timestamp = updatedAtBlockTimestamp;

    handleLicenseTypeAdded(event);

    assert.entityCount("License", 2);
    assert.fieldEquals("License", licenseType, "id", licenseType);
    assert.fieldEquals(
      "License",
      licenseType,
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

  test("handleDependencyAdded should add a new Depdendency", () => {
    const dependencyNameAndVersion = "threejs@1.0.0";
    const licenseType = "MIT";
    const preferredCDN = "cdn.com";
    const preferredRepository = "repository.com";
    const website = "p5js.org";
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
        "dependencyNameAndVersion",
        ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
      ),
      new ethereum.EventParam(
        "licenseType",
        ethereum.Value.fromBytes(Bytes.fromUTF8(licenseType))
      ),
      new ethereum.EventParam(
        "preferredCDN",
        ethereum.Value.fromString(preferredCDN)
      ),
      new ethereum.EventParam(
        "preferredRepository",
        ethereum.Value.fromString(preferredRepository)
      ),
      new ethereum.EventParam("website", ethereum.Value.fromString(website))
    ];
    const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
      BigInt.fromI32(1)
    );
    event.block.timestamp = updatedAtBlockTimestamp;

    handleDependencyAdded(event);

    assert.entityCount("Dependency", 2);
    assert.fieldEquals(
      "Dependency",
      dependencyNameAndVersion,
      "id",
      dependencyNameAndVersion
    );
    assert.fieldEquals(
      "Dependency",
      dependencyNameAndVersion,
      "updatedAt",
      updatedAtBlockTimestamp.toString()
    );

    assert.fieldEquals(
      "Dependency",
      dependencyNameAndVersion,
      "licenseType",
      licenseType
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

      const dependencyNameAndVersion = "does@notexist";

      const event: DependencyRemoved = changetype<DependencyRemoved>(
        newMockEvent()
      );
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
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
      const dependencyNameAndVersion = EXISTING_DEPENDENCY_TYPE;

      const event: DependencyRemoved = changetype<DependencyRemoved>(
        newMockEvent()
      );
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
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

      const dependencyNameAndVersion = "does@notexist";
      const preferredCDN = "newCdn.com";

      const event: DependencyPreferredCDNUpdated = changetype<
        DependencyPreferredCDNUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "preferredCDN",
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

      const dependencyNameAndVersion = dependency.id;
      const newCDN = "newCdn.com";

      const event = changetype<DependencyPreferredCDNUpdated>(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "preferredCDN",
          ethereum.Value.fromString(newCDN)
        )
      ];
      const upddatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = upddatedAtBlockTimestamp;

      handleDependencyPreferredCDNUpdated(event);

      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "preferredCDN",
        newCDN
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
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

      const nonExistantDependencyNameAndVersion = "does@notexist";
      const preferredRepository = "newRepository.com";

      const event: DependencyPreferredRepositoryUpdated = changetype<
        DependencyPreferredRepositoryUpdated
      >(newMockEvent());

      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(nonExistantDependencyNameAndVersion)
          )
        ),
        new ethereum.EventParam(
          "preferredRepository",
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

      const dependencyNameAndVersion = dependency.id;
      const newRepository = "newRepository.com";

      const event: DependencyPreferredRepositoryUpdated = changetype<
        DependencyPreferredRepositoryUpdated
      >(newMockEvent());

      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "preferredRepository",
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
        dependencyNameAndVersion,
        "preferredRepository",
        newRepository
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyWebsiteUpdated", () => {
    test("should do nothing if dependency does not exist", () => {
      const existingDependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const nonExistantDependencyNameAndVersion = "does@notexist";
      const website = "newReferenceWebsite.com";

      const event: DependencyWebsiteUpdated = changetype<
        DependencyWebsiteUpdated
      >(newMockEvent());

      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(nonExistantDependencyNameAndVersion)
          )
        ),
        new ethereum.EventParam("website", ethereum.Value.fromString(website))
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyWebsiteUpdated(event);

      assert.assertTrue(existingDependency.website !== website);
      assert.fieldEquals(
        "Dependency",
        existingDependency.id,
        "website",
        existingDependency.website
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

      const dependencyNameAndVersion = dependency.id;
      const website = "newReferenceWebsite.com";

      const event: DependencyWebsiteUpdated = changetype<
        DependencyWebsiteUpdated
      >(newMockEvent());

      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam("website", ethereum.Value.fromString(website))
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      handleDependencyWebsiteUpdated(event);

      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "website",
        website
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
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

      const nonExistantDependencyNameAndVersion = "does@notexist";
      const additionalCDN = "newAdditionalCDN.com";
      const additionalCDNIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalCDNUpdated = changetype<
        DependencyAdditionalCDNUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(nonExistantDependencyNameAndVersion)
          )
        ),
        new ethereum.EventParam(
          "additionalCDN",
          ethereum.Value.fromString(additionalCDN)
        ),
        new ethereum.EventParam(
          "additionalCDNIndex",
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
          nonExistantDependencyNameAndVersion,
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

      const dependencyNameAndVersion = dependency.id;
      const additionalCDN = "newAdditionalCDN.com";
      const additionalCDNIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalCDNUpdated = changetype<
        DependencyAdditionalCDNUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "additionalCDN",
          ethereum.Value.fromString(additionalCDN)
        ),
        new ethereum.EventParam(
          "additionalCDNIndex",
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
        generateDependencyAdditionalCDNId(
          dependencyNameAndVersion,
          additionalCDNIndex
        ),
        "cdn",
        additionalCDN
      );
      assert.fieldEquals(
        "DependencyAdditionalCDN",
        generateDependencyAdditionalCDNId(
          dependencyNameAndVersion,
          additionalCDNIndex
        ),
        "dependency",
        dependencyNameAndVersion
      );

      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "additionalCDNCount",
        additionalCDNIndex.plus(BigInt.fromI32(1)).toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
    test("should update existing additional CDN for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyNameAndVersion = dependency.id;
      const additionalCDN = "existingAdditionalCDN.com";
      const additionalCDNIndex = BigInt.fromI32(0);
      const additionalCDNId = generateDependencyAdditionalCDNId(
        dependencyNameAndVersion,
        additionalCDNIndex
      );

      const existingDependency = new DependencyAdditionalCDN(additionalCDNId);
      existingDependency.cdn = additionalCDN;
      existingDependency.dependency = dependencyNameAndVersion;
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
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "additionalCDN",
          ethereum.Value.fromString(updatedAdditionalCDN)
        ),
        new ethereum.EventParam(
          "additionalCDNIndex",
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
        dependencyNameAndVersion
      );

      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "additionalCDNCount",
        additionalCDNIndex.plus(BigInt.fromI32(1)).toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
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

      const nonExistantDependencyNameAndVersion = "does@notexist";
      const additionalRepository = "newadditionalRepository.com";
      const additionalRepositoryIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalRepositoryUpdated = changetype<
        DependencyAdditionalRepositoryUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(nonExistantDependencyNameAndVersion)
          )
        ),
        new ethereum.EventParam(
          "additionalRepository",
          ethereum.Value.fromString(additionalRepository)
        ),
        new ethereum.EventParam(
          "additionalRepositoryIndex",
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
          nonExistantDependencyNameAndVersion,
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

      const dependencyNameAndVersion = dependency.id;
      const additionalRepository = "newadditionalRepository.com";
      const additionalRepositoryIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalRepositoryUpdated = changetype<
        DependencyAdditionalRepositoryUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "additionalRepository",
          ethereum.Value.fromString(additionalRepository)
        ),
        new ethereum.EventParam(
          "additionalRepositoryIndex",
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
          dependencyNameAndVersion,
          additionalRepositoryIndex
        ),
        "repository",
        additionalRepository
      );
      assert.fieldEquals(
        "DependencyAdditionalRepository",
        generateDependencyAdditionalRepositoryId(
          dependencyNameAndVersion,
          additionalRepositoryIndex
        ),
        "dependency",
        dependencyNameAndVersion
      );

      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "additionalRepositoryCount",
        additionalRepositoryIndex.plus(BigInt.fromI32(1)).toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
    test("should update existing additional repository for existing dependency", () => {
      const dependency = Dependency.load(EXISTING_DEPENDENCY_TYPE);

      if (!dependency) {
        throw Error("Dependency should exist");
      }

      const dependencyNameAndVersion = dependency.id;
      const additionalRepository = "existingadditionalRepository.com";
      const additionalRepositoryIndex = BigInt.fromI32(0);
      const additionalRepositoryId = generateDependencyAdditionalRepositoryId(
        dependencyNameAndVersion,
        additionalRepositoryIndex
      );

      const existingDependency = new DependencyAdditionalRepository(
        additionalRepositoryId
      );
      existingDependency.repository = additionalRepository;
      existingDependency.dependency = dependencyNameAndVersion;
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
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "additionalRepository",
          ethereum.Value.fromString(updatedadditionalRepository)
        ),
        new ethereum.EventParam(
          "additionalRepositoryIndex",
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
        dependencyNameAndVersion
      );

      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "additionalRepositoryCount",
        additionalRepositoryIndex.plus(BigInt.fromI32(1)).toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
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
      const nonExistantDependencyNameAndVersion =
        "nonExistantDependencyNameAndVersion";
      const additionalCDNIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalCDNRemoved = changetype<
        DependencyAdditionalCDNRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(nonExistantDependencyNameAndVersion)
          )
        ),
        new ethereum.EventParam(
          "additionalCDNIndex",
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
      const dependencyNameAndVersion = EXISTING_DEPENDENCY_TYPE;
      const additionalCDNIndex = BigInt.fromI32(1);
      const existingDependency = Dependency.load(dependencyNameAndVersion);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const event: DependencyAdditionalCDNRemoved = changetype<
        DependencyAdditionalCDNRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "additionalCDNIndex",
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
        dependencyNameAndVersion,
        "additionalCDNCount",
        existingDependency.additionalCDNCount.toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    test("should remove existing additional cdn for existing dependency", () => {
      const dependencyNameAndVersion = EXISTING_DEPENDENCY_TYPE;
      const additionalCDNIndex = BigInt.fromI32(0);
      const existingDependency = Dependency.load(dependencyNameAndVersion);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const event: DependencyAdditionalCDNRemoved = changetype<
        DependencyAdditionalCDNRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "additionalCDNIndex",
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
        dependencyNameAndVersion,
        "additionalCDNCount",
        existingDependency.additionalCDNCount
          .minus(BigInt.fromI32(1))
          .toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
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
      const nonExistantDependencyNameAndVersion =
        "nonExistantDependencyNameAndVersion";
      const additionalRepositoryIndex = BigInt.fromI32(0);

      const event: DependencyAdditionalRepositoryRemoved = changetype<
        DependencyAdditionalRepositoryRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(nonExistantDependencyNameAndVersion)
          )
        ),
        new ethereum.EventParam(
          "additionalRepositoryIndex",
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
      const dependencyNameAndVersion = EXISTING_DEPENDENCY_TYPE;
      const additionalRepositoryIndex = BigInt.fromI32(1);
      const existingDependency = Dependency.load(dependencyNameAndVersion);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const event: DependencyAdditionalRepositoryRemoved = changetype<
        DependencyAdditionalRepositoryRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "additionalRepositoryIndex",
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
        dependencyNameAndVersion,
        "additionalRepositoryCount",
        existingDependency.additionalRepositoryCount.toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "updatedAt",
        CURRENT_BLOCK_TIMESTAMP.toString()
      );
    });

    test("should remove existing additional cdn for existing dependency", () => {
      const dependencyNameAndVersion = EXISTING_DEPENDENCY_TYPE;
      const additionalRepositoryIndex = BigInt.fromI32(0);
      const existingDependency = Dependency.load(dependencyNameAndVersion);

      if (!existingDependency) {
        throw Error("Dependency should exist");
      }

      const event: DependencyAdditionalRepositoryRemoved = changetype<
        DependencyAdditionalRepositoryRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(dependencyNameAndVersion))
        ),
        new ethereum.EventParam(
          "additionalRepositoryIndex",
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
        dependencyNameAndVersion,
        "additionalRepositoryCount",
        existingDependency.additionalRepositoryCount
          .minus(BigInt.fromI32(1))
          .toString()
      );
      assert.fieldEquals(
        "Dependency",
        dependencyNameAndVersion,
        "updatedAt",
        updatedAtBlockTimestamp.toString()
      );
    });
  });
  describe("handleDependencyScriptUpdated", () => {
    test("should not update script for non existant dependency", () => {
      const nonExistantDependencyNameAndVersion =
        "nonExistantDependencyNameAndVersion";

      const event: DependencyScriptUpdated = changetype<
        DependencyScriptUpdated
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(
            Bytes.fromUTF8(nonExistantDependencyNameAndVersion)
          )
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
        "getDependencyScript",
        "getDependencyScript(bytes32,uint256):(string)"
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
        "getDependencyScriptBytecodeAddress",
        "getDependencyScriptBytecodeAddress(bytes32,uint256):(address)"
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
          "dependencyNameAndVersion",
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
        "getDependencyScript",
        "getDependencyScript(bytes32,uint256):(string)"
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
        "getDependencyScriptBytecodeAddress",
        "getDependencyScriptBytecodeAddress(bytes32,uint256):(address)"
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
          "dependencyNameAndVersion",
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
          "dependencyNameAndVersion",
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
          "coreContract",
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
          "coreContract",
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
          "coreContract",
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
          "coreContract",
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
  describe("handleProjectDependencyOverrideAdded", () => {
    test("should do nothing if project does not exist", () => {
      const event: ProjectDependencyOverrideAdded = changetype<
        ProjectDependencyOverrideAdded
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "coreContractAddress",
          ethereum.Value.fromAddress(
            randomAddressGenerator.generateRandomAddress()
          )
        ),
        new ethereum.EventParam(
          "projectId",
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
        ),
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
        )
      ];
      handleProjectDependencyOverrideAdded(event);

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

      const event: ProjectDependencyOverrideAdded = changetype<
        ProjectDependencyOverrideAdded
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "coreContractAddress",
          ethereum.Value.fromAddress(Address.fromString(contract.id))
        ),
        new ethereum.EventParam(
          "projectId",
          ethereum.Value.fromUnsignedBigInt(project.projectId)
        ),
        new ethereum.EventParam(
          "dependencyNameAndVersion",
          ethereum.Value.fromBytes(Bytes.fromUTF8(EXISTING_DEPENDENCY_TYPE))
        )
      ];
      const updatedAtBlockTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(
        BigInt.fromI32(1)
      );
      event.block.timestamp = updatedAtBlockTimestamp;

      assert.assertNull(project.scriptTypeAndVersion);

      handleProjectDependencyOverrideAdded(event);

      assert.fieldEquals(
        "Project",
        project.id,
        "scriptTypeAndVersionOverride",
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
  describe("handleProjectDependencyOverrideRemoved", () => {
    test("should do nothing if project does not exist", () => {
      const event: ProjectDependencyOverrideRemoved = changetype<
        ProjectDependencyOverrideRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "coreContractAddress",
          ethereum.Value.fromAddress(
            randomAddressGenerator.generateRandomAddress()
          )
        ),
        new ethereum.EventParam(
          "projectId",
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
        )
      ];
      handleProjectDependencyOverrideRemoved(event);

      assert.entityCount("Project", 0);
    });
    test("should remove project dependency type override", () => {
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
      project.scriptTypeAndVersion = coreContractScriptTypeAndVersion;
      project.scriptTypeAndVersionOverride = EXISTING_DEPENDENCY_TYPE;
      project.save();

      const event: ProjectDependencyOverrideRemoved = changetype<
        ProjectDependencyOverrideRemoved
      >(newMockEvent());
      event.parameters = [
        new ethereum.EventParam(
          "coreContractAddress",
          ethereum.Value.fromAddress(coreContractAddress)
        ),
        new ethereum.EventParam(
          "projectId",
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
        "scriptTypeAndVersionOverride",
        EXISTING_DEPENDENCY_TYPE
      );

      handleProjectDependencyOverrideRemoved(event);

      assert.fieldEquals(
        "Project",
        project.id,
        "scriptTypeAndVersion",
        coreContractScriptTypeAndVersion
      );

      const postEventProject = Project.load(project.id);
      assert.assertNull(postEventProject!.scriptTypeAndVersionOverride);

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
          "previousOwner",
          ethereum.Value.fromAddress(prevOwner)
        ),
        new ethereum.EventParam(
          "newOwner",
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
          "previousOwner",
          ethereum.Value.fromAddress(prevOwner)
        ),
        new ethereum.EventParam(
          "newOwner",
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
