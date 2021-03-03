import { BigInt } from "@graphprotocol/graph-ts";
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

import { Project, Token, Platform, OSSaleEntry, OSSaleWrapper } from "../generated/schema";
import { ARTBLOCKS_PLATFORM_ID, WYVERN_ATOMICIZER_ADDRESS, WYVERN_EXCHANGE_ADDRESS, ZERO_ADDRESS } from "./constants";

/*** EVENT HANDLERS ***/
export function handleMint(event: Mint): void {
  let contract = ArtBlocks.bind(event.address);

  let token = new Token(event.params._tokenId.toString());
  let projectId = contract.tokenIdToProjectId(event.params._tokenId);

  token.project = projectId.toString();
  token.owner = event.params._to;

  token.hash = (event as Mint).params._hashString;
  token.save();

  let project = new Project(token.project);
  project.invocations = contract.projectTokenInfo(projectId).value2;
  project.save();
}

// Update token owner on transfer
export function handleTransfer(event: Transfer): void {
  let contract: ArtBlocks = ArtBlocks.bind(event.address);

  // This will only create a new token if a token with the
  // same id does not already exist
  let token = new Token(event.params.tokenId.toString());

  if (event.params.from.toHexString() == ZERO_ADDRESS) {
    token.hash = (contract as ArtBlocks).tokenIdToHash(event.params.tokenId);
    token.project = contract
      .tokenIdToProjectId(event.params.tokenId)
      .toString();
  }

  // If the transfer event is raised because of a transaction sent to Open Sea 
  // create a new OSSaleEntry and update/create its associated OSSaleWrapper
  let txSentTo = event.transaction.to.toHexString();
  if (txSentTo == WYVERN_EXCHANGE_ADDRESS || txSentTo == WYVERN_ATOMICIZER_ADDRESS) {
    handleOpenSeaSale(event);
  }


  token.owner = event.params.to;
  token.save();
}
/*** END EVENT HANDLERS ***/

/*** CALL HANDLERS  ***/
export function handleAddProject(call: AddProjectCall): void {
  let contract = ArtBlocks.bind(call.to);

  let platform = Platform.load(ARTBLOCKS_PLATFORM_ID);

  if (platform === null) {
    platform = refreshPlatform(contract);
  }

  // If two transactions with
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
  platform.whitelisted = platform.whitelisted
    ? platform.whitelisted.filter(address => address !== call.inputs._address)
    : [];
  platform.save();
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
  platform.mintWhitelisted = platform.mintWhitelisted
    ? platform.mintWhitelisted.filter(
      address => address !== call.inputs._address
    )
    : [];
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
  refreshProjectScript(contract, call.inputs._projectId);
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
  refreshProjectScript(contract, call.inputs._projectId);
}

export function handleToggleProjectIsActive(
  call: ToggleProjectIsActiveCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.active = !project.active;
  project.save();
}

export function handleToggleProjectIsDynamic(
  call: ToggleProjectIsDynamicCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.dynamic = !project.dynamic;
  project.useHashString = !project.dynamic;
  project.save();
}

export function handleToggleProjectIsLocked(
  call: ToggleProjectIsLockedCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.locked = !project.locked;
  project.save();
}

export function handleToggleProjectIsPaused(
  call: ToggleProjectIsPausedCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.paused = !project.locked;
  project.save();
}

export function handleToggleProjectUseHashString(
  call: ToggleProjectUseHashStringCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.useHashString = !project.useHashString;
  project.save();
}

export function handleToggleProjectUseIpfsForStatic(
  call: ToggleProjectUseIpfsForStaticCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.useIpfs = !project.useIpfs;
  project.save();
}

export function handleUpdateProjectAdditionalPayeeInfo(
  call: UpdateProjectAdditionalPayeeInfoCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.additionalPayee = call.inputs._additionalPayee;
  project.additionalPayeePercentage = call.inputs._additionalPayeePercentage;
  project.save();
}

export function handleUpdateProjectArtistAddress(
  call: UpdateProjectArtistAddressCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.artistAddress = call.inputs._artistAddress;
  project.save();
}

export function handleUpdateProjectArtistName(
  call: UpdateProjectArtistNameCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.artistName = call.inputs._projectArtistName;
  project.save();
}

export function handleUpdateProjectBaseIpfsURI(
  call: UpdateProjectBaseIpfsURICall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.baseIpfsUri = call.inputs._projectBaseIpfsURI;
  project.save();
}

export function handleUpdateProjectBaseURI(
  call: UpdateProjectBaseURICall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.baseUri = call.inputs._newBaseURI;
  project.save();
}

export function handleUpdateProjectCurrencyInfo(
  call: UpdateProjectCurrencyInfoCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.currencySymbol = call.inputs._currencySymbol;
  project.currencyAddress = call.inputs._currencyAddress;

  project.save();
}

export function handleUpdateProjectDescription(
  call: UpdateProjectDescriptionCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.description = call.inputs._projectDescription;
  project.save();
}

export function handleUpdateProjectIpfsHash(
  call: UpdateProjectIpfsHashCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.ipfsHash = call.inputs._ipfsHash;
  project.save();
}

export function handleUpdateProjectLicense(
  call: UpdateProjectLicenseCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.license = call.inputs._projectLicense;
  project.save();
}

export function handleUpdateProjectMaxInvocations(
  call: UpdateProjectMaxInvocationsCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.maxInvocations = call.inputs._maxInvocations;
  project.save();
}

export function handleUpdateProjectName(call: UpdateProjectNameCall): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.name = call.inputs._projectName;
  project.save();
}

export function handleUpdateProjectPricePerTokenInWei(
  call: UpdateProjectPricePerTokenInWeiCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.pricePerTokenInWei = call.inputs._pricePerTokenInWei;
  project.save();
}

export function handleUpdateProjectScript(call: UpdateProjectScriptCall): void {
  let contract = ArtBlocks.bind(call.to);

  refreshProjectScript(contract, call.inputs._projectId);
}

export function handleUpdateProjectScriptJSON(
  call: UpdateProjectScriptJSONCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.scriptJSON = call.inputs._projectScriptJSON;
  project.save();
}

export function handleUpdateProjectSecondaryMarketRoyaltyPercentage(
  call: UpdateProjectSecondaryMarketRoyaltyPercentageCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

  project.royaltyPercentage = call.inputs._secondMarketRoyalty;
  project.save();
}

export function handleUpdateProjectWebsite(
  call: UpdateProjectWebsiteCall
): void {
  let project = Project.load(call.inputs._projectId.toString());

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
  platform.randomizerContract = (contract as ArtBlocks).randomizerContract();

  platform.save();

  return platform;
}

function refreshTokenUri(contract: ArtBlocks, tokenId: BigInt): void {
  let tokenURI = contract.tokenURI(tokenId);

  let token = new Token(tokenId.toString());
  token.uri = tokenURI;

  token.save();
}

function refreshProjectScript(contract: ArtBlocks, projectId: BigInt): void {
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

  project.save();
}

function handleOpenSeaSale(event: Transfer): void {
  // Create a new SaleEntry
  let saleEntry = new OSSaleEntry(event.transaction.hash.toHexString() + event.logIndex.toString())

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
  saleEntry.token = event.params.tokenId.toString();

  saleEntry.save();
  saleWrapper.save();
}
/** END HELPERS ***/
