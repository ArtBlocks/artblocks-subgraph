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
import {
  Project,
  Token,
  Transfer as TransferEntity,
  Platform
} from "../generated/schema";
import { ARTBLOCKS_PLATFORM_ID, ZERO_ADDRESS } from "./constants";

/*** EVENT HANDLERS ***/
export function handleMint(event: Mint): void {
  let contract = ArtBlocks.bind(event.address);

  let token = new Token(event.params._tokenId.toString());
  let projectId = contract.tokenIdToProjectId(event.params._tokenId);

  token.project = projectId.toString();
  token.owner = event.params._to;
  token.hash = event.params._hashString;

  // Entities can be written to the store with `.save()`
  token.save();

  let project = Project.load(token.project);
  project.invocations = contract.projectTokenInfo(projectId).value2;
  project.save();
}

export function handleTransfer(event: Transfer): void {
  let contract = ArtBlocks.bind(event.address);
  let transfer = new TransferEntity(event.transaction.from.toHex());

  transfer.to = event.params.to;
  transfer.from = event.params.from;

  let token = new Token(event.params.tokenId.toString());

  if (transfer.from.toHexString() == ZERO_ADDRESS) {
    token.hash = contract.tokenIdToHash(event.params.tokenId);
    token.project = contract
      .tokenIdToProjectId(event.params.tokenId)
      .toString();
  }

  token.owner = event.params.to;
  transfer.token = token.id;
  transfer.timestamp = event.block.timestamp;

  transfer.save();
  token.save();
}

export function handleAddProject(call: AddProjectCall): void {
  let contract = ArtBlocks.bind(call.to);

  // TODO: This might get the wrong id if there's a bunch of projects
  // being uploaded together. We need Events!
  let nextProjectId = contract.nextProjectId();
  let id = nextProjectId.minus(BigInt.fromI32(1));

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
  project.paused = paused;
  project.active = false;
  project.locked = false;

  project.save();

  let platform = new Platform(ARTBLOCKS_PLATFORM_ID);
  platform.nextProjectId = nextProjectId;

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
  let randomizerContract = contract.randomizerContract();

  let platform = new Platform(ARTBLOCKS_PLATFORM_ID);
  platform.admin = admin;
  platform.artblocksAddress = artblocksAddress;
  platform.artblocksPercentage = artblocksPercentage;
  platform.nextProjectId = nextProjectId;
  platform.randomizerContract = randomizerContract;

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
/** HELPERS ***/
