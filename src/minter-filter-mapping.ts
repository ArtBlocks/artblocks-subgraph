import { BigInt, store, Address, log } from "@graphprotocol/graph-ts";

import {
  MinterFilterV0,
  IsCanonicalMinterFilter,
  MinterApproved,
  MinterRevoked,
  ProjectMinterRegistered,
  ProjectMinterRemoved
} from "../generated/MinterFilterV0/MinterFilterV0";

import { MinterDALinV0 } from "../generated/MinterDALinV0/MinterDALinV0";
import { MinterDAExpV0 } from "../generated/MinterDAExpV0/MinterDAExpV0";
import { MinterSetPriceV0 } from "../generated/MinterSetPriceV0/MinterSetPriceV0";
import { MinterSetPriceERC20V0 } from "../generated/MinterSetPriceERC20V0/MinterSetPriceERC20V0";
import { MinterDALinV1 } from "../generated/MinterDALinV1/MinterDALinV1";
import { MinterDAExpV1 } from "../generated/MinterDAExpV1/MinterDAExpV1";

import {
  Project,
  Contract,
  MinterFilter,
  Minter,
  ProjectMinterConfiguration
} from "../generated/schema";

import { generateContractSpecificId, loadOrCreateMinter } from "./helpers";
import { IFilteredMinterV0 } from "../generated/MinterSetPriceV0/IFilteredMinterV0";

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

    let prevMinterConfig = ProjectMinterConfiguration.load(fullProjectId);
    if (prevMinterConfig) {
      store.remove("ProjectMinterConfiguration", fullProjectId);
    }
  }

  // Check the new minter filter for preconfigured projects and populate accordingly
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
    let minterType = projectAndMinterInfo.value2;

    let project = Project.load(
      generateContractSpecificId(event.params._coreContractAddress, projectId)
    );

    if (project) {
      createAndPopulateProjectMinterConfiguration(
        project,
        minterAddress,
        minterType,
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

  // Don't add the minter if it's minter filter is different
  // from the minter filter that emitted this event.
  if (minter.minterFilter != minterFilter.id) {
    store.remove("Minter", minter.id);
    return;
  }

  minterFilter.updatedAt = event.block.timestamp;
  minterFilter.save();
}

export function handleMinterRevoked(event: MinterRevoked): void {
  // Note: there's a guard on the function that only allows a minter
  // to be revoked if it is not set for any project. This means that
  // we can avoid resetting any minter config for a project here.
  let minter = Minter.load(event.params._minterAddress.toHexString());
  if (minter) {
    store.remove("Minter", event.params._minterAddress.toHexString());
    let minterFilter = MinterFilter.load(event.address.toHexString());
    if (minterFilter) {
      minterFilter.updatedAt = event.block.timestamp;
      minterFilter.save();
    }
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
    // Clear previous minter configuration
    let prevMinterConfig = ProjectMinterConfiguration.load(project.id);
    if (prevMinterConfig) {
      store.remove("ProjectMinterConfiguration", project.id);
    }

    // Create project configuration
    let minterAddress = event.params._minterAddress;
    let minterType = event.params._minterType;

    createAndPopulateProjectMinterConfiguration(
      project,
      minterAddress,
      minterType,
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
    let prevMinterConfig = ProjectMinterConfiguration.load(project.id);
    if (prevMinterConfig) {
      store.remove("ProjectMinterConfiguration", project.id);
    }
    if (project.minterConfiguration) {
      project.minterConfiguration = null;
      project.updatedAt = event.block.timestamp;
      project.save();
    }
  }
}

function createAndPopulateProjectMinterConfiguration(
  project: Project,
  minterAddress: Address,
  minterType: string,
  timestamp: BigInt
): ProjectMinterConfiguration {
  // Bootstrap minter if it doesn't exist already
  loadOrCreateMinter(minterAddress, timestamp);

  let projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.project = project.id;
  projectMinterConfig.minter = minterAddress.toHexString();

  let filteredMinterContract = IFilteredMinterV0.bind(minterAddress);
  let projectPriceInfo = filteredMinterContract.getPriceInfo(project.projectId);
  projectMinterConfig.priceIsConfigured = projectPriceInfo.value0;
  projectMinterConfig.basePrice = projectPriceInfo.value1;
  projectMinterConfig.currencySymbol = projectPriceInfo.value2;
  projectMinterConfig.currencyAddress = projectPriceInfo.value3;

  if (minterType == "MinterDALinV0") {
    assignDALinMinterConfig(
      MinterDALinV0.bind(minterAddress),
      project.projectId,
      projectMinterConfig
    );
  } else if (minterType == "MinterDALinV1") {
    assignDALinMinterConfig(
      MinterDALinV1.bind(minterAddress),
      project.projectId,
      projectMinterConfig
    );
  } else if (minterType == "MinterDAExpV0") {
    assignDAExpMinterConfig(
      MinterDAExpV0.bind(minterAddress),
      project.projectId,
      projectMinterConfig
    );
  } else if (minterType == "MinterDAExpV1") {
    assignDAExpMinterConfig(
      MinterDAExpV1.bind(minterAddress),
      project.projectId,
      projectMinterConfig
    );
  } else if (minterType == "MinterSetPriceV0") {
    let minterSetPriceV0Contract = MinterSetPriceV0.bind(minterAddress);

    projectMinterConfig.purchaseToDisabled = minterSetPriceV0Contract.purchaseToDisabled(
      project.projectId
    );
  } else if (minterType == "MinterSetPriceERC20V0") {
    let minterSetPriceERC20V0Contract = MinterSetPriceERC20V0.bind(
      minterAddress
    );

    projectMinterConfig.purchaseToDisabled = minterSetPriceERC20V0Contract.purchaseToDisabled(
      project.projectId
    );
  } else if (minterType == "MinterHolderV0") {
    let minterHolderV0Contract = MinterHolderV0.bind(minterAddress);
    projectMinterConfig.purchaseToDisabled = minterHolderV0Contract.purchaseToDisabled(
      project.projectId
    );
  }

  projectMinterConfig.save();

  project.updatedAt = timestamp;
  project.minterConfiguration = projectMinterConfig.id;
  project.save();

  return projectMinterConfig;
}

function assignDALinMinterConfig<T>(
  minterDALinContract: T,
  projectId: BigInt,
  projectMinterConfig: ProjectMinterConfiguration
): void {
  if (
    !(
      minterDALinContract instanceof MinterDALinV0 ||
      minterDALinContract instanceof MinterDALinV1
    )
  ) {
    return;
  }

  projectMinterConfig.purchaseToDisabled =
    minterDALinContract instanceof MinterDALinV0
      ? changetype<MinterDALinV0>(minterDALinContract).purchaseToDisabled(
          projectId
        )
      : false;

  let projectAuctionParameters = minterDALinContract.projectAuctionParameters(
    projectId
  );

  projectMinterConfig.startTime = projectAuctionParameters.value0;
  projectMinterConfig.endTime = projectAuctionParameters.value1;
  projectMinterConfig.startPrice = projectAuctionParameters.value2;
  projectMinterConfig.basePrice = projectAuctionParameters.value3;
}

function assignDAExpMinterConfig<T>(
  minterDAExpContract: T,
  projectId: BigInt,
  projectMinterConfig: ProjectMinterConfiguration
): void {
  if (
    !(
      minterDAExpContract instanceof MinterDAExpV0 ||
      minterDAExpContract instanceof MinterDAExpV1
    )
  ) {
    return;
  }

  projectMinterConfig.purchaseToDisabled =
    minterDAExpContract instanceof MinterDAExpV0
      ? changetype<MinterDAExpV0>(minterDAExpContract).purchaseToDisabled(
          projectId
        )
      : false;

  let projectAuctionParameters = minterDAExpContract.projectAuctionParameters(
    projectId
  );

  projectMinterConfig.startTime = projectAuctionParameters.value0;
  projectMinterConfig.halfLifeSeconds = projectAuctionParameters.value1;
  projectMinterConfig.startPrice = projectAuctionParameters.value2;
  projectMinterConfig.basePrice = projectAuctionParameters.value3;
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
