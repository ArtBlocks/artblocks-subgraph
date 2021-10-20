import {
  BigInt,
  Bytes,
  store,
  json,
  JSONValueKind,
  log,
  Address
} from "@graphprotocol/graph-ts";

import {
  GenArt721Core2PBAB,
  Mint,
  Transfer,
  AddProjectCall,
  AddProjectScriptCall,
  RemoveProjectLastScriptCall,
  ToggleProjectIsActiveCall,
  ToggleProjectIsLockedCall,
  ToggleProjectIsPausedCall,
  UpdateProjectAdditionalPayeeInfoCall,
  UpdateProjectArtistAddressCall,
  UpdateProjectArtistNameCall,
  UpdateProjectBaseURICall,
  UpdateProjectCurrencyInfoCall,
  UpdateProjectDescriptionCall,
  UpdateProjectIpfsHashCall,
  UpdateProjectLicenseCall,
  UpdateProjectMaxInvocationsCall,
  UpdateProjectNameCall,
  UpdateProjectPricePerTokenInWeiCall,
  UpdateProjectScriptCall,
  UpdateProjectScriptJSONCall,
  UpdateProjectSecondaryMarketRoyaltyPercentageCall,
  UpdateProjectWebsiteCall,
  AddWhitelistedCall,
  AddMintWhitelistedCall,
  UpdateRandomizerAddressCall,
  UpdateRenderProviderAddressCall,
  UpdateRenderProviderPercentageCall,
  RemoveWhitelistedCall,
  RemoveMintWhitelistedCall,
  UpdateAdminCall
} from "../generated/GenArt721Core2PBAB/GenArt721Core2PBAB";

import {
  Project,
  Token,
  Account,
  AccountProject,
  Contract,
  Whitelisting,
  ProjectScript
} from "../generated/schema";

import {
  generateAccountProjectId,
  generateWhitelistingId,
  generateContractSpecificId,
  generateProjectScriptId
} from "./helpers";

/*** EVENT HANDLERS ***/
export function handleMint(event: Mint): void {
  let contract = GenArt721Core2PBAB.bind(event.address);

  let token = new Token(
    generateContractSpecificId(event.address, event.params._tokenId)
  );
  let projectId = generateContractSpecificId(
    event.address,
    event.params._projectId
  );
  let project = Project.load(projectId);

  if(project) {
    let invocation = project.invocations;

    token.tokenId = event.params._tokenId;
    token.contract = event.address.toHexString();
    token.project = projectId;
    token.owner = event.params._to.toHexString();
    token.hash = contract.tokenIdToHash(event.params._tokenId);
    token.invocation = invocation;
    token.createdAt = event.block.timestamp;
    token.updatedAt = event.block.timestamp;
    token.transactionHash = event.transaction.hash;
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
    if (accountProject == null) {
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
  if (token != null) {
    // Update Account <-> Project many-to-many relation
    // table to reflect new account project token balance
    let prevAccountProject = AccountProject.load(
      generateAccountProjectId(
        event.transaction.from.toHexString(),
        token.project
      )
    );

    if (
      prevAccountProject != null &&
      (prevAccountProject as AccountProject).count > 1
    ) {
      prevAccountProject.count -= 1;
      prevAccountProject.save();
    } else if (prevAccountProject != null) {
      store.remove("AccountProject", prevAccountProject.id);
    }

    let newAccountProjectId = generateAccountProjectId(
      event.params.to.toHexString(),
      token.project
    );
    let newAccountProject = AccountProject.load(newAccountProjectId);
    if (newAccountProject == null) {
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
  }
}
/*** END EVENT HANDLERS ***/

/*** CALL HANDLERS  (Mainnet and Ropsten Only) ***/
export function handleAddProject(call: AddProjectCall): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  let contractEntity = Contract.load(call.to.toHexString());

  let projectId: BigInt;
  if (contractEntity == null) {
    contractEntity = refreshContract(contract, call.block.timestamp);
    // In this case nextProjectId has already been incremented
    projectId = contractEntity.nextProjectId.minus(BigInt.fromI32(1));
  } else {
    projectId = contractEntity.nextProjectId;
  }

  let projectDetails = contract.projectDetails(projectId);
  let projectTokenInfo = contract.projectTokenInfo(projectId);
  let projectScriptInfo = contract.projectScriptInfo(projectId);

  let timestamp = call.block.timestamp;
  let contractAddress = call.to;

  let name = projectDetails.value0;
  let dynamic = false;

  let artistAddress = projectTokenInfo.value0;
  let artist = new Account(artistAddress.toHexString());
  artist.save();

  let pricePerTokenInWei = projectTokenInfo.value1;
  let invocations = projectTokenInfo.value2;
  let maxInvocations = projectTokenInfo.value3;
  let currencySymbol = projectTokenInfo.value7;

  let scriptCount = projectScriptInfo.value1;
  let useHashString = true;
  let paused = projectScriptInfo.value4;

  let project = new Project(
    generateContractSpecificId(contractAddress, projectId)
  );

  project.contract = contractAddress.toHexString();
  project.artist = artist.id;
  project.projectId = projectId;
  project.name = name;
  project.dynamic = dynamic;
  project.artistAddress = artistAddress;
  project.pricePerTokenInWei = pricePerTokenInWei;
  project.invocations = invocations;
  project.maxInvocations = maxInvocations;
  project.currencySymbol = currencySymbol;
  project.scriptCount = scriptCount;
  project.useHashString = useHashString;
  project.paused = paused;
  project.active = false;
  project.locked = false;
  project.complete = false;
  project.createdAt = timestamp;
  project.updatedAt = timestamp;

  project.save();

  contractEntity.nextProjectId = contractEntity.nextProjectId.plus(
    BigInt.fromI32(1)
  );
  contractEntity.updatedAt = call.block.timestamp;
  contractEntity.save();
}

export function handleUpdateAdmin(call: UpdateAdminCall): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  refreshContract(contract as GenArt721Core2PBAB, call.block.timestamp);
}

export function handleAddWhitelisted(call: AddWhitelistedCall): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  addWhitelisting(contractEntity.id, call.inputs._address.toHexString());
}

function addWhitelisting(contractId: string, accountId: string): void {
  let account = new Account(accountId);
  account.save();

  let whitelisting = new Whitelisting(
    generateWhitelistingId(contractId, account.id)
  );
  whitelisting.account = account.id;
  whitelisting.contract = contractId;

  whitelisting.save();
}

export function handleRemoveWhitelisted(call: RemoveMintWhitelistedCall): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  removeWhitelisting(contractEntity.id, call.inputs._address.toHexString());
}

function removeWhitelisting(contractId: string, accountId: string): void {
  let account = new Account(accountId);

  let whitelistingId = generateWhitelistingId(contractId, account.id);
  let whitelisting = Whitelisting.load(whitelistingId);

  if (whitelisting != null) {
    store.remove("Whitelisting", whitelistingId);
  }
}

export function handleAddMintWhitelisted(call: AddMintWhitelistedCall): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  contractEntity.mintWhitelisted = contractEntity.mintWhitelisted
    ? contractEntity.mintWhitelisted.concat([call.inputs._address])
    : [call.inputs._address];
  contractEntity.save();
}

export function handleRemoveMintWhitelistedPBAB(
  call: RemoveMintWhitelistedCall
): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  removeMintWhitelisting(contractEntity, call.inputs._address);
}

function removeMintWhitelisting(
  contractEntity: Contract,
  minterAddress: Address
): void {
  let mintWhitelisted = contractEntity.mintWhitelisted;

  let newMintWhitelisted: Bytes[] = [];
  for (let i = 0; i < mintWhitelisted.length; i++) {
    if ((mintWhitelisted[i] as Bytes) != minterAddress) {
      newMintWhitelisted.push(mintWhitelisted[i]);
    }
  }

  contractEntity.mintWhitelisted = newMintWhitelisted;
  contractEntity.save();
}

export function handleUpdateRandomizerAddress(
  call: UpdateRandomizerAddressCall
): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleUpdateRenderProviderAddress(
  call: UpdateRenderProviderAddressCall
): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleUpdateRenderProviderPercentage(
  call: UpdateRenderProviderPercentageCall
): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleAddProjectScript(call: AddProjectScriptCall): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
}

export function handleRemoveProjectLastScript(
  call: RemoveProjectLastScriptCall
): void {
  let contract = GenArt721Core2PBAB.bind(call.to);
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project != null) {
    store.remove(
      "ProjectScript",
      generateProjectScriptId(
        project.id,
        project.scriptCount.minus(BigInt.fromI32(1))
      )
    );
    refreshProjectScript(
      contract,
      call.inputs._projectId,
      call.block.timestamp
    );
  }
}

export function handleToggleProjectIsActive(
  call: ToggleProjectIsActiveCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project != null && project.contract == call.to.toHexString()) {
    project.active = !project.active;
    project.activatedAt = project.active ? call.block.timestamp : null;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleToggleProjectIsLocked(
  call: ToggleProjectIsLockedCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project != null && project.contract == call.to.toHexString()) {
    project.locked = !project.locked;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleToggleProjectIsPaused(
  call: ToggleProjectIsPausedCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project != null && project.contract == call.to.toHexString()) {
    project.paused = !project.paused;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectAdditionalPayeeInfo(
  call: UpdateProjectAdditionalPayeeInfoCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.additionalPayee = call.inputs._additionalPayee;
  project.additionalPayeePercentage = call.inputs._additionalPayeePercentage;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectArtistAddress(
  call: UpdateProjectArtistAddressCall
): void {
  let artist = new Account(call.inputs._artistAddress.toHexString());
  artist.save();

  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  project.artistAddress = call.inputs._artistAddress;
  project.artist = artist.id;
  project.updatedAt = call.block.timestamp;

  project.save();
}

export function handleUpdateProjectArtistName(
  call: UpdateProjectArtistNameCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.artistName = call.inputs._projectArtistName;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectBaseURI(
  call: UpdateProjectBaseURICall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.baseUri = call.inputs._newBaseURI;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectCurrencyInfo(
  call: UpdateProjectCurrencyInfoCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.currencySymbol = call.inputs._currencySymbol;
  project.currencyAddress = call.inputs._currencyAddress;
  project.updatedAt = call.block.timestamp;

  project.save();
}

export function handleUpdateProjectDescription(
  call: UpdateProjectDescriptionCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.description = call.inputs._projectDescription;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectIpfsHash(
  call: UpdateProjectIpfsHashCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.ipfsHash = call.inputs._ipfsHash;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectLicense(
  call: UpdateProjectLicenseCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.license = call.inputs._projectLicense;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectMaxInvocations(
  call: UpdateProjectMaxInvocationsCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project != null) {
    project.maxInvocations = call.inputs._maxInvocations;
    project.complete = project.invocations.ge(project.maxInvocations);
    project.updatedAt = call.block.timestamp;
    project.save();
  } else {
    log.warning(
      "handleUpdateProjectMaxInvocations received unexpected project id",
      []
    );
  }
}

export function handleUpdateProjectName(call: UpdateProjectNameCall): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.name = call.inputs._projectName;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectPricePerTokenInWei(
  call: UpdateProjectPricePerTokenInWeiCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.pricePerTokenInWei = call.inputs._pricePerTokenInWei;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectScript(call: UpdateProjectScriptCall): void {
  let contract = GenArt721Core2PBAB.bind(call.to);

  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
}

export function handleUpdateProjectScriptJSON(
  call: UpdateProjectScriptJSONCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  let scriptJSONRaw = json.fromBytes(
    Bytes.fromUTF8(call.inputs._projectScriptJSON) as Bytes
  );
  if (scriptJSONRaw.kind == JSONValueKind.OBJECT) {
    let scriptJSON = scriptJSONRaw.toObject();

    // Old site used curation_status, new site uses curationStatus
    let curationStatusJSONValue = scriptJSON.get("curation_status");
    if(curationStatusJSONValue) {
      if (curationStatusJSONValue.isNull()) {
        curationStatusJSONValue = scriptJSON.get("curationStatus");
      }

      if (curationStatusJSONValue && curationStatusJSONValue.kind == JSONValueKind.STRING) {
        let curationStatus = curationStatusJSONValue.toString();
        project.curationStatus = curationStatus;
      }
    }
  }

  project.scriptJSON = call.inputs._projectScriptJSON;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectSecondaryMarketRoyaltyPercentage(
  call: UpdateProjectSecondaryMarketRoyaltyPercentageCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.royaltyPercentage = call.inputs._secondMarketRoyalty;
  project.updatedAt = call.block.timestamp;
  project.save();
}

export function handleUpdateProjectWebsite(
  call: UpdateProjectWebsiteCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.website = call.inputs._projectWebsite;
  project.updatedAt = call.block.timestamp;
  project.save();
}
/*** END CALL HANDLERS  ***/

/** HELPERS ***/
function refreshContract(
  contract: GenArt721Core2PBAB,
  timestamp: BigInt
): Contract {
  let admin = contract.admin();
  let renderProviderAddress = contract.renderProviderAddress();
  let renderProviderPercentage = contract.renderProviderPercentage();
  let nextProjectId = contract.nextProjectId();

  let contractEntity = Contract.load(contract._address.toHexString());

  if (contractEntity == null) {
    contractEntity = new Contract(contract._address.toHexString());
    contractEntity.mintWhitelisted = [];
    contractEntity.updatedAt = timestamp;
  }

  contractEntity.admin = admin;
  contractEntity.renderProviderAddress = renderProviderAddress;
  contractEntity.renderProviderPercentage = renderProviderPercentage;
  contractEntity.nextProjectId = nextProjectId;
  contractEntity.randomizerContract = contract.randomizerContract();

  contractEntity.save();

  return contractEntity as Contract;
}

function refreshTokenUri(contract: GenArt721Core2PBAB, tokenId: BigInt): void {
  let tokenURI = contract.tokenURI(tokenId);

  let token = new Token(generateContractSpecificId(contract._address, tokenId));
  token.uri = tokenURI;

  token.save();
}

function refreshProjectScript(
  contract: GenArt721Core2PBAB,
  projectId: BigInt,
  timestamp: BigInt
): void {
  let project = new Project(
    generateContractSpecificId(contract._address, projectId)
  );

  let scriptInfo = contract.projectScriptInfo(projectId);

  let scriptCount = scriptInfo.value1.toI32();
  let scripts: string[] = [];
  for (let i = 0; i < scriptCount; i++) {
    let script = contract.projectScriptByIndex(projectId, BigInt.fromI32(i));

    let projectScriptIndex = BigInt.fromI32(i);
    let projectScript = new ProjectScript(
      generateProjectScriptId(project.id, projectScriptIndex)
    );
    projectScript.script = script;
    projectScript.index = projectScriptIndex;
    projectScript.project = project.id;
    projectScript.save();

    if (script != null && script != "") {
      scripts.push(script);
    }
  }

  let script = scripts.join("");

  project.script = script;
  project.scriptCount = scriptInfo.value1;
  project.updatedAt = timestamp;
  project.scriptUpdatedAt = timestamp;

  project.save();
}

/** END HELPERS ***/