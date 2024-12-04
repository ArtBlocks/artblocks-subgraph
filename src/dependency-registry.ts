import { BigInt, store, log, Address, ethereum } from "@graphprotocol/graph-ts";
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
  CoreRegistryAddressUpdated,
  SupportedCoreContractOverrideAdded,
  SupportedCoreContractOverrideRemoved,
  IDependencyRegistryV0
} from "../generated/IDependencyRegistryV0/IDependencyRegistryV0";
import { IDependencyRegistryV0_Legacy } from "../generated/IDependencyRegistryV0/IDependencyRegistryV0_Legacy";
import { OwnershipTransferred } from "../generated/OwnableUpgradeable/OwnableUpgradeable";
import {
  Contract,
  Dependency,
  License,
  DependencyAdditionalCDN,
  DependencyAdditionalRepository,
  DependencyRegistry,
  DependencyScript,
  Project,
  CoreRegistry
} from "../generated/schema";
import {
  generateContractSpecificId,
  generateDependencyAdditionalCDNId,
  generateDependencyAdditionalRepositoryId,
  generateDependencyScriptId
} from "./helpers";

/*
 * This code operates under the assumption that only a single dependency registry is being indexed. This assumption has several significant effects:

 * 1. The 'dependencyNameAndVersion' is used as the unique identifier for the Dependency entity.
 * 2. Before updating a Dependency entity, we do not verify if the dependency's associated dependency registry matches the event address.
 * 3. In the 'handleSupportedCoreContractOverrideAdded' and 'handleSupportedCoreContractOverrideRemoved' handlers, we do not check a contract's dependency registry address before updating its dependency registry field.
 * 4. In the 'handleProjectDependencyOverrideAdded' and 'handleProjectDependencyOverrideRemoved' functions, we do not verify a project's contract's dependency registry address before updating its 'scriptTypeAndVersionOverride' field.

 * Given that we control the indexing process with this subgraph, this assumption is considered safe.
 */

export function handleLicenseTypeAdded(event: LicenseTypeAdded): void {
  let licenseId = event.params.licenseType.toString();
  const license = new License(licenseId);

  license.updatedAt = event.block.timestamp;
  license.save();
}

export function handleLicenseTextUpdated(event: LicenseTextUpdated): void {
  let licenseId = event.params.licenseType.toString();
  const license = License.load(licenseId);
  if (license) {
    license.updatedAt = event.block.timestamp;
    license.save();
  }
}

export function handleDependencyAdded(event: DependencyAdded): void {
  const dependency = new Dependency(
    event.params.dependencyNameAndVersion.toString()
  );
  dependency.licenseType = event.params.licenseType.toString();
  dependency.preferredCDN = event.params.preferredCDN;
  dependency.additionalCDNCount = BigInt.fromI32(0);
  dependency.preferredRepository = event.params.preferredRepository;
  dependency.additionalRepositoryCount = BigInt.fromI32(0);
  dependency.website = event.params.website;
  dependency.scriptCount = BigInt.fromI32(0);
  dependency.dependencyRegistry = event.address;
  dependency.updatedAt = event.block.timestamp;
  dependency.save();

  const dependencyRegistry = DependencyRegistry.load(event.address);
  if (dependencyRegistry) {
    dependencyRegistry.updatedAt = event.block.timestamp;
    dependencyRegistry.save();
  }
}

export function handleDependencyRemoved(event: DependencyRemoved): void {
  const dependency = Dependency.load(
    event.params.dependencyNameAndVersion.toString()
  );
  if (dependency) {
    store.remove("Dependency", dependency.id);
  }

  const dependencyRegistry = DependencyRegistry.load(event.address);
  if (dependencyRegistry) {
    dependencyRegistry.updatedAt = event.block.timestamp;
    dependencyRegistry.save();
  }
}

export function handleDependencyPreferredCDNUpdated(
  event: DependencyPreferredCDNUpdated
): void {
  const dependency = Dependency.load(
    event.params.dependencyNameAndVersion.toString()
  );
  if (dependency) {
    dependency.preferredCDN = event.params.preferredCDN;
    dependency.updatedAt = event.block.timestamp;
    dependency.save();
  }
}

export function handleDependencyPreferredRepositoryUpdated(
  event: DependencyPreferredRepositoryUpdated
): void {
  const dependency = Dependency.load(
    event.params.dependencyNameAndVersion.toString()
  );
  if (dependency) {
    dependency.preferredRepository = event.params.preferredRepository;
    dependency.updatedAt = event.block.timestamp;
    dependency.save();
  }
}

export function handleDependencyWebsiteUpdated(
  event: DependencyWebsiteUpdated
): void {
  const dependency = Dependency.load(
    event.params.dependencyNameAndVersion.toString()
  );
  if (dependency) {
    dependency.website = event.params.website;
    dependency.updatedAt = event.block.timestamp;
    dependency.save();
  }
}

export function handleDependencyAdditionalCDNUpdated(
  event: DependencyAdditionalCDNUpdated
): void {
  const dependency = Dependency.load(
    event.params.dependencyNameAndVersion.toString()
  );
  if (!dependency) {
    return;
  }
  const id = generateDependencyAdditionalCDNId(
    dependency.id,
    event.params.additionalCDNIndex
  );

  let additionalCDN = DependencyAdditionalCDN.load(id);

  if (!additionalCDN) {
    additionalCDN = new DependencyAdditionalCDN(id);
    dependency.additionalCDNCount = dependency.additionalCDNCount.plus(
      BigInt.fromI32(1)
    );
  }

  dependency.updatedAt = event.block.timestamp;
  dependency.save();

  additionalCDN.dependency = dependency.id;
  additionalCDN.cdn = event.params.additionalCDN;
  additionalCDN.index = event.params.additionalCDNIndex;
  additionalCDN.save();
}

export function handleDependencyAdditionalCDNRemoved(
  event: DependencyAdditionalCDNRemoved
): void {
  const dependency = Dependency.load(
    event.params.dependencyNameAndVersion.toString()
  );
  if (!dependency) {
    return;
  }
  const id = generateDependencyAdditionalCDNId(
    dependency.id,
    event.params.additionalCDNIndex
  );

  const additionalCDN = DependencyAdditionalCDN.load(id);
  if (!additionalCDN) {
    return;
  }

  const lastAdditionalCDNIndex = dependency.additionalCDNCount.minus(
    BigInt.fromI32(1)
  );
  const lastAdditionalCDN = DependencyAdditionalCDN.load(
    generateDependencyAdditionalCDNId(dependency.id, lastAdditionalCDNIndex)
  );
  if (!lastAdditionalCDN) {
    return;
  }

  additionalCDN.cdn = lastAdditionalCDN.cdn;
  additionalCDN.save();

  dependency.additionalCDNCount = dependency.additionalCDNCount = lastAdditionalCDNIndex;
  dependency.updatedAt = event.block.timestamp;
  dependency.save();

  store.remove("DependencyAdditionalCDN", lastAdditionalCDN.id);
}

export function handleDependencyAdditionalRepositoryUpdated(
  event: DependencyAdditionalRepositoryUpdated
): void {
  const dependency = Dependency.load(
    event.params.dependencyNameAndVersion.toString()
  );
  if (!dependency) {
    return;
  }
  const id = generateDependencyAdditionalRepositoryId(
    dependency.id,
    event.params.additionalRepositoryIndex
  );

  let additionalRepository = DependencyAdditionalRepository.load(id);

  if (!additionalRepository) {
    additionalRepository = new DependencyAdditionalRepository(id);
    dependency.additionalRepositoryCount = dependency.additionalRepositoryCount.plus(
      BigInt.fromI32(1)
    );
  }

  dependency.updatedAt = event.block.timestamp;
  dependency.save();

  additionalRepository.dependency = dependency.id;
  additionalRepository.repository = event.params.additionalRepository;
  additionalRepository.index = event.params.additionalRepositoryIndex;
  additionalRepository.save();
}

export function handleDependencyAdditionalRepositoryRemoved(
  event: DependencyAdditionalRepositoryRemoved
): void {
  const dependency = Dependency.load(
    event.params.dependencyNameAndVersion.toString()
  );
  if (!dependency) {
    return;
  }
  const id = generateDependencyAdditionalRepositoryId(
    dependency.id,
    event.params.additionalRepositoryIndex
  );

  const additionalRepository = DependencyAdditionalRepository.load(id);
  if (!additionalRepository) {
    return;
  }

  const lastAdditionalRepositoryIndex = dependency.additionalRepositoryCount.minus(
    BigInt.fromI32(1)
  );
  const lastAdditionalRepository = DependencyAdditionalRepository.load(
    generateDependencyAdditionalRepositoryId(
      dependency.id,
      lastAdditionalRepositoryIndex
    )
  );
  if (!lastAdditionalRepository) {
    return;
  }

  additionalRepository.repository = lastAdditionalRepository.repository;
  additionalRepository.save();

  dependency.additionalRepositoryCount = lastAdditionalRepositoryIndex;
  dependency.updatedAt = event.block.timestamp;
  dependency.save();

  store.remove("DependencyAdditionalRepository", lastAdditionalRepository.id);
}

export function handleDependencyScriptUpdated(
  event: DependencyScriptUpdated
): void {
  const dependencyNameAndVersion = event.params.dependencyNameAndVersion.toString();
  const dependency = Dependency.load(dependencyNameAndVersion);
  if (!dependency) {
    return;
  }

  const dependencyRegistryContract = IDependencyRegistryV0.bind(event.address);
  let prevScriptCount = dependency.scriptCount.toI32();
  const scriptCount = dependencyRegistryContract
    .getDependencyScriptCount(event.params.dependencyNameAndVersion)
    .toI32();

  // Remove ProjectScripts that no longer exist on chain
  if (prevScriptCount > scriptCount) {
    for (let i = scriptCount; i < prevScriptCount; i++) {
      const dependencyScript = DependencyScript.load(
        generateDependencyScriptId(
          event.params.dependencyNameAndVersion.toString(),
          BigInt.fromI32(i)
        )
      );
      if (dependencyScript) {
        store.remove("DependencyScript", dependencyScript.id);
      }
    }
  }

  let scripts: string[] = [];
  for (let i = 0; i < scriptCount; i++) {
    // default to empty string, raise warnings if fail to get script
    let script: string = "";
    let result = dependencyRegistryContract.try_getDependencyScript(
      event.params.dependencyNameAndVersion,
      BigInt.fromI32(i)
    );
    if (!result.reverted) {
      script = result.value;
    } else {
      // view function used to have different name, try legacy name
      let legacyResult = IDependencyRegistryV0_Legacy.bind(
        event.address
      ).try_getDependencyScriptAtIndex(
        event.params.dependencyNameAndVersion,
        BigInt.fromI32(i)
      );
      if (!legacyResult.reverted) {
        script = legacyResult.value;
      } else {
        // log error because this is unexpected
        log.error(
          "[ERROR] Failed to load script for dependency type {}, on registry at address {}",
          [
            event.params.dependencyNameAndVersion.toString(),
            event.address.toHexString()
          ]
        );
      }
    }

    // default to zero address, raise warnings if fail to get address
    let scriptAddress: Address = Address.zero();
    let addressResult = dependencyRegistryContract.try_getDependencyScriptBytecodeAddress(
      event.params.dependencyNameAndVersion,
      BigInt.fromI32(i)
    );
    if (!addressResult.reverted) {
      scriptAddress = addressResult.value;
    } else {
      // view function used to have different name, try legacy name
      let legacyAddressResult = IDependencyRegistryV0_Legacy.bind(
        event.address
      ).try_getDependencyScriptBytecodeAddressAtIndex(
        event.params.dependencyNameAndVersion,
        BigInt.fromI32(i)
      );
      if (!legacyAddressResult.reverted) {
        scriptAddress = legacyAddressResult.value;
      } else {
        // log error because this is unexpected
        log.error(
          "[ERROR] Failed to load script bytecode address for dependency type {}, on registry at address {}",
          [
            event.params.dependencyNameAndVersion.toString(),
            event.address.toHexString()
          ]
        );
      }
    }

    let dependencyScriptIndex = BigInt.fromI32(i);
    let dependencyScript = new DependencyScript(
      generateDependencyScriptId(
        dependencyNameAndVersion,
        dependencyScriptIndex
      )
    );
    dependencyScript.index = dependencyScriptIndex;
    dependencyScript.dependency = dependencyNameAndVersion;
    dependencyScript.script = script;
    dependencyScript.address = scriptAddress;
    dependencyScript.save();

    if (script) {
      scripts.push(script);
    }
  }

  let script = scripts.join("");

  dependency.script = script;
  dependency.scriptCount = BigInt.fromI32(scriptCount);
  dependency.updatedAt = event.block.timestamp;

  dependency.save();
}

export function handleCoreRegistryAddressUpdated(
  event: CoreRegistryAddressUpdated
): void {
  // guard against missing dependency registry (error)
  let dependencyRegistry = DependencyRegistry.load(event.address);
  if (!dependencyRegistry) {
    // not expected to happen, but log error if it does
    log.error("[ERROR] Failed to load dependency registry at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  // guard against missing core registry (warn)
  let coreRegistry = CoreRegistry.load(
    event.params.coreRegistryAddress.toHexString()
  );
  if (!coreRegistry) {
    // not expected to happen, but log warning if it does
    log.warning("[WARN] Failed to load core registry at address {}", [
      event.params.coreRegistryAddress.toHexString()
    ]);
    // returning early, as we cannot update the dependency registry to point to CoreRegistry that does not exist
    return;
  }

  // update core registry address on dependency registry
  dependencyRegistry.coreRegistry = event.params.coreRegistryAddress.toHexString();
  dependencyRegistry.updatedAt = event.block.timestamp;
  dependencyRegistry.save();

  // update dependency registry address on core registry
  coreRegistry.dependencyRegistry = event.address;
  coreRegistry.save();
}

export function handleSupportedCoreContractOverrideAdded(
  event: SupportedCoreContractOverrideAdded
): void {
  const coreContract = Contract.load(
    event.params.coreContractAddress.toHexString()
  );

  if (!coreContract) {
    return;
  }

  coreContract.latestDependencyRegistryOverrideAllowlistedOn = event.address;
  coreContract.updatedAt = event.block.timestamp;
  coreContract.save();
}

export function handleSupportedCoreContractOverrideRemoved(
  event: SupportedCoreContractOverrideRemoved
): void {
  const coreContract = Contract.load(
    event.params.coreContractAddress.toHexString()
  );

  if (!coreContract) {
    return;
  }

  // null out the dependency registry override if it matches the event address
  if (
    coreContract.latestDependencyRegistryOverrideAllowlistedOn &&
    coreContract.latestDependencyRegistryOverrideAllowlistedOn!.equals(
      event.address
    )
  ) {
    coreContract.latestDependencyRegistryOverrideAllowlistedOn = null;
    coreContract.updatedAt = event.block.timestamp;
    coreContract.save();
  }
}

export function handleProjectDependencyOverrideAdded(
  event: ProjectDependencyOverrideAdded
): void {
  const projectId = generateContractSpecificId(
    event.params.coreContractAddress,
    event.params.projectId
  );

  const project = Project.load(projectId);
  if (!project) {
    return;
  }

  project.scriptTypeAndVersionOverride = event.params.dependencyNameAndVersion.toString();
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleProjectDependencyOverrideRemoved(
  event: ProjectDependencyOverrideRemoved
): void {
  const projectId = generateContractSpecificId(
    event.params.coreContractAddress,
    event.params.projectId
  );
  const project = Project.load(projectId);
  if (!project) {
    return;
  }

  project.scriptTypeAndVersionOverride = null;
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let dependencyRegistry = DependencyRegistry.load(event.address);
  if (!dependencyRegistry) {
    dependencyRegistry = new DependencyRegistry(event.address);
  }

  dependencyRegistry.owner = event.params.newOwner;
  dependencyRegistry.updatedAt = event.block.timestamp;
  dependencyRegistry.save();
}
