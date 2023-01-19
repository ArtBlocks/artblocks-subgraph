import { BigInt, store } from "@graphprotocol/graph-ts";
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
} from "../generated/DependencyRegistryV0/IDependencyRegistryV0";
import { OwnershipTransferred } from "../generated/DependencyRegistryV0/OwnableUpgradeable";
import { IDependencyRegistryCompatibleV0 } from "../generated/DependencyRegistryV0/IDependencyRegistryCompatibleV0";
import {
  Contract,
  Dependency,
  DependencyAdditionalCDN,
  DependencyAdditionalRepository,
  DependencyRegistry,
  DependencyScript,
  Project
} from "../generated/schema";
import {
  generateContractSpecificId,
  generateDependencyAdditionalCDNId,
  generateDependencyAdditionalRepositoryId,
  generateDependencyScriptId
} from "./helpers";
import { DependencyRegistryV0 } from "../generated/DependencyRegistryV0/DependencyRegistryV0";

export function handleDependencyAdded(event: DependencyAdded): void {
  const dependency = new Dependency(event.params._dependencyType.toString());
  dependency.preferredCDN = event.params._preferredCDN;
  dependency.additionalCDNCount = BigInt.fromI32(0);
  dependency.preferredRepository = event.params._preferredRepository;
  dependency.additionalRepositoryCount = BigInt.fromI32(0);
  dependency.referenceWebsite = event.params._referenceWebsite;
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
  const dependency = Dependency.load(event.params._dependencyType.toString());
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
  const dependency = Dependency.load(event.params._dependencyType.toString());
  if (dependency) {
    dependency.preferredCDN = event.params._preferredCDN;
    dependency.updatedAt = event.block.timestamp;
    dependency.save();
  }
}

export function handleDependencyPreferredRepositoryUpdated(
  event: DependencyPreferredRepositoryUpdated
): void {
  const dependency = Dependency.load(event.params._dependencyType.toString());
  if (dependency) {
    dependency.preferredRepository = event.params._preferredRepository;
    dependency.updatedAt = event.block.timestamp;
    dependency.save();
  }
}

export function handleDependencyReferenceWebsiteUpdated(
  event: DependencyReferenceWebsiteUpdated
): void {
  const dependency = Dependency.load(event.params._dependencyType.toString());
  if (dependency) {
    dependency.referenceWebsite = event.params._referenceWebsite;
    dependency.updatedAt = event.block.timestamp;
    dependency.save();
  }
}

export function handleDependencyAdditionalCDNUpdated(
  event: DependencyAdditionalCDNUpdated
): void {
  const dependency = Dependency.load(event.params._dependencyType.toString());
  if (!dependency) {
    return;
  }
  const id = generateDependencyAdditionalCDNId(
    dependency.id,
    event.params._additionalCDNIndex
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
  additionalCDN.cdn = event.params._additionalCDN;
  additionalCDN.index = event.params._additionalCDNIndex;
  additionalCDN.save();
}

export function handleDependencyAdditionalCDNRemoved(
  event: DependencyAdditionalCDNRemoved
): void {
  const dependency = Dependency.load(event.params._dependencyType.toString());
  if (!dependency) {
    return;
  }
  const id = generateDependencyAdditionalCDNId(
    dependency.id,
    event.params._additionalCDNIndex
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
  const dependency = Dependency.load(event.params._dependencyType.toString());
  if (!dependency) {
    return;
  }
  const id = generateDependencyAdditionalRepositoryId(
    dependency.id,
    event.params._additionalRepositoryIndex
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
  additionalRepository.repository = event.params._additionalRepository;
  additionalRepository.index = event.params._additionalRepositoryIndex;
  additionalRepository.save();
}

export function handleDependencyAdditionalRepositoryRemoved(
  event: DependencyAdditionalRepositoryRemoved
): void {
  const dependency = Dependency.load(event.params._dependencyType.toString());
  if (!dependency) {
    return;
  }
  const id = generateDependencyAdditionalRepositoryId(
    dependency.id,
    event.params._additionalRepositoryIndex
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
  const dependencyType = event.params._dependencyType.toString();
  const dependency = Dependency.load(dependencyType);
  if (!dependency) {
    return;
  }

  const dependencyRegistryContract = DependencyRegistryV0.bind(event.address);
  let prevScriptCount = dependency.scriptCount.toI32();
  const scriptCount = dependencyRegistryContract
    .getDependencyScriptCount(event.params._dependencyType)
    .toI32();

  // Remove ProjectScripts that no longer exist on chain
  if (prevScriptCount > scriptCount) {
    for (let i = scriptCount; i < prevScriptCount; i++) {
      const dependencyScript = DependencyScript.load(
        generateDependencyScriptId(
          event.params._dependencyType.toString(),
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
    let script = dependencyRegistryContract.getDependencyScriptAtIndex(
      event.params._dependencyType,
      BigInt.fromI32(i)
    );
    let scriptAddress = dependencyRegistryContract.getDependencyScriptBytecodeAddressAtIndex(
      event.params._dependencyType,
      BigInt.fromI32(i)
    );

    let dependencyScriptIndex = BigInt.fromI32(i);
    let dependencyScript = new DependencyScript(
      generateDependencyScriptId(dependencyType, dependencyScriptIndex)
    );
    dependencyScript.index = dependencyScriptIndex;
    dependencyScript.dependency = dependencyType;
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

export function handleSupportedCoreContractAdded(
  event: SupportedCoreContractAdded
): void {
  const coreContract = Contract.load(
    event.params._coreContractAddress.toHexString()
  );

  if (!coreContract) {
    return;
  }

  coreContract.dependencyRegistry = event.address;
  coreContract.updatedAt = event.block.timestamp;
  coreContract.save();
}

export function handleSupportedCoreContractRemoved(
  event: SupportedCoreContractRemoved
): void {
  const coreContract = Contract.load(
    event.params._coreContractAddress.toHexString()
  );

  if (!coreContract) {
    return;
  }

  coreContract.dependencyRegistry = null;
  coreContract.updatedAt = event.block.timestamp;
  coreContract.save();
}

export function handleProjectDependencyTypeOverrideAdded(
  event: ProjectDependencyTypeOverrideAdded
): void {
  const projectId = generateContractSpecificId(
    event.params._coreContractAddress,
    event.params._projectId
  );

  const project = Project.load(projectId);
  if (!project) {
    return;
  }

  project.scriptTypeAndVersion = event.params._dependencyType.toString();
  project.updatedAt = event.block.timestamp;
  project.save();
}

export function handleProjectDependencyTypeOverrideRemoved(
  event: ProjectDependencyTypeOverrideRemoved
): void {
  const projectId = generateContractSpecificId(
    event.params._coreContractAddress,
    event.params._projectId
  );
  const project = Project.load(projectId);
  if (!project) {
    return;
  }

  const coreContract = IDependencyRegistryCompatibleV0.bind(
    event.params._coreContractAddress
  );

  const scriptDetailsResult = coreContract.try_projectScriptDetails(
    event.params._projectId
  );
  if (scriptDetailsResult.reverted) {
    project.scriptTypeAndVersion = null;
  } else {
    project.scriptTypeAndVersion = scriptDetailsResult.value.getScriptTypeAndVersion();
  }

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
