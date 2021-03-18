// We're duplicating a lot of the code from mapping.ts here so
// that we can use the auto-generated types graph-cli codegen
// provides. There are no union types in AssemblyScript so
// we can't use that and then check the address and cast to a
// specific type. Some call signatures are the same so the type
// wouldn't ultimately matter/would be the same but I'd prefer
// to consistently use the generated types for the specific
// contract we're indexing from.

import { BigInt, store } from "@graphprotocol/graph-ts";
import {
  ArtBlocksOriginal as ArtBlocks,
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
} from "../generated/ArtBlocksOriginal/ArtBlocksOriginal";
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
  let projectId = contract.tokenIdToProjectId(event.params._tokenId);
  let project = Project.load(projectId.toString());
  let invocation = project.invocations.plus(BigInt.fromI32(1));

  token.project = projectId.toString();
  token.owner = event.params._to.toHexString();
  // None used more than 1
  token.hash = contract.showTokenHashes(event.params._tokenId)[0];
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
  let token = Token.load(event.params.tokenId.toString());

  // Let mint handle new tokens
  if (token != null) {
    // Update Account <-> Project many-to-many relation
    // table to reflect new account project token balance
    let prevAccountProject = AccountProject.load(
      generateAccountProjectId(event.params.from.toHexString(), token.project)
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

    // Update token owner
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

export function handleAddProject(call: AddProjectCall): void {
  let contract = ArtBlocks.bind(call.to);
  let platform = Platform.load(ARTBLOCKS_PLATFORM_ID);

  if (platform == null) {
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

  let scriptCount = projectScriptInfo.value1;
  let hashesPerToken = projectScriptInfo.value2;
  let paused = projectScriptInfo.value5;

  let project = new Project(id.toString());

  project.index = id;
  project.name = name;
  project.dynamic = dynamic;
  project.artistAddress = artistAddress;
  project.pricePerTokenInWei = pricePerTokenInWei;
  project.invocations = invocations;
  project.maxInvocations = maxInvocations;
  project.scriptCount = scriptCount;
  project.useHashString = hashesPerToken.toI32() > 0;
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

/*** END EVENT HANDLERS ***/

/*** CALL HANDLERS  ***/
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
  platform.whitelisted = platform.whitelisted
    ? platform.whitelisted.filter(address => address !== call.inputs._address)
    : [];
  platform.save();
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

export function handleUpdateProjectHashesGenerated(
  call: UpdateProjectHashesGeneratedCall
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

  let platform = new Platform(ARTBLOCKS_PLATFORM_ID);
  platform.admin = admin;
  platform.artblocksAddress = artblocksAddress;
  platform.artblocksPercentage = artblocksPercentage;
  platform.nextProjectId = nextProjectId;
  platform.whitelisted = [];
  platform.mintWhitelisted = [];

  platform.save();

  return platform;
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
