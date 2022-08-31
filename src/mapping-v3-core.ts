import { BigInt, store, log, Address } from "@graphprotocol/graph-ts";

import {
  GenArt721CoreV3,
  Mint,
  ProjectUpdated,
  Transfer
} from "../generated/GenArt721CoreV3/GenArt721CoreV3";

import {
  Project,
  Token,
  Transfer as TokenTransfer,
  Account,
  AccountProject,
  ProjectScript,
  Contract
} from "../generated/schema";

import {
  generateAccountProjectId,
  generateProjectIdNumberFromTokenIdNumber,
  generateContractSpecificId,
  generateProjectScriptId
} from "./helpers";

/*** EVENT HANDLERS ***/
export function handleMint(event: Mint): void {
  let contract = GenArt721CoreV3.bind(event.address);

  let token = new Token(
    generateContractSpecificId(event.address, event.params._tokenId)
  );
  let projectIdNumber = generateProjectIdNumberFromTokenIdNumber(
    event.params._tokenId
  );
  let projectId = generateContractSpecificId(event.address, projectIdNumber);

  let project = Project.load(projectId);
  if (project) {
    let invocation = project.invocations;

    token.tokenId = event.params._tokenId;
    token.contract = event.address.toHexString();
    token.project = projectId;
    token.owner = event.params._to.toHexString();
    // Okay to assume the hash is assigned in same tx as mint for now,
    // but this will need to be updated if we ever support async token hash
    // assignment.
    token.hash = contract.tokenIdToHash(event.params._tokenId);
    token.invocation = invocation;
    token.createdAt = event.block.timestamp;
    token.updatedAt = event.block.timestamp;
    token.transactionHash = event.transaction.hash;
    token.nextSaleId = BigInt.fromI32(0);
    token.save();

    project.invocations = invocation.plus(BigInt.fromI32(1));
    if (project.invocations == project.maxInvocations) {
      project.complete = true;
      project.updatedAt = event.block.timestamp;
    }
    project.save();

    let account = new Account(token.owner);
    account.save();

    let accountProjectId = generateAccountProjectId(account.id, project.id);
    let accountProject = AccountProject.load(accountProjectId);
    if (!accountProject) {
      accountProject = new AccountProject(accountProjectId);
      accountProject.account = account.id;
      accountProject.project = project.id;
      accountProject.count = 0;
    }
    accountProject.count += 1;
    accountProject.save();
  }
}

// Update token owner on transfer
export function handleTransfer(event: Transfer): void {
  // This will only create a new token if a token with the
  // same id does not already exist
  let token = Token.load(
    generateContractSpecificId(event.address, event.params.tokenId)
  );

  // Let mint handlers deal with new tokens
  if (token) {
    // Update Account <-> Project many-to-many relation
    // table to reflect new account project token balance
    let prevAccountProject = AccountProject.load(
      generateAccountProjectId(
        event.transaction.from.toHexString(),
        token.project
      )
    );

    if (
      prevAccountProject &&
      (prevAccountProject as AccountProject).count > 1
    ) {
      prevAccountProject.count -= 1;
      prevAccountProject.save();
    } else if (prevAccountProject) {
      store.remove("AccountProject", prevAccountProject.id);
    }

    let newAccountProjectId = generateAccountProjectId(
      event.params.to.toHexString(),
      token.project
    );
    let newAccountProject = AccountProject.load(newAccountProjectId);
    if (!newAccountProject) {
      newAccountProject = new AccountProject(newAccountProjectId);
      newAccountProject.project = token.project;
      newAccountProject.account = event.params.to.toHexString();
      newAccountProject.count = 0;
    }
    newAccountProject.count += 1;
    newAccountProject.save();

    // Create a new account entity if one for the new owner doesn't exist
    let account = new Account(event.params.to.toHexString());
    account.save();

    token.owner = event.params.to.toHexString();
    token.updatedAt = event.block.timestamp;
    token.save();

    let transfer = new TokenTransfer(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );
    transfer.transactionHash = event.transaction.hash;
    transfer.createdAt = event.block.timestamp;
    transfer.to = event.params.to;
    transfer.from = event.params.from;
    transfer.token = token.id;
    transfer.save();
  }
}

const FIELD_PROJECT_ACTIVE = "active";
const FIELD_PROJECT_ARTIST_ADDRESS = "artistAddress";
const FIELD_PROJECT_ARTIST_NAME = "artistName";
const FIELD_PROJECT_ASPECT_RATIO = "aspectRatio";
const FIELD_PROJECT_BASE_URI = "baseURI";
const FIELD_PROJECT_COMPLETED = "completed";
const FIELD_PROJECT_CREATED = "created";
const FIELD_PROJECT_DESCRIPTION = "description";
const FIELD_PROJECT_IPFS_HASH = "ipfsHash";
const FIELD_PROJECT_LICENSE = "license";
const FIELD_PROJECT_MAX_INVOCATIONS = "maxInvocations";
const FIELD_PROJECT_NAME = "name";
const FIELD_PROJECT_PAUSED = "paused";
const FIELD_PROJECT_SCRIPT = "script";
const FIELD_PROJECT_SCRIPT_TYPE = "scriptType";
const FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE = "royaltyPercentage";
const FIELD_PROJECT_WEBSITE = "website";

export function handleProjectUpdated(event: ProjectUpdated): void {
  let contract = GenArt721CoreV3.bind(event.address);
  const update = event.params._update.toString();
  const timestamp = event.block.timestamp;

  if (update == FIELD_PROJECT_CREATED) {
    createProject(contract, event.params._projectId, timestamp);
    return;
  }

  const project = Project.load(event.params._projectId.toString());

  if (!project) {
    log.warning("Project not found for update: {}-{}", [
      event.address.toHexString(),
      event.params._projectId.toString()
    ]);
    return;
  }

  // Note switch statements
  if (
    update == FIELD_PROJECT_ACTIVE ||
    update == FIELD_PROJECT_MAX_INVOCATIONS ||
    update == FIELD_PROJECT_PAUSED
  ) {
    handleProjectStateDataUpdated(contract, project, timestamp);
  } else if (update == FIELD_PROJECT_ARTIST_ADDRESS) {
    handleProjectArtistAddressUpdated(contract, project, timestamp);
  } else if (
    update == FIELD_PROJECT_ARTIST_NAME ||
    update == FIELD_PROJECT_DESCRIPTION ||
    update == FIELD_PROJECT_LICENSE ||
    update == FIELD_PROJECT_NAME ||
    update == FIELD_PROJECT_WEBSITE
  ) {
    handleProjectDetailsUpdated(contract, project, timestamp);
  } else if (
    update == FIELD_PROJECT_ASPECT_RATIO ||
    update == FIELD_PROJECT_IPFS_HASH ||
    update == FIELD_PROJECT_SCRIPT_TYPE
  ) {
    handleProjectScriptDetailsUpdated(contract, project, timestamp);
  } else if (update == FIELD_PROJECT_BASE_URI) {
    handleProjectBaseURIUpdated(contract, project, timestamp);
  } else if (update == FIELD_PROJECT_COMPLETED) {
    // Note this event is only ever fired when a project is completed
    // and that a project cannot become incomplete after it has been completed
    handleProjectCompleted(project, timestamp);
  } else if (update == FIELD_PROJECT_CREATED) {
  } else if (update == FIELD_PROJECT_SCRIPT) {
    refreshProjectScript(contract, project, timestamp);
  } else if (update == FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE) {
    handleProjectSecondaryMarketRoyaltyPercentageUpdated(
      contract,
      project,
      timestamp
    );
  } else {
  }
}

/*** PROJECT UPDATED FUNCTIONS ***/
export function handleProjectStateDataUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectStateData = contract.try_projectStateData(project.projectId);
  if (!projectStateData.reverted) {
    project.active = projectStateData.value.getActive();
    project.maxInvocations = projectStateData.value.getMaxInvocations();
    project.paused = projectStateData.value.getPaused();
    project.updatedAt = timestamp;
    project.save();
  }
}

export function handleProjectArtistAddressUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectArtistAddress = contract.try_projectIdToArtistAddress(
    project.projectId
  );
  if (!projectArtistAddress.reverted) {
    project.artistAddress = projectArtistAddress.value;
    project.updatedAt = timestamp;
    project.save();
  }
}

export function handleProjectDetailsUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectDetails = contract.try_projectDetails(project.projectId);
  if (!projectDetails.reverted) {
    project.artistName = projectDetails.value.getArtist();
    project.description = projectDetails.value.getDescription();
    project.name = projectDetails.value.getProjectName();
    project.website = projectDetails.value.getWebsite();
    project.updatedAt = timestamp;
    project.license = projectDetails.value.getLicense();
    project.save();
  }
}

export function handleProjectScriptDetailsUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectScriptDetails = contract.try_projectScriptDetails(
    project.projectId
  );
  if (!projectScriptDetails.reverted) {
    project.aspectRatio = projectScriptDetails.value.getAspectRatio();
    project.ipfsHash = projectScriptDetails.value.getIpfsHash();
    project.scriptTypeAndVersion = projectScriptDetails.value.getScriptTypeAndVersion();
    project.updatedAt = timestamp;
    project.save();
  }
}

export function handleProjectBaseURIUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectBaseURI = contract.try_projectURIInfo(project.projectId);
  if (!projectBaseURI.reverted) {
    project.baseUri = projectBaseURI.value;
    project.updatedAt = timestamp;
    project.save();
  }
}

export function handleProjectCompleted(
  project: Project,
  timestamp: BigInt
): void {
  project.complete = true;
  project.completedAt = timestamp;
  project.updatedAt = timestamp;
}

export function handleProjectSecondaryMarketRoyaltyPercentageUpdated(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  const projectSecondaryMarketRoyaltyPercentage = contract.try_projectIdToSecondaryMarketRoyaltyPercentage(
    project.projectId
  );
  if (!projectSecondaryMarketRoyaltyPercentage.reverted) {
    project.royaltyPercentage = projectSecondaryMarketRoyaltyPercentage.value;
    project.updatedAt = timestamp;
    project.save();
  }
}

function createProject(
  contract: GenArt721CoreV3,
  projectId: BigInt,
  timestamp: BigInt
) {
  const contractAddress = contract._address.toHexString();
  let contractEntity = Contract.load(contractAddress);
  if (!contractEntity) {
    // Create the contract entity
    // Will use refreshContract function implemented by Ryley once completed
  }

  const projectDetails = contract.try_projectDetails(projectId);
  const projectScriptDetails = contract.try_projectScriptDetails(projectId);
  const projectStateData = contract.try_projectStateData(projectId);
  const projectArtistAddress = contract.try_projectIdToArtistAddress(projectId);

  if (
    projectDetails.reverted ||
    projectScriptDetails.reverted ||
    projectStateData.reverted ||
    projectArtistAddress.reverted
  ) {
    log.warning("Failed to get project details for new project: {}-{}", [
      contractAddress,
      projectId.toString()
    ]);
    return;
  }

  let name = projectDetails.value.getProjectName();
  let dynamic = true;

  let artistAddress = projectArtistAddress.value;
  let artist = new Account(artistAddress.toHexString());
  artist.save();

  let pricePerTokenInWei = BigInt.fromI32(0);
  let invocations = projectStateData.value.getInvocations();
  let maxInvocations = projectStateData.value.getMaxInvocations();
  let currencySymbol = "ETH";
  let currencyAddress = Address.zero();

  let scriptCount = projectScriptDetails.value.getScriptCount();
  let useHashString = true;
  let paused = projectStateData.value.getPaused();

  let project = new Project(
    generateContractSpecificId(contract._address, projectId)
  );

  project.active = false;
  project.artist = artist.id;
  project.artistAddress = artistAddress;
  project.complete = false;
  project.contract = contractAddress;
  project.createdAt = timestamp;
  project.currencyAddress = currencyAddress;
  project.currencySymbol = currencySymbol;
  project.dynamic = dynamic;
  project.externalAssetDependencyCount = BigInt.fromI32(0);
  project.invocations = invocations;
  project.locked = false;
  project.maxInvocations = maxInvocations;
  project.name = name;
  project.paused = paused;
  project.pricePerTokenInWei = pricePerTokenInWei;
  project.projectId = projectId;
  project.scriptCount = scriptCount;
  project.updatedAt = timestamp;
  project.useHashString = useHashString;
  project.useIpfs = false;

  project.save();
}

function refreshProjectScript(
  contract: GenArt721CoreV3,
  project: Project,
  timestamp: BigInt
): void {
  let scriptDetails = contract.try_projectScriptDetails(project.projectId);
  if (scriptDetails.reverted) {
    log.warning("Could not retrive script info for project {}", [project.id]);
    return;
  }

  let prevScriptCount = project.scriptCount.toI32();
  let scriptCount = scriptDetails.value.getScriptCount().toI32();

  // Remove ProjectScripts that no longer exist on chain
  if (prevScriptCount > scriptCount) {
    for (let i = scriptCount; i < prevScriptCount; i++) {
      const projectScript = ProjectScript.load(
        generateProjectScriptId(project.id, BigInt.fromI32(i))
      );
      if (projectScript) {
        store.remove("ProjectScript", projectScript.id);
      }
    }
  }

  let scripts: string[] = [];
  for (let i = 0; i < scriptCount; i++) {
    let script = contract.projectScriptByIndex(
      project.projectId,
      BigInt.fromI32(i)
    );

    let projectScriptIndex = BigInt.fromI32(i);
    let projectScript = new ProjectScript(
      generateProjectScriptId(project.id, projectScriptIndex)
    );
    projectScript.script = script;
    projectScript.index = projectScriptIndex;
    projectScript.project = project.id;
    projectScript.save();

    if (script && script != "") {
      scripts.push(script);
    }
  }

  let script = scripts.join("");

  project.script = script;
  project.scriptCount = scriptDetails.value.getScriptCount();
  project.updatedAt = timestamp;
  project.scriptUpdatedAt = timestamp;

  project.save();
}
/*** END PROJECT UPDATED FUNCTIONS ***/

/*** END EVENT HANDLERS ***/

/*** NO CALL HANDLERS  ***/

/** HELPERS ***/

/** END HELPERS ***/
