import {
  TokenParamsConfigured,
  ProjectConfigured
} from "../generated/IPMPV0/IPMPV0";
import {
  PmpProjectConfig,
  PmpConfig,
  Pmp,
  Project,
  PmpLatestState
} from "../generated/schema";
import { Address, BigInt, log, store } from "@graphprotocol/graph-ts";
import {
  generateContractSpecificId,
  generateProjectIdNumberFromTokenIdNumber
} from "./helpers";
import { PMP_AUTH_OPTIONS, PMP_PARAM_TYPES } from "./constants";

export function handleTokenParamsConfigured(
  event: TokenParamsConfigured
): void {
  const projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params.tokenId
  );

  const projectId = generateContractSpecificId(
    event.params.coreContract,
    projectIdNumber
  );

  let project = Project.load(projectId);

  if (!project) {
    // @dev While PMP is open to any NFT, we only index params on indexed projects
    return;
  }

  const tokenId = generateContractSpecificId(
    event.params.coreContract,
    event.params.tokenId
  );

  // for each PMP input in the event, create a new PMP entity. Older PMP entities should persist, don't overwrite them.
  for (let i = 0; i < event.params.pmpInputs.length; i++) {
    const pmpInput = event.params.pmpInputs[i];
    let latestTokenPMPNonce = BigInt.fromI32(0);

    // load or create the latest state entity for this PMP
    const latestStateId = generateLatestStateId(
      event.address,
      event.params.coreContract,
      event.params.tokenId,
      pmpInput.key
    );
    let latestState = PmpLatestState.load(latestStateId);

    if (!latestState) {
      latestState = new PmpLatestState(latestStateId);
    } else {
      latestTokenPMPNonce = latestState.latestTokenPMPNonce.plus(
        BigInt.fromI32(1)
      );
    }

    const pmpId = generatePMPId(
      event.address,
      event.params.coreContract,
      event.params.tokenId,
      pmpInput.key,
      latestTokenPMPNonce
    );

    let pmp = new Pmp(pmpId);
    pmp.key = pmpInput.key;

    // @dev it is valid for PMP to be created before token exists
    // additional tokenId field supports querying for this case
    pmp.token = tokenId;
    pmp.tokenIdString = tokenId;

    let currentConfiguredParamType = getPMPParamTypeString(
      BigInt.fromI32(pmpInput.configuredParamType)
    );

    pmp.tokenPMPNonce = latestTokenPMPNonce;
    pmp.configuredParamType = currentConfiguredParamType;
    pmp.configuredValue = pmpInput.configuredValue.toHexString();

    if (pmpInput.configuringArtistString) {
      pmp.artistConfiguredValueString = pmpInput.configuredValueString
        ? pmpInput.configuredValueString
        : null;
    } else {
      pmp.nonArtistConfiguredValueString = pmpInput.configuredValueString
        ? pmpInput.configuredValueString
        : null;
    }

    // update the token pmp
    pmp.createdAt = event.block.timestamp;
    pmp.save();

    // update the latest state entity
    latestState.latestTokenPMPNonce = latestTokenPMPNonce;
    latestState.save();
  }
}

export function handleProjectConfigured(event: ProjectConfigured): void {
  let projectId = generateContractSpecificId(
    event.params.coreContract,
    event.params.projectId
  );
  let project = Project.load(projectId);

  if (!project) {
    // @dev While PMP is open to any NFT, we only index params on indexed projects
    return;
  }
  const projectConfigId = generateProjectConfigId(
    event.address,
    event.params.coreContract,
    event.params.projectId
  );

  let projectConfig = PmpProjectConfig.load(projectConfigId);
  if (!projectConfig) {
    projectConfig = new PmpProjectConfig(projectConfigId);
    projectConfig.project = project.id;
    // add project pmp config to the project
    project.pmpProjectConfig = projectConfig.id;
    project.save();
  } else {
    // clean up old pmp config, only store the most recent configurations
    let previousPMPConfigCount = projectConfig.pmpConfigCount;
    let storedKeys = projectConfig.pmpConfigKeys;

    if (previousPMPConfigCount.toI32() != storedKeys.length) {
      log.warning(
        "Inconsistent data found for project config {}: count is {} but keys array length is {}",
        [
          projectConfigId,
          previousPMPConfigCount.toString(),
          storedKeys.length.toString()
        ]
      );
    } else if (previousPMPConfigCount.gt(BigInt.fromI32(0))) {
      // delete all old pmp configs
      for (let i = 0; i < previousPMPConfigCount.toI32(); i++) {
        const prevPMPConfigKey = storedKeys[i];
        const prevPMPConfigId = generatePMPConfigId(
          event.address,
          event.params.coreContract,
          event.params.projectId,
          prevPMPConfigKey
        );
        store.remove("PmpConfig", prevPMPConfigId);
      }
    }
  }

  // create PMPConfig entities for each input config
  let configKeys: string[] = [];
  for (let i = 0; i < event.params.pmpInputConfigs.length; i++) {
    const config = event.params.pmpInputConfigs[i];
    const pmpConfigId = generatePMPConfigId(
      event.address,
      event.params.coreContract,
      event.params.projectId,
      config.key
    );

    configKeys.push(config.key);

    let pmpConfig = PmpConfig.load(pmpConfigId);
    if (!pmpConfig) {
      pmpConfig = new PmpConfig(pmpConfigId);
    }

    pmpConfig.pmpProjectConfig = projectConfig.id;
    pmpConfig.authOption = getPMPAuthOptionString(
      BigInt.fromI32(config.pmpConfig.authOption)
    );
    pmpConfig.paramType = getPMPParamTypeString(
      BigInt.fromI32(config.pmpConfig.paramType)
    );
    pmpConfig.key = config.key;
    pmpConfig.pmpLockedAfterTimestamp =
      config.pmpConfig.pmpLockedAfterTimestamp;
    pmpConfig.authAddress = config.pmpConfig.authAddress;
    pmpConfig.selectOptions = config.pmpConfig.selectOptions;
    pmpConfig.minRange = config.pmpConfig.minRange.toHexString();
    pmpConfig.maxRange = config.pmpConfig.maxRange.toHexString();
    pmpConfig.createdAt = event.block.timestamp;

    pmpConfig.save();
  }

  // update the project pmp config count and config keys
  projectConfig.pmpConfigCount = BigInt.fromI32(
    event.params.pmpInputConfigs.length
  );
  projectConfig.pmpConfigKeys = configKeys;
  projectConfig.pmpAddress = event.address;
  // update the project config updatedAt timestamp to induce a sync, and save
  projectConfig.updatedAt = event.block.timestamp;
  projectConfig.save();
}

function generateLatestStateId(
  contractAddress: Address,
  coreContractAddress: Address,
  tokenId: BigInt,
  key: string
): string {
  return `${contractAddress.toHexString()}-${coreContractAddress.toHexString()}-${tokenId.toString()}-${key}`;
}

function generatePMPId(
  contractAddress: Address,
  coreContractAddress: Address,
  tokenId: BigInt,
  key: string,
  tokenPMPNonce: BigInt
): string {
  return `${contractAddress.toHexString()}-${coreContractAddress.toHexString()}-${tokenId.toString()}-${key}-${tokenPMPNonce}`;
}

function generateProjectConfigId(
  contractAddress: Address,
  coreContractAddress: Address,
  projectId: BigInt
): string {
  return `${contractAddress.toHexString()}-${coreContractAddress.toHexString()}-${projectId.toString()}`;
}

function generatePMPConfigId(
  contractAddress: Address,
  coreContractAddress: Address,
  projectId: BigInt,
  key: string
): string {
  return `${contractAddress.toHexString()}-${coreContractAddress.toHexString()}-${projectId.toString()}-${key}`;
}

function getPMPAuthOptionString(value: BigInt): string {
  const index = value.toI32();
  if (index >= 0 && index < PMP_AUTH_OPTIONS.length) {
    return PMP_AUTH_OPTIONS[index];
  }
  return "Artist"; // default value
}

function getPMPParamTypeString(value: BigInt): string {
  const index = value.toI32();
  if (index >= 0 && index < PMP_PARAM_TYPES.length) {
    return PMP_PARAM_TYPES[index];
  }
  return "Unconfigured"; // default value
}
