// We're duplicating a lot of the code from mapping.ts here so
// that we can use the auto-generated types graph-cli codegen
// provides. There are no union types in AssemblyScript so
// we can't use that and then check the address and cast to a
// specific type. Some call signatures are the same so the type
// wouldn't ultimately matter/would be the same but I'd prefer
// to consistently use the generated types for the specific
// contract we're indexing from.

import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  json,
  JSONValueKind,
  log,
  store
} from "@graphprotocol/graph-ts";
import {
  GenArt721,
  Mint,
  Transfer,
  AddProjectCall,
  AddProjectScriptCall,
  ClearTokenIpfsImageUriCall,
  OverrideTokenDynamicImageWithIpfsLinkCall,
  ToggleProjectIsActiveCall,
  ToggleProjectIsDynamicCall,
  ToggleProjectIsLockedCall,
  ToggleProjectIsPausedCall,
  ToggleProjectUseIpfsForStaticCall,
  UpdateProjectAdditionalPayeeInfoCall,
  UpdateProjectArtistAddressCall,
  UpdateProjectArtistNameCall,
  UpdateProjectBaseIpfsURICall,
  UpdateProjectBaseURICall,
  UpdateProjectDescriptionCall,
  UpdateProjectHashesGeneratedCall,
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
  UpdateArtblocksAddressCall,
  UpdateArtblocksPercentageCall,
  RemoveWhitelistedCall,
  RemoveProjectLastScriptCall
} from "../generated/GenArt721/GenArt721";
import {
  Project,
  Token,
  Contract,
  Account,
  AccountProject,
  Whitelisting,
  ProjectScript
} from "../generated/schema";
import {
  generateAccountProjectId,
  generateWhitelistingId,
  generateContractSpecificId
} from "./helpers";
import { generateProjectScriptId } from "./helpers";

/*** EVENT HANDLERS ***/
export function handleMint(event: Mint): void {
  let contract = GenArt721.bind(event.address);
  let projectId = generateContractSpecificId(
    event.address,
    event.params._projectId
  );

  let project = Project.load(projectId);
  if (project) {
    let invocation = project.invocations;

    let token = new Token(
      generateContractSpecificId(event.address, event.params._tokenId)
    );

    token.project = projectId;
    token.tokenId = event.params._tokenId;
    token.contract = event.address.toHexString();
    token.owner = event.params._to.toHexString();
    // None used more than 1
    token.hash = contract.showTokenHashes(event.params._tokenId)[0];
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
  let token = Token.load(
    generateContractSpecificId(event.address, event.params.tokenId)
  );

  // Let mint handle new tokens
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

    // Update token owner
    token.owner = event.params.to.toHexString();
    token.updatedAt = event.block.timestamp;
    token.save();
  }
}

/*** END EVENT HANDLERS ***/

/*** CALL HANDLERS  ***/
export function handleAddProject(call: AddProjectCall): void {
  let contract = GenArt721.bind(call.to);
  let contractEntity = Contract.load(call.to.toHexString());

  let projectId: BigInt;
  if (!contractEntity) {
    contractEntity = refreshContract(contract, call.block.timestamp);
    // In this case nextProjectId has already been incremented
    projectId = contractEntity.nextProjectId.minus(BigInt.fromI32(1));
  } else {
    projectId = contractEntity.nextProjectId;
    contractEntity.nextProjectId = contractEntity.nextProjectId.plus(
      BigInt.fromI32(1)
    );
  }

  let projectDetails = contract.projectDetails(projectId);
  let projectTokenInfo = contract.projectTokenInfo(projectId);
  let projectScriptInfo = contract.projectScriptInfo(projectId);

  let name = projectDetails.value0;
  let dynamic = projectDetails.value5;

  let artistAddress = projectTokenInfo.value0;
  let artist = new Account(artistAddress.toHexString());
  artist.save();

  let pricePerTokenInWei = projectTokenInfo.value1;
  let invocations = projectTokenInfo.value2;
  let maxInvocations = projectTokenInfo.value3;

  let scriptCount = projectScriptInfo.value1;
  let hashesPerToken = projectScriptInfo.value2;
  let paused = projectScriptInfo.value5;

  let project = new Project(generateContractSpecificId(call.to, projectId));
  project.active = false;
  project.artist = artist.id;
  project.artistAddress = artistAddress;
  project.complete = false;
  project.contract = contractEntity.id;
  project.createdAt = call.block.timestamp;
  project.currencyAddress = Address.zero();
  project.currencySymbol = "ETH";
  project.dynamic = dynamic;
  project.invocations = invocations;
  project.locked = false;
  project.maxInvocations = maxInvocations;
  project.name = name;
  project.paused = paused;
  project.pricePerTokenInWei = pricePerTokenInWei;
  project.projectId = projectId;
  project.scriptCount = scriptCount;
  project.updatedAt = call.block.timestamp;
  project.useHashString = hashesPerToken.toI32() > 0;
  project.useIpfs = false;
  project.save();

  contractEntity.updatedAt = call.block.timestamp;
  contractEntity.save();
}

export function handleAddWhitelisted(call: AddWhitelistedCall): void {
  let contract = GenArt721.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  let account = new Account(call.inputs._address.toHexString());
  account.save();

  let whitelisting = new Whitelisting(
    generateWhitelistingId(contractEntity.id, account.id)
  );
  whitelisting.account = account.id;
  whitelisting.contract = contractEntity.id;

  whitelisting.save();
}

export function handleRemoveWhitelisted(call: RemoveWhitelistedCall): void {
  let contract = GenArt721.bind(call.to);

  let contractEntity = refreshContract(contract, call.block.timestamp);
  let account = new Account(call.inputs._address.toHexString());

  let whitelistingId = generateWhitelistingId(contractEntity.id, account.id);
  let whitelisting = Whitelisting.load(whitelistingId);

  if (whitelisting) {
    store.remove("Whitelisting", whitelistingId);
  }
}

export function handleUpdateArtblocksAddress(
  call: UpdateArtblocksAddressCall
): void {
  let contract = GenArt721.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleUpdateArtblocksPercentage(
  call: UpdateArtblocksPercentageCall
): void {
  let contract = GenArt721.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleAddProjectScript(call: AddProjectScriptCall): void {
  let contract = GenArt721.bind(call.to);
  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
}

export function handleClearTokenIpfsImageUri(
  call: ClearTokenIpfsImageUriCall
): void {
  let contract = GenArt721.bind(call.to);
  refreshTokenUri(contract, call.inputs._tokenId);
}

export function handleOverrideTokenDynamicImageWithIpfsLink(
  call: OverrideTokenDynamicImageWithIpfsLinkCall
): void {
  let contract = GenArt721.bind(call.to);
  refreshTokenUri(contract, call.inputs._tokenId);
}

export function handleRemoveProjectLastScript(
  call: RemoveProjectLastScriptCall
): void {
  let contract = GenArt721.bind(call.to);
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
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

  if (project && project.contract == call.to.toHexString()) {
    project.active = !project.active;
    project.activatedAt = project.active ? call.block.timestamp : null;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleToggleProjectIsDynamic(
  call: ToggleProjectIsDynamicCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project && project.contract == call.to.toHexString()) {
    project.dynamic = !project.dynamic;
    project.useHashString = project.dynamic;
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

  if (project && project.contract == call.to.toHexString()) {
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

  if (project && project.contract == call.to.toHexString()) {
    project.paused = !project.paused;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectHashesGenerated(
  call: UpdateProjectHashesGeneratedCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project && project.contract == call.to.toHexString()) {
    project.useHashString = call.inputs._hashes.gt(BigInt.fromI32(0));
    project.save();
  }
}

export function handleToggleProjectUseIpfsForStatic(
  call: ToggleProjectUseIpfsForStaticCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project && project.contract == call.to.toHexString()) {
    project.useIpfs = !project.useIpfs;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectAdditionalPayeeInfo(
  call: UpdateProjectAdditionalPayeeInfoCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project && project.contract == call.to.toHexString()) {
    project.additionalPayee = call.inputs._additionalPayee;
    project.additionalPayeePercentage = call.inputs._additionalPayeePercentage;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectArtistAddress(
  call: UpdateProjectArtistAddressCall
): void {
  let artist = new Account(call.inputs._artistAddress.toHexString());
  artist.save();

  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.artistAddress = call.inputs._artistAddress;
    project.artist = artist.id;
    project.updatedAt = call.block.timestamp;

    project.save();
  }
}

export function handleUpdateProjectArtistName(
  call: UpdateProjectArtistNameCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.artistName = call.inputs._projectArtistName;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectBaseIpfsURI(
  call: UpdateProjectBaseIpfsURICall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.baseIpfsUri = call.inputs._projectBaseIpfsURI;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectBaseURI(
  call: UpdateProjectBaseURICall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.baseUri = call.inputs._newBaseURI;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectDescription(
  call: UpdateProjectDescriptionCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.description = call.inputs._projectDescription;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectIpfsHash(
  call: UpdateProjectIpfsHashCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.ipfsHash = call.inputs._ipfsHash;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectLicense(
  call: UpdateProjectLicenseCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.license = call.inputs._projectLicense;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectMaxInvocations(
  call: UpdateProjectMaxInvocationsCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project) {
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
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.name = call.inputs._projectName;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectPricePerTokenInWei(
  call: UpdateProjectPricePerTokenInWeiCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.pricePerTokenInWei = call.inputs._pricePerTokenInWei;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectScript(call: UpdateProjectScriptCall): void {
  let contract = GenArt721.bind(call.to);

  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
}

export function handleUpdateProjectScriptJSON(
  call: UpdateProjectScriptJSONCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    let jsonResult = json.try_fromBytes(
      changetype<Bytes>(ByteArray.fromUTF8(call.inputs._projectScriptJSON))
    );

    if (jsonResult.isError) {
      log.warning("Invalid scriptJSON added for project {}", [project.id]);
      return;
    }

    let scriptJSONRaw = jsonResult.value;

    if (scriptJSONRaw.kind == JSONValueKind.OBJECT) {
      let scriptJSON = scriptJSONRaw.toObject();
      let curationStatusJSONValue = scriptJSON.get("curation_status");

      if (
        curationStatusJSONValue &&
        curationStatusJSONValue.kind == JSONValueKind.STRING
      ) {
        let curationStatus = curationStatusJSONValue.toString();
        project.curationStatus = curationStatus;
      }
    }

    project.scriptJSON = call.inputs._projectScriptJSON;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectSecondaryMarketRoyaltyPercentage(
  call: UpdateProjectSecondaryMarketRoyaltyPercentageCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.royaltyPercentage = call.inputs._secondMarketRoyalty;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}

export function handleUpdateProjectWebsite(
  call: UpdateProjectWebsiteCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );
  if (project) {
    project.website = call.inputs._projectWebsite;
    project.updatedAt = call.block.timestamp;
    project.save();
  }
}
/*** END CALL HANDLERS  ***/

/** HELPERS ***/
function refreshContract(contract: GenArt721, timestamp: BigInt): Contract {
  let admin = contract.admin();
  let artblocksAddress = contract.artblocksAddress();
  let artblocksPercentage = contract.artblocksPercentage();
  let nextProjectId = contract.nextProjectId();

  let contractEntity = Contract.load(contract._address.toHexString());
  if (!contractEntity) {
    contractEntity = new Contract(contract._address.toHexString());
    contractEntity.createdAt = timestamp;
    contractEntity.mintWhitelisted = [];
  }
  contractEntity.admin = admin;
  contractEntity.renderProviderAddress = artblocksAddress;
  contractEntity.renderProviderPercentage = artblocksPercentage;
  contractEntity.nextProjectId = nextProjectId;
  contractEntity.updatedAt = timestamp;

  contractEntity.save();

  return contractEntity as Contract;
}

function refreshTokenUri(contract: GenArt721, tokenId: BigInt): void {
  let tokenURI = contract.tokenURI(tokenId);

  let token = Token.load(
    generateContractSpecificId(contract._address, tokenId)
  );
  if (token) {
    token.uri = tokenURI;
    token.save();
  }
}

function refreshProjectScript(
  contract: GenArt721,
  projectId: BigInt,
  timestamp: BigInt
): void {
  let project = Project.load(
    generateContractSpecificId(contract._address, projectId)
  );
  if (project) {
    let scriptInfo = contract.projectScriptInfo(projectId);

    let scriptCount = scriptInfo.value1.toI32();
    let scripts: string[] = [];
    for (let i = 0; i < scriptCount; i++) {
      let script = contract.projectScriptByIndex(projectId, BigInt.fromI32(i));

      let projectScriptIndex = BigInt.fromI32(i);
      let projectScript = new ProjectScript(
        generateProjectScriptId(project.id, projectScriptIndex)
      );
      projectScript.index = projectScriptIndex;
      projectScript.project = project.id;
      projectScript.script = script;
      projectScript.save();

      if (script && script != "") {
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
}

/** END HELPERS ***/
