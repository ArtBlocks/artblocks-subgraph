import { BigInt, log, Address } from "@graphprotocol/graph-ts";
import { logStore } from "matchstick-as";

import {
  MinterFilterV0,
  IsCanonicalMinterFilter
} from "../generated/MinterFilterV0/MinterFilterV0";

import { MinterFilterV1 } from "../generated/MinterFilterV1/MinterFilterV1";

import {
  IMinterFilterV0,
  Deployed,
  MinterApproved,
  MinterRevoked,
  ProjectMinterRegistered,
  ProjectMinterRemoved
} from "../generated/MinterFilterV0/IMinterFilterV0";

import {
  Project,
  Contract,
  MinterFilter,
  Minter,
  ProjectMinterConfiguration,
  CoreRegistry
} from "../generated/schema";

import {
  generateContractSpecificId,
  loadOrCreateAndSetProjectMinterConfiguration,
  loadOrCreateMinter,
  getCoreContractAddressFromLegacyMinterFilter
} from "./helpers";

// @dev - This event is ONLY emitted from a MinterFilterV0 contract, so we can
// safely bind directly to a MinterFilterV0 contract in this handler.
// @dev we can also safely assume that the MinterFilterV0 contract is
// being used by a V1 core contract, so we can safely assume that the
// engine registry is a dummy registry.
export function handleIsCanonicalMinterFilter(
  event: IsCanonicalMinterFilter
): void {
  let coreContract = Contract.load(
    event.params._coreContractAddress.toHexString()
  );

  if (!coreContract) {
    return;
  }

  // Note: there's a guard on the function that emits this event
  // so we can assume that this MinterFilter is whitelisted on the
  // associated core contract
  let minterFilter = MinterFilter.load(event.address.toHexString());
  if (!minterFilter) {
    minterFilter = new MinterFilter(event.address.toHexString());
    // dummy core registry has ID set to the associated core contract address
    // @dev this is a trick to avoid having to create a nullable field to store
    // the associated core contract address on the dummy core registry or
    // minter filter.
    const coreRegistry = getOrCreateDummyCoreRegistryForLegacyMinterFilter(
      event.params._coreContractAddress.toHexString(),
      event.block.timestamp
    );
    minterFilter.coreRegistry = coreRegistry.id;
    minterFilter.minterGlobalAllowlist = [];
    minterFilter.type = "MinterFilterV0";
    minterFilter.updatedAt = event.block.timestamp;
    minterFilter.save();
  }

  // Reset the minter config for all projects on core contract
  // when a new minter filter is set
  let nextProjectId = coreContract.nextProjectId.toI32();
  for (let i = 0; i < nextProjectId; i++) {
    let fullProjectId = coreContract.id + "-" + i.toString();
    let project = Project.load(fullProjectId);

    if (project) {
      project.minterConfiguration = null;
      project.updatedAt = event.block.timestamp;
      project.save();
    }
  }

  // Check the new minter filter for any pre-allowlisted minters and update Projects accordingly
  let minterFilterContract = MinterFilterV0.bind(event.address);
  let numProjectsWithMinters = minterFilterContract.getNumProjectsWithMinters();
  for (
    let i = BigInt.fromI32(0);
    i.lt(numProjectsWithMinters);
    i = i.plus(BigInt.fromI32(1))
  ) {
    let projectAndMinterInfo = minterFilterContract.getProjectAndMinterInfoAt(
      i
    );
    let projectId = projectAndMinterInfo.value0;
    let minterAddress = projectAndMinterInfo.value1;

    let project = Project.load(
      generateContractSpecificId(event.params._coreContractAddress, projectId)
    );

    if (project) {
      const minter = loadOrCreateMinter(minterAddress, event.block.timestamp);
      loadOrCreateAndSetProjectMinterConfiguration(
        project,
        minter,
        event.block.timestamp
      );
    }
  }

  coreContract.minterFilter = event.address.toHexString();
  // update core contract as registered on the legacy MinterFilter's dummy core registry
  coreContract.registeredOn = event.params._coreContractAddress.toHexString();
  coreContract.updatedAt = event.block.timestamp;
  coreContract.save();
}

export function handleDeployed(event: Deployed): void {
  // we simply create a new MinterFilter entity to ensure that it is in the
  // store. This enables us to determine if a MinterFilter is in our subgraph
  // configuration by checking if it is in the store.
  loadOrCreateMinterFilter(event.address, event.block.timestamp);
}

export function handleMinterApproved(event: MinterApproved): void {
  let minterFilter = loadOrCreateMinterFilter(
    event.address,
    event.block.timestamp
  );

  let minter = loadOrCreateMinter(
    event.params._minterAddress,
    event.block.timestamp
  );

  // Don't add the allowlisting if minter's minter filter is different
  // from the minter filter that emitted this event.
  if (minter.minterFilter != minterFilter.id) {
    return;
  }

  // add minter to the list of allowlisted minters if it's not already there
  if (!minterFilter.minterGlobalAllowlist.includes(minter.id)) {
    minterFilter.minterGlobalAllowlist = minterFilter.minterGlobalAllowlist.concat(
      [minter.id]
    );
    minterFilter.updatedAt = event.block.timestamp;
    minterFilter.save();
  }

  // update minter's allowlisted state
  minter.isGloballyAllowlistedOnMinterFilter = true;
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleMinterRevoked(event: MinterRevoked): void {
  // Note: We do not reset any project minter configurations here because
  // we allow pre-configuring minter configurations on projects before the
  // minter filter is set on the core contract. Frontends should check the
  // minter's isGlobalAllowlistedOnMinterFilter field to determine if the
  // minter is allowlisted on the associated minter filter.
  let minterFilter = loadOrCreateMinterFilter(
    event.address,
    event.block.timestamp
  );

  let minter = Minter.load(event.params._minterAddress.toHexString());

  // Only update state if the minter is allowlisted on this minter filter
  if (!minter || !minterFilter || minter.minterFilter != minterFilter.id) {
    return;
  }
  // keep the Minter in the store to avoid having to re-populate if it is
  // re-approved

  // remove the minter from the list of allowlisted minters
  let newMinterGlobalAllowlist: string[] = [];
  for (let i = 0; i < minterFilter.minterGlobalAllowlist.length; i++) {
    if (minterFilter.minterGlobalAllowlist[i] != minter.id) {
      newMinterGlobalAllowlist.push(minterFilter.minterGlobalAllowlist[i]);
    }
  }
  minterFilter.minterGlobalAllowlist = newMinterGlobalAllowlist;
  minterFilter.updatedAt = event.block.timestamp;
  minterFilter.save();

  // update minter's allowlisted state
  minter.isGloballyAllowlistedOnMinterFilter = false;
  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleProjectMinterRegistered(
  event: ProjectMinterRegistered
): void {
  let minterFilter = loadOrCreateMinterFilter(
    event.address,
    event.block.timestamp
  );

  // Since only an approved minter can be registered for a project
  // the minter should already exist. If it doesn't it means that
  // we didn't create it because its minter filter is different from
  // the minter filter it was approved on.
  let minter = Minter.load(event.params._minterAddress.toHexString());
  const coreContractAddress = getCoreContractAddressFromLegacyMinterFilter(
    minterFilter
  );
  if (!coreContractAddress) {
    log.warning(
      "[WARN] Legacy MinterFilter event handler was emitted by MinterFilter with non-null coreContract at address {}.",
      [event.address.toHexString()]
    );
    return;
  }
  // Legacy minter filter handling (pre-V2)
  let coreContract = Contract.load(coreContractAddress.toHexString());

  if (
    !minter ||
    !coreContract ||
    coreContract.minterFilter != event.address.toHexString()
  ) {
    return;
  }

  let project = Project.load(
    generateContractSpecificId(coreContractAddress, event.params._projectId)
  );

  if (project) {
    // Create project configuration
    loadOrCreateAndSetProjectMinterConfiguration(
      project,
      minter,
      event.block.timestamp
    );
  }
}

export function handleProjectMinterRemoved(event: ProjectMinterRemoved): void {
  let minterFilter = loadOrCreateMinterFilter(
    event.address,
    event.block.timestamp
  );
  const coreContractAddress = getCoreContractAddressFromLegacyMinterFilter(
    minterFilter
  );
  if (!coreContractAddress) {
    log.warning(
      "[WARN] Legacy MinterFilter event handler was emitted by MinterFilter with non-null coreContract at address {}.",
      [event.address.toHexString()]
    );
    return;
  }
  let coreContract = Contract.load(coreContractAddress.toHexString());

  if (
    !coreContract ||
    coreContract.minterFilter != event.address.toHexString()
  ) {
    return;
  }

  let project = Project.load(
    generateContractSpecificId(coreContractAddress, event.params._projectId)
  );

  if (project) {
    project.minterConfiguration = null;
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

// Helper function to load or create a minter filter.
// Assumes that the minterGlobalAllowlist is empty when initializing a new minter
// filter.
export function loadOrCreateMinterFilter(
  minterFilterAddress: Address,
  timestamp: BigInt
): MinterFilter {
  let minterFilter = MinterFilter.load(minterFilterAddress.toHexString());
  if (minterFilter) {
    return minterFilter;
  }

  minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  let minterFilterContract = IMinterFilterV0.bind(minterFilterAddress);
  // dummy core registry has ID set to the associated core contract address
  // @dev this is a trick to avoid having to create a nullable field to store
  // the associated core contract address on the dummy core registry or
  // minter filter.
  // @dev safely try/catch this, reverting to dummy core address of zero address
  // if the call fails
  let coreContractAddress = Address.zero(); // default value
  const coreContractAddressResult = minterFilterContract.try_genArt721CoreAddress();
  if (coreContractAddressResult.reverted) {
    log.warning(
      "[WARN] Legacy MinterFilter event handler was emitted by MinterFilter at {} that doesn't support function genArt721CoreAddress().",
      [minterFilterAddress.toHexString()]
    );
  } else {
    coreContractAddress = coreContractAddressResult.value;
  }
  const coreRegistry = getOrCreateDummyCoreRegistryForLegacyMinterFilter(
    coreContractAddress.toHexString(),
    timestamp
  );

  // IMinterFilterV0 contracts may or may not have a minterFilterTypeFunction
  // so we derive this based on the associated core contract address instead.
  // All pre GenArt721V3 contracts should have a V0 minter filter while all
  // GenArt721V3 contracts and above should have a V1 minter filter or higher.
  // If the minter filter version is greater than V1 we can assume the entity
  // creation will be handled by another event handler.
  const coreContract = Contract.load(coreContractAddress.toHexString());
  // We don't expect this actually happens, but we'll log a warning if it does.
  if (!coreContract) {
    log.warning(
      "[WARN] Legacy MinterFilter event handler was emitted by MinterFilter with an unknown associated core contract address, {}.",
      [coreContractAddress.toHexString()]
    );
  }

  if (coreContract && coreContract.type.startsWith("GenArt721CoreV3")) {
    minterFilter.type = "MinterFilterV1";
  } else {
    minterFilter.type = "MinterFilterV0";
  }

  minterFilter.coreRegistry = coreRegistry.id;
  minterFilter.minterGlobalAllowlist = [];
  minterFilter.updatedAt = timestamp;
  minterFilter.save();

  // @dev do not update core contract's registeredOn state, allow core contract to handle that state

  return minterFilter;
}

// Helper function that gets or creates a dummy core registry for a legacy minter filter.
// If the core registry already exists, nothing is created.
// This is needed to provide a relationship between the minter filter and the core contract
// in a schema that doesn't have a core contract field on the minter filter.
// In this case, we create a dummy core registry that has the id of the associated core
// contract address, and we never update it because legacy MinterFilters have a single core
// contract address that never changes.
function getOrCreateDummyCoreRegistryForLegacyMinterFilter(
  dummyCoreRegistryId: string,
  timestamp: BigInt
): CoreRegistry {
  let coreRegistry = CoreRegistry.load(dummyCoreRegistryId);
  if (coreRegistry) {
    return coreRegistry;
  }
  // create new core registry if it didn't exist
  coreRegistry = new CoreRegistry(dummyCoreRegistryId);
  coreRegistry.save();
  return coreRegistry;
}
