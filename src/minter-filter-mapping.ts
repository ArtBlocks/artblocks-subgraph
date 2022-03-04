import {
  BigInt,
  store,
  Address,
  TypedMap,
  ethereum
} from "@graphprotocol/graph-ts";

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

import {
  Project,
  Contract,
  MinterFilter,
  Minter,
  ProjectMinterConfiguration
} from "../generated/schema";

import { generateContractSpecificId } from "./helpers";

export function handleIsCanonicalMinterFilter(
  event: IsCanonicalMinterFilter
): void {
  let coreContract = Contract.load(
    event.params._coreContractAddress.toHexString()
  );

  if (!coreContract) {
    return;
  }

  // Only set the minter filter on the core contract if it is whitelisted
  let minterFilterIsWhitelisted = false;
  for (let i = 0; i < coreContract.mintWhitelisted.length; i++) {
    if (coreContract.mintWhitelisted[i] == event.address) {
      minterFilterIsWhitelisted = true;
      break;
    }
  }

  if (!minterFilterIsWhitelisted) {
    return;
  }

  let minterFilter = MinterFilter.load(event.address.toHexString());
  if (!minterFilter) {
    minterFilter = new MinterFilter(event.address.toHexString());
    minterFilter.coreContract = event.params._coreContractAddress.toHexString();
    minterFilter.updatedAt = event.block.timestamp;
    minterFilter.save();
  }

  // Reset the minter config for all projects on core contract when a new minter filter is set
  let nextProjectId = coreContract.nextProjectId.toI32();
  for (let i = 0; i < nextProjectId; i++) {
    let fullProjectId = coreContract.id + "-" + i.toString();
    let project = Project.load(fullProjectId);

    if (project) {
      project.minterConfiguration = null;
      project.updatedAt = event.block.timestamp;
      project.save();
    }

    store.remove("ProjectMinterConfiguration", fullProjectId);
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

  let minter = new Minter(event.params._minterAddress.toHexString());
  minter.minterFilter = event.address.toHexString();
  minter.type = event.params._minterType.toString();

  if (event.params._minterType.toString() === "MinterDALinV0") {
    let minterDALinV0Contract = MinterDALinV0.bind(event.params._minterAddress);
    minter.minimumAuctionLengthInSeconds = minterDALinV0Contract.minimumAuctionLengthSeconds();
  }

  if (event.params._minterType.toString() === "MinterDAExpV0") {
    let MinterDAExpV0Contract = MinterDAExpV0.bind(event.params._minterAddress);
    minter.minimumHalfLifeInSeconds = MinterDAExpV0Contract.minimumPriceDecayHalfLifeSeconds();
    minter.maximumHalfLifeInSeconds = MinterDAExpV0Contract.maximumPriceDecayHalfLifeSeconds();
  }

  minterFilter.updatedAt = event.block.timestamp;

  minter.updatedAt = event.block.timestamp;
  minter.save();
}

export function handleMinterRevoked(event: MinterRevoked): void {
  store.remove("Minter", event.params._minterAddress.toHexString());
  let minterFilter = MinterFilter.load(event.address.toHexString());
  if (minterFilter) {
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
    // Clear previous minter configuration
    store.remove("ProjectMinterConfiguration", project.id);

    // Create project configuration
    let minterAddress = event.params._minterAddress;
    let minterType = event.params._minterType.toString();

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
    store.remove("ProjectMinterConfiguration", project.id);
  }
}

function createAndPopulateProjectMinterConfiguration(
  project: Project,
  minterAddress: Address,
  minterType: string,
  timestamp: BigInt
): ProjectMinterConfiguration {
  let projectMinterConfig = new ProjectMinterConfiguration(project.id);
  projectMinterConfig.project = project.id;
  projectMinterConfig.minter = minterAddress.toHexString();

  let projectPriceInfo: GetPriceInfoResult;

  if (minterType === "MinterDALinV0") {
    let minterDALinV0Contract = MinterDALinV0.bind(minterAddress);

    projectPriceInfo = changetype<GetPriceInfoResult>(
      minterDALinV0Contract.getPriceInfo(project.projectId)
    );

    let projectAuctionParameters = minterDALinV0Contract.projectAuctionParameters(
      project.projectId
    );

    projectMinterConfig.startTime = projectAuctionParameters.value0;
    projectMinterConfig.endTime = projectAuctionParameters.value1;
    projectMinterConfig.startPrice = projectAuctionParameters.value2;
    projectMinterConfig.basePrice = projectAuctionParameters.value3;
  } else if (minterType == "MinterDAExpV0") {
    let minterDAExpV0Contract = MinterDAExpV0.bind(minterAddress);

    projectPriceInfo = changetype<GetPriceInfoResult>(
      minterDAExpV0Contract.getPriceInfo(project.projectId)
    );

    let projectAuctionParameters = minterDAExpV0Contract.projectAuctionParameters(
      project.projectId
    );

    projectMinterConfig.startTime = projectAuctionParameters.value0;
    projectMinterConfig.halfLifeSeconds = projectAuctionParameters.value1;
    projectMinterConfig.startPrice = projectAuctionParameters.value2;
    projectMinterConfig.basePrice = projectAuctionParameters.value3;
  } else if (minterType == "MinterSetPriceV0") {
    let minterSetPriceV0Contract = MinterSetPriceV0.bind(minterAddress);

    projectPriceInfo = changetype<GetPriceInfoResult>(
      minterSetPriceV0Contract.getPriceInfo(project.projectId)
    );
  } else if (minterType == "MinterSetPriceERC20V0") {
    let minterSetPriceERC20V0Contract = MinterSetPriceERC20V0.bind(
      minterAddress
    );

    projectPriceInfo = changetype<GetPriceInfoResult>(
      minterSetPriceERC20V0Contract.getPriceInfo(project.projectId)
    );
  }

  if (projectPriceInfo) {
    setProjectMinterConfigurationPriceInfo(
      projectMinterConfig,
      projectPriceInfo
    );
  }

  project.updatedAt = timestamp;
  project.minterConfiguration = projectMinterConfig.id;
  project.save();

  return projectMinterConfig;
}

function setProjectMinterConfigurationPriceInfo(
  projectMinterConfig: ProjectMinterConfiguration,
  priceInfo: GetPriceInfoResult
): void {
  projectMinterConfig.priceIsConfigured = priceInfo.value0;
  projectMinterConfig.basePrice = priceInfo.value1;
  projectMinterConfig.currencySymbol = priceInfo.value2;
  projectMinterConfig.currencyAddress = priceInfo.value3;

  projectMinterConfig.save();
}

function loadOrCreateMinterFilter(
  minterFilterAddress: Address,
  timestamp: BigInt
): MinterFilter {
  let minterFilter = MinterFilter.load(minterFilterAddress.toHexString());
  if (!minterFilter) {
    minterFilter = new MinterFilter(minterFilterAddress.toHexString());
    let minterFilterContract = MinterFilterV0.bind(minterFilterAddress);
    let coreContractAddress = minterFilterContract.genArt721CoreAddress();
    minterFilter.coreContract = coreContractAddress.toHexString();
    minterFilter.updatedAt = timestamp;
    minterFilter.save();
  }

  return minterFilter;
}

// Generic version of classes generated for each contract getPriceInfo function
class GetPriceInfoResult {
  value0: boolean;
  value1: BigInt;
  value2: string;
  value3: Address;

  constructor(
    value0: boolean,
    value1: BigInt,
    value2: string,
    value3: Address
  ) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
  }

  toMap(): TypedMap<string, ethereum.Value> {
    let map = new TypedMap<string, ethereum.Value>();
    map.set("value0", ethereum.Value.fromBoolean(this.value0));
    map.set("value1", ethereum.Value.fromUnsignedBigInt(this.value1));
    map.set("value2", ethereum.Value.fromString(this.value2));
    map.set("value3", ethereum.Value.fromAddress(this.value3));
    return map;
  }
}
