import { BigInt, Bytes, store } from "@graphprotocol/graph-ts";
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
  Platform,
  OSSaleEntry,
  OSSaleWrapper,
  Account,
  AccountProject
} from "../generated/schema";
import {
  ARTBLOCKS_PLATFORM_ID,
  WYVERN_ATOMICIZER_ADDRESS,
  WYVERN_EXCHANGE_ADDRESS
} from "./constants";
import { generateAccountProjectId } from "./global-helpers";

/*** EVENT HANDLERS ***/
export function handleMint(event: Mint): void {
  let contract = ArtBlocks.bind(event.address);

  let token = new Token(event.params._tokenId.toString());
  let projectId = event.params._projectId;
  let project = Project.load(projectId.toString());
  let invocation = project.invocations.plus(BigInt.fromI32(1));

  token.project = projectId.toString();
  token.owner = event.params._to.toHexString();
  token.hash = contract.tokenIdToHash(event.params._tokenId);
  token.invocation = invocation;
  token.createdAt = event.block.timestamp;
  token.save();

  project.invocations = invocation;
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
  let token = Token.load(event.params.tokenId.toString());

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
    token.save();
  }

  // If the transfer event is raised because of a transaction sent to Open Sea
  // create a new OSSaleEntry and update/create its associated OSSaleWrapper
  let txSentTo = event.transaction.to.toHexString();
  if (
    txSentTo == WYVERN_EXCHANGE_ADDRESS ||
    txSentTo == WYVERN_ATOMICIZER_ADDRESS
  ) {
    handleOpenSeaSale(event);
  }
}

export function handleProjectAdded(event: ProjectAdded): void {
  let project = new Project(event.params._id.toString());
  project.artistAddress = event.params.artistAddress;
  project.currencySymbol = event.params.currencySymbol;
  project.dynamic = event.params.dynamic;
  project.maxInvocations = event.params.maxInvocations;
  project.name = event.params.name;
  project.paused = event.params.paused;
  project.pricePerTokenInWei = event.params.pricePerTokenInWei;
  project.useHashString = event.params.useHashString;
  project.active = false;
  project.locked = false;
  project.invocations = BigInt.fromI32(0);
  project.scriptCount = BigInt.fromI32(0);
  project.osTotalVolumeInWei = BigInt.fromI32(0);
  project.createdAt = event.block.timestamp;
  project.updatedAt = event.block.timestamp;

  project.save();
}

export function handleProjectUpdated(event: ProjectUpdated): void {
  let contract: ArtBlocksPlus = ArtBlocksPlus.bind(event.address);
  let project = new Project(event.params._id.toString());
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
  let platform = new Platform(ARTBLOCKS_PLATFORM_ID);
  let contract = ArtBlocksPlus.bind(event.address);
  let field = event.params.field;

  if (field == "artblocksAddress") {
    platform.artblocksAddress = contract.artblocksAddress();
  } else if (field == "artblocksPercentage") {
    platform.artblocksPercentage = contract.artblocksPercentage();
  } else if (field == "randomizerContract") {
    platform.randomizerContract = contract.randomizerContract();
  }
}

export function handlePlatformWhitelistUpdated(
  event: PlatformWhitelistUpdated
): void {
  let contract = ArtBlocksPlus.bind(event.address);
  let platform = refreshPlatform(contract as ArtBlocks);
  let update = event.params.update;

  if (update == "addWhitelisted") {
    platform.whitelisted = platform.whitelisted
      ? platform.whitelisted.concat([event.params.addr])
      : [event.params.addr];
  } else if (update == "removeWhitelisted") {
    let whitelisted: Bytes[] = platform.whitelisted;
    let newWhitelisted: Bytes[] = [];
    for (let i = 0; i < whitelisted.length; i++) {
      if ((whitelisted[i] as Bytes) != event.address) {
        newWhitelisted.push(whitelisted[i]);
      }
    }
    platform.whitelisted = newWhitelisted;
  } else if (update == "addMintWhitelisted") {
    platform.mintWhitelisted = platform.mintWhitelisted
      ? platform.mintWhitelisted.concat([event.params.addr])
      : [event.params.addr];
  } else if (update == "removeMintWhitelisted") {
    let mintWhitelisted: Bytes[] = platform.mintWhitelisted;
    let newMintWhitelisted: Bytes[] = [];
    for (let i = 0; i < mintWhitelisted.length; i++) {
      if ((mintWhitelisted[i] as Bytes) != event.address) {
        newMintWhitelisted.push(mintWhitelisted[i]);
      }
    }
    platform.mintWhitelisted = newMintWhitelisted;
  }

  platform.save();
}
/*** END EVENT HANDLERS ***/

/*** CALL HANDLERS  (Mainnet Only) ***/
export function handleAddProject(call: AddProjectCall): void {
  let contract = ArtBlocks.bind(call.to);

  let platform = Platform.load(ARTBLOCKS_PLATFORM_ID);

  if (platform === null) {
    platform = refreshPlatform(contract);
  }

  let id = platform.nextProjectId;

  let projectDetails = contract.projectDetails(id);
  let projectTokenInfo = contract.projectTokenInfo(id);
  let projectScriptInfo = contract.projectScriptInfo(id);

  let name = projectDetails.value0;
  let dynamic = projectDetails.value5;

  let artistAddress = projectTokenInfo.value0;
  let pricePerTokenInWei = projectTokenInfo.value1;
  let invocations = projectTokenInfo.value2;
  let maxInvocations = projectTokenInfo.value3;
  let currencySymbol = projectTokenInfo.value7;

  let scriptCount = projectScriptInfo.value1;
  let useHashString = projectScriptInfo.value2;
  let paused = projectScriptInfo.value5;

  let project = new Project(id.toString());

  project.index = id;
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
  project.osTotalVolumeInWei = BigInt.fromI32(0);
  project.createdAt = call.block.timestamp;
  project.updatedAt = call.block.timestamp;

  project.save();

  platform.nextProjectId = platform.nextProjectId.plus(BigInt.fromI32(1));
  platform.save();
}

export function handleAddWhitelisted(call: AddWhitelistedCall): void {
  let contract = ArtBlocks.bind(call.to);

  let platform = refreshPlatform(contract);
  platform.whitelisted = platform.whitelisted
    ? platform.whitelisted.concat([call.inputs._address])
    : [call.inputs._address];
  platform.save();
}

export function handleRemoveWhitelisted(call: RemoveWhitelistedCall): void {
  let contract = ArtBlocks.bind(call.to);

  let platform = refreshPlatform(contract);
  let whitelisted = platform.whitelisted;
  let newWhitelisted: Bytes[] = [];
  for (let i = 0; i < whitelisted.length; i++) {
    if (whitelisted[i] != call.inputs._address) {
      newWhitelisted.push(newWhitelisted[i]);
    }
  }
  platform.whitelisted = newWhitelisted;
}

export function handleAddMintWhitelisted(call: AddMintWhitelistedCall): void {
  let contract = ArtBlocks.bind(call.to);

  let platform = refreshPlatform(contract);
  platform.mintWhitelisted = platform.mintWhitelisted
    ? platform.mintWhitelisted.concat([call.inputs._address])
    : [call.inputs._address];
  platform.save();
}

export function handleRemoveMintWhitelisted(
  call: RemoveMintWhitelistedCall
): void {
  let contract = ArtBlocks.bind(call.to);

  let platform = refreshPlatform(contract);
  let mintWhitelisted = platform.mintWhitelisted;
  let newMintWhitelisted: Bytes[] = [];
  for (let i = 0; i < mintWhitelisted.length; i++) {
    if ((mintWhitelisted[i] as Bytes) != call.inputs._address) {
      newMintWhitelisted.push(mintWhitelisted[i]);
    }
  }
  platform.mintWhitelisted = newMintWhitelisted;

  platform.save();
}

export function handleUpdateRandomizerAddress(
  call: UpdateRandomizerAddressCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshPlatform(contract);
}

export function handleUpdateArtblocksAddress(
  call: UpdateArtblocksAddressCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshPlatform(contract);
}

export function handleUpdateArtblocksPercentage(
  call: UpdateArtblocksPercentageCall
): void {
  let contract = ArtBlocks.bind(call.to);
  refreshPlatform(contract);
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
  let project = Project.load(call.inputs._projectId.toString());

  if (project != null) {
    project.active = !project.active;
    project.save();
  }
}

export function handleToggleProjectIsDynamic(
  call: ToggleProjectIsDynamicCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  if (project != null) {
    project.dynamic = !project.dynamic;
    project.useHashString = !project.dynamic;
    project.save();
  }
}

export function handleToggleProjectIsLocked(
  call: ToggleProjectIsLockedCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  if (project != null) {
    project.locked = !project.locked;
    project.save();
  }
}

export function handleToggleProjectIsPaused(
  call: ToggleProjectIsPausedCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  if (project != null) {
    project.paused = !project.locked;
    project.save();
  }
}

export function handleToggleProjectUseHashString(
  call: ToggleProjectUseHashStringCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  if (project != null) {
    project.useHashString = !project.useHashString;
    project.save();
  }
}

export function handleToggleProjectUseIpfsForStatic(
  call: ToggleProjectUseIpfsForStaticCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  if (project != null) {
    project.useIpfs = !project.useIpfs;
    project.save();
  }
}

export function handleUpdateProjectAdditionalPayeeInfo(
  call: UpdateProjectAdditionalPayeeInfoCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.additionalPayee = call.inputs._additionalPayee;
  project.additionalPayeePercentage = call.inputs._additionalPayeePercentage;
  project.save();
}

export function handleUpdateProjectArtistAddress(
  call: UpdateProjectArtistAddressCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.artistAddress = call.inputs._artistAddress;
  project.save();
}

export function handleUpdateProjectArtistName(
  call: UpdateProjectArtistNameCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.artistName = call.inputs._projectArtistName;
  project.save();
}

export function handleUpdateProjectBaseIpfsURI(
  call: UpdateProjectBaseIpfsURICall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.baseIpfsUri = call.inputs._projectBaseIpfsURI;
  project.save();
}

export function handleUpdateProjectBaseURI(
  call: UpdateProjectBaseURICall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.baseUri = call.inputs._newBaseURI;
  project.save();
}

export function handleUpdateProjectCurrencyInfo(
  call: UpdateProjectCurrencyInfoCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.currencySymbol = call.inputs._currencySymbol;
  project.currencyAddress = call.inputs._currencyAddress;

  project.save();
}

export function handleUpdateProjectDescription(
  call: UpdateProjectDescriptionCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.description = call.inputs._projectDescription;
  project.save();
}

export function handleUpdateProjectIpfsHash(
  call: UpdateProjectIpfsHashCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.ipfsHash = call.inputs._ipfsHash;
  project.save();
}

export function handleUpdateProjectLicense(
  call: UpdateProjectLicenseCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.license = call.inputs._projectLicense;
  project.save();
}

export function handleUpdateProjectMaxInvocations(
  call: UpdateProjectMaxInvocationsCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.maxInvocations = call.inputs._maxInvocations;
  project.save();
}

export function handleUpdateProjectName(call: UpdateProjectNameCall): void {
  let project = new Project(call.inputs._projectId.toString());

  project.name = call.inputs._projectName;
  project.save();
}

export function handleUpdateProjectPricePerTokenInWei(
  call: UpdateProjectPricePerTokenInWeiCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.pricePerTokenInWei = call.inputs._pricePerTokenInWei;
  project.save();
}

export function handleUpdateProjectScript(call: UpdateProjectScriptCall): void {
  let contract = ArtBlocks.bind(call.to);

  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
}

export function handleUpdateProjectScriptJSON(
  call: UpdateProjectScriptJSONCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.scriptJSON = call.inputs._projectScriptJSON;
  project.save();
}

export function handleUpdateProjectSecondaryMarketRoyaltyPercentage(
  call: UpdateProjectSecondaryMarketRoyaltyPercentageCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.royaltyPercentage = call.inputs._secondMarketRoyalty;
  project.save();
}

export function handleUpdateProjectWebsite(
  call: UpdateProjectWebsiteCall
): void {
  let project = new Project(call.inputs._projectId.toString());

  project.website = call.inputs._projectWebsite;
  project.save();
}
/*** END CALL HANDLERS  ***/

/** HELPERS ***/
function refreshPlatform(contract: ArtBlocks): Platform {
  let admin = contract.admin();
  let artblocksAddress = contract.artblocksAddress();
  let artblocksPercentage = contract.artblocksPercentage();
  let nextProjectId = contract.nextProjectId();

  let platform = Platform.load(ARTBLOCKS_PLATFORM_ID);

  if (platform == null) {
    platform = new Platform(ARTBLOCKS_PLATFORM_ID);
    platform.mintWhitelisted = [];
    platform.whitelisted = [];
  }

  platform.admin = admin;
  platform.artblocksAddress = artblocksAddress;
  platform.artblocksPercentage = artblocksPercentage;
  platform.nextProjectId = nextProjectId;
  platform.randomizerContract = contract.randomizerContract();

  platform.save();

  return platform as Platform;
}

function refreshTokenUri(contract: ArtBlocks, tokenId: BigInt): void {
  let tokenURI = contract.tokenURI(tokenId);

  let token = new Token(tokenId.toString());
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

  let script = scripts.join(" ");

  let project = new Project(projectId.toString());
  project.script = script;
  project.scriptCount = scriptInfo.value1;
  project.updatedAt = timestamp;

  project.save();
}

function handleOpenSeaSale(event: Transfer): void {
  // Create a new SaleEntry
  let saleEntry = new OSSaleEntry(
    event.transaction.hash.toHexString() + event.logIndex.toString()
  );

  // Fetch the associated sale wrapper
  let saleWrapper = OSSaleWrapper.load(event.transaction.hash.toHexString());
  if (saleWrapper != null) {
    // Several Transfer events for the same tx
    // This is a bundle sale
    saleWrapper.isBundle = true;
  } else {
    // If none create it
    saleWrapper = new OSSaleWrapper(event.transaction.hash.toHexString());

    saleWrapper.timestamp = event.block.timestamp;
    saleWrapper.from = event.params.from;
    saleWrapper.to = event.params.to;
    saleWrapper.isBundle = false;
  }

  saleEntry.osSaleWrapper = saleWrapper.id;

  let tokenId = event.params.tokenId.toString();
  saleEntry.token = tokenId;

  // Here we fill the associatedProjectsIds of the OSSaleWrapper
  // This is needed to then slipt the ETH price of the sale
  // accross the different projects in case of bundle sale
  let token = Token.load(tokenId);
  // Should always be the case
  if (token != null) {
    if (saleWrapper.associatedProjectsIds == null) {
      saleWrapper.associatedProjectsIds = [token.project];
    } else {
      let associatedProjectsIds = saleWrapper.associatedProjectsIds;
      associatedProjectsIds.push(token.project);
      saleWrapper.associatedProjectsIds = associatedProjectsIds;
    }
  }

  saleEntry.save();
  saleWrapper.save();
}
/** END HELPERS ***/
