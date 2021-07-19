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
  ArtBlocks,
  Mint,
  Transfer,
  AddProjectCall,
  AddProjectScriptCall,
  ClearTokenIpfsImageUriCall,
  OverrideTokenDynamicImageWithIpfsLinkCall,
  RemoveProjectLastScriptCall,
  ToggleProjectIsActiveCall,
  ToggleProjectIsDynamicCall,
  ToggleProjectIsLockedCall,
  ToggleProjectIsPausedCall,
  ToggleProjectUseHashStringCall,
  ToggleProjectUseIpfsForStaticCall,
  UpdateProjectAdditionalPayeeInfoCall,
  UpdateProjectArtistAddressCall,
  UpdateProjectArtistNameCall,
  UpdateProjectBaseIpfsURICall,
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
  UpdateArtblocksAddressCall,
  UpdateArtblocksPercentageCall,
  RemoveWhitelistedCall,
  RemoveMintWhitelistedCall
} from "../generated/ArtBlocks/ArtBlocks";
import {
  ArtBlocksPlus,
  PlatformUpdated,
  PlatformWhitelistUpdated,
  ProjectAdded,
  ProjectUpdated
} from "../generated/ArtBlocksPlus/ArtBlocksPlus";

import {
  Project,
  Token,
  Account,
  AccountProject,
  Contract,
  Whitelisting
} from "../generated/schema";
import {
  generateAccountProjectId,
  generateWhitelistingId,
  generateContractSpecificId
} from "./global-helpers";

/*** EVENT HANDLERS ***/
export function handleMint(event: Mint): void {
  let contract = ArtBlocks.bind(event.address);

  let token = new Token(
    generateContractSpecificId(event.address, event.params._tokenId)
  );
  let projectId = generateContractSpecificId(
    event.address,
    event.params._projectId
  );
  let project = Project.load(projectId);
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

export function handleProjectAdded(event: ProjectAdded): void {
  let project = new Project(
    generateContractSpecificId(event.address, event.params._id)
  );

  let contractEntity = new Contract(event.address.toHexString());
  contractEntity.nextProjectId = event.params._id.plus(BigInt.fromI32(1));
  contractEntity.save();
  project.contract = contractEntity.id;

  project.artistAddress = event.params.artistAddress;
  let artist = new Account(event.params.artistAddress.toHexString());
  artist.save();
  project.artist = artist.id;

  project.currencySymbol = event.params.currencySymbol;
  project.dynamic = event.params.dynamic;
  project.maxInvocations = event.params.maxInvocations;
  project.name = event.params.name;
  project.paused = event.params.paused;
  project.pricePerTokenInWei = event.params.pricePerTokenInWei;
  project.useHashString = event.params.useHashString;
  project.active = false;
  project.locked = false;
  project.complete = false;
  project.invocations = BigInt.fromI32(0);
  project.scriptCount = BigInt.fromI32(0);
  project.createdAt = event.block.timestamp;
  project.updatedAt = event.block.timestamp;

  project.save();
}

export function handleProjectUpdated(event: ProjectUpdated): void {
  let contract: ArtBlocksPlus = ArtBlocksPlus.bind(event.address);
  let project = new Project(
    generateContractSpecificId(event.address, event.params._id)
  );
  let id = event.params._id;
  let updates = event.params.updates.split(",");

  let detailsFields: string[] = [
    "name",
    "artistName",
    "description",
    "website",
    "license",
    "dynamic"
  ];

  let tokenInfoFields: string[] = [
    "artistAddress",
    "pricePerTokenInWei",
    "maxInvocations",
    "active",
    "additionalPayee",
    "additionalPayeePercentage",
    "currencySymbol",
    "currencyAddress"
  ];

  let scriptJsonFields: string[] = [
    "scriptJSON",
    "scriptCount",
    "useHashString",
    "ipfsHash",
    "locked",
    "paused"
  ];

  let uriFields: string[] = ["baseUri", "baseIpfsUri", "useIpfs"];

  for (let i = 0; i < updates.length; i++) {
    let update = updates[i];

    if (detailsFields.indexOf(update) > -1) {
      let details = contract.projectDetails(id);
      project.name = details.value0;
      project.artistName = details.value1;
      project.description = details.value2;
      project.website = details.value3;
      project.license = details.value4;
      project.dynamic = details.value5;
      project.useHashString = details.value5;
    } else if (tokenInfoFields.indexOf(update) > -1) {
      let tokenInfo = contract.projectTokenInfo(id);

      project.artistAddress = tokenInfo.value0;
      let artist = new Account(tokenInfo.value0.toHexString());
      artist.save();
      project.artist = artist.id;

      project.pricePerTokenInWei = tokenInfo.value1;
      project.maxInvocations = tokenInfo.value3;
      project.active = tokenInfo.value4;
      project.additionalPayee = tokenInfo.value5;
      project.additionalPayeePercentage = tokenInfo.value6;
      project.currencySymbol = tokenInfo.value7;
      project.currencyAddress = tokenInfo.value8;
    } else if (scriptJsonFields.indexOf(update) > -1) {
      let scriptInfo = contract.projectScriptInfo(id);
      project.scriptJSON = scriptInfo.value0;
      project.scriptCount = scriptInfo.value1;
      project.useHashString = scriptInfo.value2;
      project.ipfsHash = scriptInfo.value3;
      project.locked = scriptInfo.value4;
      project.paused = scriptInfo.value5;
    } else if (update == "script") {
      refreshProjectScript(contract as ArtBlocks, id, event.block.timestamp);
    } else if (update == "royaltyPercentage") {
      project.royaltyPercentage = contract.projectIdToSecondaryMarketRoyaltyPercentage(
        id
      );
    } else if (uriFields.indexOf(update) > -1) {
      let uriInfo = contract.projectURIInfo(id);
      project.baseUri = uriInfo.value0;
      project.baseIpfsUri = uriInfo.value1;
      project.useIpfs = uriInfo.value2;
    }
  }

  project.save();
}

export function handlePlatformUpdated(event: PlatformUpdated): void {
  let contractEntity = new Contract(event.address.toHexString());
  let contract = ArtBlocksPlus.bind(event.address);
  let field = event.params.field;

  if (field == "artblocksAddress") {
    contractEntity.artblocksAddress = contract.artblocksAddress();
  } else if (field == "artblocksPercentage") {
    contractEntity.artblocksPercentage = contract.artblocksPercentage();
  } else if (field == "randomizerContract") {
    contractEntity.randomizerContract = contract.randomizerContract();
  }

  contractEntity.save();
}

export function handlePlatformWhitelistUpdated(
  event: PlatformWhitelistUpdated
): void {
  let contract = ArtBlocksPlus.bind(event.address);
  let contractEntity = refreshContract(contract as ArtBlocks);
  let update = event.params.update;

  if (update == "addWhitelisted") {
    let whitelisting = new Whitelisting(
      generateWhitelistingId(contractEntity.id, event.params.addr.toString())
    );
    whitelisting.save();
  } else if (update == "removeWhitelisted") {
    let whitelisting = Whitelisting.load(
      generateWhitelistingId(contractEntity.id, event.params.addr.toString())
    );

    if (whitelisting) {
      store.remove("Whitelisting", whitelisting.id);
    }
  } else if (update == "addMintWhitelisted") {
    contractEntity.mintWhitelisted = contractEntity.mintWhitelisted
      ? contractEntity.mintWhitelisted.concat([event.params.addr])
      : [event.params.addr];
  } else if (update == "removeMintWhitelisted") {
    let mintWhitelisted: Bytes[] = contractEntity.mintWhitelisted;
    let newMintWhitelisted: Bytes[] = [];
    for (let i = 0; i < mintWhitelisted.length; i++) {
      if ((mintWhitelisted[i] as Bytes) != event.address) {
        newMintWhitelisted.push(mintWhitelisted[i]);
      }
    }
    contractEntity.mintWhitelisted = newMintWhitelisted;
  }

  contractEntity.save();
}
/*** END EVENT HANDLERS ***/

/*** CALL HANDLERS  (Mainnet Only) ***/
export function handleAddProject(call: AddProjectCall): void {
  let contract = ArtBlocks.bind(call.to);
  let contractEntity = Contract.load(call.to.toHexString());

  let projectId: BigInt;
  if (contractEntity == null) {
    contractEntity = refreshContract(contract);
    // In this case nextProjectId has already been incremented
    projectId = contractEntity.nextProjectId.minus(BigInt.fromI32(1));
  } else {
    projectId = contractEntity.nextProjectId;
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
  let currencySymbol = projectTokenInfo.value7;

  let scriptCount = projectScriptInfo.value1;
  let useHashString = projectScriptInfo.value2;
  let paused = projectScriptInfo.value5;

  let project = new Project(generateContractSpecificId(call.to, projectId));

  project.contract = contractEntity.id;
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
  project.createdAt = call.block.timestamp;
  project.updatedAt = call.block.timestamp;

  project.save();

  contractEntity.nextProjectId = contractEntity.nextProjectId.plus(
    BigInt.fromI32(1)
  );
  contractEntity.save();
}

export function handleAddWhitelisted(call: AddWhitelistedCall): void {
  let contract = ArtBlocks.bind(call.to);
  let contractEntity = refreshContract(contract);

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
  let contract = ArtBlocks.bind(call.to);

  let contractEntity = refreshContract(contract);
  let account = new Account(call.inputs._address.toHexString());

  let whitelistingId = generateWhitelistingId(contractEntity.id, account.id);
  let whitelisting = Whitelisting.load(whitelistingId);

  if (whitelisting != null) {
    store.remove("Whitelisting", whitelistingId);
  }
}

export function handleAddMintWhitelisted(call: AddMintWhitelistedCall): void {
  let contract = ArtBlocks.bind(call.to);

  let contractEntity = refreshContract(contract);
  contractEntity.mintWhitelisted = contractEntity.mintWhitelisted
    ? contractEntity.mintWhitelisted.concat([call.inputs._address])
    : [call.inputs._address];
  contractEntity.save();
}

export function handleRemoveMintWhitelisted(
  call: RemoveMintWhitelistedCall
): void {
  let contract = ArtBlocks.bind(call.to);

  let contractEntity = refreshContract(contract);
  let mintWhitelisted = contractEntity.mintWhitelisted;
  let newMintWhitelisted: Bytes[] = [];
  for (let i = 0; i < mintWhitelisted.length; i++) {
    if ((mintWhitelisted[i] as Bytes) != call.inputs._address) {
      newMintWhitelisted.push(mintWhitelisted[i]);
    }
  }
  contractEntity.mintWhitelisted = newMintWhitelisted;

  contractEntity.save();
}

export function handleUpdateRandomizerAddress(
  call: UpdateRandomizerAddressCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshContract(contract);
}

export function handleUpdateArtblocksAddress(
  call: UpdateArtblocksAddressCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshContract(contract);
}

export function handleUpdateArtblocksPercentage(
  call: UpdateArtblocksPercentageCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshContract(contract);
}

export function handleAddProjectScript(call: AddProjectScriptCall): void {
  let contract = ArtBlocks.bind(call.to);
  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
}

export function handleClearTokenIpfsImageUri(
  call: ClearTokenIpfsImageUriCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshTokenUri(contract, call.inputs._tokenId);
}

export function handleOverrideTokenDynamicImageWithIpfsLink(
  call: OverrideTokenDynamicImageWithIpfsLinkCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshTokenUri(contract, call.inputs._tokenId);
}

export function handleRemoveProjectLastScript(
  call: RemoveProjectLastScriptCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
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

export function handleToggleProjectIsDynamic(
  call: ToggleProjectIsDynamicCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project != null && project.contract == call.to.toHexString()) {
    project.dynamic = !project.dynamic;
    project.useHashString = !project.dynamic;
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

export function handleToggleProjectUseHashString(
  call: ToggleProjectUseHashStringCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project != null && project.contract == call.to.toHexString()) {
    project.useHashString = !project.useHashString;
    project.save();
  }
}

export function handleToggleProjectUseIpfsForStatic(
  call: ToggleProjectUseIpfsForStaticCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project != null && project.contract == call.to.toHexString()) {
    project.useIpfs = !project.useIpfs;
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

export function handleUpdateProjectBaseIpfsURI(
  call: UpdateProjectBaseIpfsURICall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.baseIpfsUri = call.inputs._projectBaseIpfsURI;
  project.save();
}

export function handleUpdateProjectBaseURI(
  call: UpdateProjectBaseURICall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.baseUri = call.inputs._newBaseURI;
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
  project.save();
}

export function handleUpdateProjectIpfsHash(
  call: UpdateProjectIpfsHashCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.ipfsHash = call.inputs._ipfsHash;
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
  let contract = ArtBlocks.bind(call.to);

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
    if (curationStatusJSONValue.isNull()) {
      curationStatusJSONValue = scriptJSON.get("curationStatus");
    }

    if (curationStatusJSONValue.kind == JSONValueKind.STRING) {
      let curationStatus = curationStatusJSONValue.toString();
      project.curationStatus = curationStatus;
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
  project.save();
}

export function handleUpdateProjectWebsite(
  call: UpdateProjectWebsiteCall
): void {
  let project = new Project(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  project.website = call.inputs._projectWebsite;
  project.save();
}
/*** END CALL HANDLERS  ***/

/** HELPERS ***/
function refreshContract(contract: ArtBlocks): Contract {
  let admin = contract.admin();
  let artblocksAddress = contract.artblocksAddress();
  let artblocksPercentage = contract.artblocksPercentage();
  let nextProjectId = contract.nextProjectId();

  let contractEntity = Contract.load(contract._address.toHexString());

  if (contractEntity == null) {
    contractEntity = new Contract(contract._address.toHexString());
    contractEntity.mintWhitelisted = [];
  }

  contractEntity.admin = admin;
  contractEntity.artblocksAddress = artblocksAddress;
  contractEntity.artblocksPercentage = artblocksPercentage;
  contractEntity.nextProjectId = nextProjectId;
  contractEntity.randomizerContract = contract.randomizerContract();

  contractEntity.save();

  return contractEntity as Contract;
}

function refreshTokenUri(contract: ArtBlocks, tokenId: BigInt): void {
  let tokenURI = contract.tokenURI(tokenId);

  let token = new Token(generateContractSpecificId(contract._address, tokenId));
  token.uri = tokenURI;

  token.save();
}

function refreshProjectScript(
  contract: ArtBlocks,
  projectId: BigInt,
  timestamp: BigInt
): void {
  let scriptInfo = contract.projectScriptInfo(projectId);

  let scriptCount = scriptInfo.value1.toI32();
  let scripts: string[] = [];
  for (let i = 0; i < scriptCount; i++) {
    let script = contract.projectScriptByIndex(projectId, BigInt.fromI32(i));
    scripts.push(script);
  }

  let script = scripts.join("");

  let project = new Project(
    generateContractSpecificId(contract._address, projectId)
  );
  project.script = script;
  project.scriptCount = scriptInfo.value1;
  project.updatedAt = timestamp;
  project.scriptUpdatedAt = timestamp;

  project.save();
}

/** END HELPERS ***/
