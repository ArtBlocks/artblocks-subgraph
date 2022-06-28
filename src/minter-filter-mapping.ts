import { BigInt, store, Address } from "@graphprotocol/graph-ts";
import { logStore } from "matchstick-as";

import {
  MinterFilterV0,
  IsCanonicalMinterFilter,
  MinterApproved,
  MinterRevoked,
  ProjectMinterRegistered,
  ProjectMinterRemoved
} from "../generated/MinterFilterV0/MinterFilterV0";

import {
  Project,
  Contract,
  MinterFilter,
  Minter,
  ProjectMinterConfiguration
} from "../generated/schema";

import {
  generateContractSpecificId,
  getProjectMinterConfigId,
  loadOrCreateMinter
} from "./helpers";

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
    minterFilter.coreContract = event.params._coreContractAddress.toHexString();
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
      loadOrCreateAndSetProjectMinterConfiguration(
        project,
        minterAddress,
        event.block.timestamp
      );
    }
  }

  coreContract.minterFilter = event.address.toHexString();
  coreContract.updatedAt = event.block.timestamp;
  coreContract.save();
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
  if (!minterFilter.minterAllowlist.includes(minter.id)) {
    minterFilter.minterAllowlist = minterFilter.minterAllowlist.concat([
      minter.id
    ]);
    minterFilter.updatedAt = event.block.timestamp;
    minterFilter.save();
  }
}

export function handleMinterRevoked(event: MinterRevoked): void {
  // Note: there's a guard on the function that only allows a minter
  // to be revoked if it is not set for any project. This means that
  // we can avoid resetting any projects' minter configurations here.
  let minterFilter = loadOrCreateMinterFilter(
    event.address,
    event.block.timestamp
  );

  let minter = Minter.load(event.params._minterAddress.toHexString());

  if (minter && minterFilter) {
    // keep the Minter in the store to avoid having to re-populate it is
    // re-approved

    // remove the minter from the list of allowlisted minters
    let newMinterAllowlist: string[] = [];
    for (let i = 0; i < minterFilter.minterAllowlist.length; i++) {
      if (minterFilter.minterAllowlist[i] != minter.id) {
        newMinterAllowlist.push(minterFilter.minterAllowlist[i]);
      }
    }
    minterFilter.minterAllowlist = newMinterAllowlist;
    minterFilter.updatedAt = event.block.timestamp;
    minterFilter.save();
  }
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
  let coreContract = Contract.load(minterFilter.coreContract);

  if (
    !minter ||
    !coreContract ||
    coreContract.minterFilter != event.address.toHexString()
  ) {
    return;
  }

  let project = Project.load(
    generateContractSpecificId(
      Address.fromString(minterFilter.coreContract),
      event.params._projectId
    )
  );

  if (project) {
    // Create project configuration
    let minterAddress = event.params._minterAddress;

    loadOrCreateAndSetProjectMinterConfiguration(
      project,
      minterAddress,
      event.block.timestamp
    );
  }
}

export function handleProjectMinterRemoved(event: ProjectMinterRemoved): void {
  let minterFilter = loadOrCreateMinterFilter(
    event.address,
    event.block.timestamp
  );

  let coreContract = Contract.load(minterFilter.coreContract);

  if (
    !coreContract ||
    coreContract.minterFilter != event.address.toHexString()
  ) {
    return;
  }

  let project = Project.load(
    generateContractSpecificId(
      Address.fromString(minterFilter.coreContract),
      event.params._projectId
    )
  );

  if (project) {
    project.minterConfiguration = null;
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

function loadOrCreateAndSetProjectMinterConfiguration(
  project: Project,
  minterAddress: Address,
  timestamp: BigInt
): ProjectMinterConfiguration {
  // Bootstrap minter if it doesn't exist already
  loadOrCreateMinter(minterAddress, timestamp);

  let projectMinterConfig = ProjectMinterConfiguration.load(
    getProjectMinterConfigId(minterAddress.toHexString(), project.id)
  );

  if (projectMinterConfig == null) {
    projectMinterConfig = new ProjectMinterConfiguration(
      getProjectMinterConfigId(minterAddress.toHexString(), project.id)
    );
    projectMinterConfig.project = project.id;
    projectMinterConfig.minter = minterAddress.toHexString();
    projectMinterConfig.save();
  }

  project.updatedAt = timestamp;
  project.minterConfiguration = projectMinterConfig.id;
  project.save();

  return projectMinterConfig;
}

function loadOrCreateMinterFilter(
  minterFilterAddress: Address,
  timestamp: BigInt
): MinterFilter {
  let minterFilter = MinterFilter.load(minterFilterAddress.toHexString());
  if (minterFilter) {
    return minterFilter;
  }

  minterFilter = new MinterFilter(minterFilterAddress.toHexString());
  let minterFilterContract = MinterFilterV0.bind(minterFilterAddress);
  let coreContractAddress = minterFilterContract.genArt721CoreAddress();
  minterFilter.coreContract = coreContractAddress.toHexString();
  minterFilter.updatedAt = timestamp;
  minterFilter.save();

  return minterFilter;
}
