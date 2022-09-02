import {
  BigInt,
  Bytes,
  store,
  json,
  JSONValueKind,
  log,
  Address,
  ByteArray
} from "@graphprotocol/graph-ts";
import { logStore } from "matchstick-as";

import {
  GenArt721Core,
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
} from "../generated/GenArt721Core/GenArt721Core";

import {
  UpdateAdminCall,
  GenArt721Core2
} from "../generated/GenArt721Core2/GenArt721Core2";

import {
  Project,
  Token,
  Transfer as TokenTransfer,
  Account,
  AccountProject,
  Contract,
  Whitelisting,
  ProjectScript,
  MinterFilter,
  ProjectMinterConfiguration
} from "../generated/schema";

import {
  generateAccountProjectId,
  generateWhitelistingId,
  generateContractSpecificId,
  generateProjectScriptId
} from "./helpers";

/*** EVENT HANDLERS ***/
export function handleMint(event: Mint): void {
  let contract = GenArt721Core.bind(event.address);

  let token = new Token(
    generateContractSpecificId(event.address, event.params._tokenId)
  );
  let projectId = generateContractSpecificId(
    event.address,
    event.params._projectId
  );

  let project = Project.load(projectId);
  if (project) {
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
/*** END EVENT HANDLERS ***/

/*** CALL HANDLERS  (Mainnet and Ropsten Only) ***/
export function handleAddProject(call: AddProjectCall): void {
  let contract = GenArt721Core.bind(call.to);
  let contractEntity = Contract.load(call.to.toHexString());

  let projectId: BigInt;
  if (!contractEntity) {
    contractEntity = refreshContract(contract, call.block.timestamp);
    if (contractEntity) {
      // In this case nextProjectId has already been incremented
      projectId = contractEntity.nextProjectId.minus(BigInt.fromI32(1));
    }
  } else {
    projectId = contractEntity.nextProjectId;
    contractEntity.nextProjectId = contractEntity.nextProjectId.plus(
      BigInt.fromI32(1)
    );
  }

  let projectDetails = contract.projectDetails(projectId);
  let projectTokenInfo = contract.projectTokenInfo(projectId);
  let projectScriptInfo = contract.projectScriptInfo(projectId);

  let timestamp = call.block.timestamp;
  let contractAddress = call.to;

  let name = projectDetails.value0;
  let dynamic = projectDetails.value5;

  let artistAddress = projectTokenInfo.value0;
  let artist = new Account(artistAddress.toHexString());
  artist.save();

  let pricePerTokenInWei = projectTokenInfo.value1;
  let invocations = projectTokenInfo.value2;
  let maxInvocations = projectTokenInfo.value3;
  let currencyAddress = projectTokenInfo.value5;
  let currencySymbol = projectTokenInfo.value7;

  let scriptCount = projectScriptInfo.value1;
  let useHashString = projectScriptInfo.value2;
  let paused = projectScriptInfo.value5;

  let project = new Project(
    generateContractSpecificId(contractAddress, projectId)
  );

  project.active = false;
  project.artist = artist.id;
  project.artistAddress = artistAddress;
  project.complete = false;
  project.contract = contractAddress.toHexString();
  project.createdAt = timestamp;
  project.currencySymbol = currencySymbol;
  project.currencyAddress = currencyAddress;
  project.dynamic = dynamic;
  project.externalAssetDependencyCount = BigInt.fromI32(0);
  project.externalAssetDependenciesLocked = false;
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

  if (contractEntity) {
    contractEntity.updatedAt = call.block.timestamp;
    contractEntity.save();
  }
}

export function handleUpdateAdmin(call: UpdateAdminCall): void {
  let contract = GenArt721Core2.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleAddWhitelisted(call: AddWhitelistedCall): void {
  let contract = GenArt721Core.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  if (contractEntity) {
    addWhitelisting(contractEntity.id, call.inputs._address.toHexString());
  }
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

export function handleRemoveWhitelisted(call: RemoveWhitelistedCall): void {
  let contract = GenArt721Core.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  if (contractEntity) {
    removeWhitelisting(contractEntity.id, call.inputs._address.toHexString());
  }
}

function removeWhitelisting(contractId: string, accountId: string): void {
  let account = new Account(accountId);

  let whitelistingId = generateWhitelistingId(contractId, account.id);
  let whitelisting = Whitelisting.load(whitelistingId);

  if (whitelisting) {
    store.remove("Whitelisting", whitelistingId);
  }
}

export function handleAddMintWhitelisted(call: AddMintWhitelistedCall): void {
  let contract = GenArt721Core.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  if (contractEntity) {
    contractEntity.mintWhitelisted = contractEntity.mintWhitelisted
      ? contractEntity.mintWhitelisted.concat([call.inputs._address])
      : [call.inputs._address];
    contractEntity.save();
  }
}

export function handleRemoveMintWhitelisted(
  call: RemoveMintWhitelistedCall
): void {
  let contract = GenArt721Core.bind(call.to);
  let contractEntity = refreshContract(contract, call.block.timestamp);

  if (contractEntity) {
    removeMintWhitelisting(
      contractEntity,
      call.inputs._address,
      call.block.timestamp
    );
  }
}

function removeMintWhitelisting(
  contractEntity: Contract,
  minterAddress: Address,
  timestamp: BigInt
): void {
  let mintWhitelisted = contractEntity.mintWhitelisted;

  let newMintWhitelisted: Bytes[] = [];
  for (let i = 0; i < mintWhitelisted.length; i++) {
    if ((mintWhitelisted[i] as Bytes) != minterAddress) {
      newMintWhitelisted.push(mintWhitelisted[i]);
    }
  }

  // If the minter that was removed was the minter filter for the
  // contract then we need to null all minter configurations for
  // the contract's projects.
  let minterFilter = MinterFilter.load(minterAddress.toHexString());
  if (minterFilter && contractEntity.minterFilter == minterFilter.id) {
    contractEntity.minterFilter = null;
    let nextProjectId = contractEntity.nextProjectId.toI32();
    for (let i = 0; i < nextProjectId; i++) {
      let fullProjectId = contractEntity.id + "-" + i.toString();
      let project = Project.load(fullProjectId);

      if (project && project.minterConfiguration) {
        project.minterConfiguration = null;
        project.updatedAt = timestamp;
        project.save();
      }

      let prevMinterConfig = ProjectMinterConfiguration.load(fullProjectId);
      if (prevMinterConfig) {
        store.remove("ProjectMinterConfiguration", fullProjectId);
      }
    }
  }

  contractEntity.mintWhitelisted = newMintWhitelisted;
  contractEntity.save();
}

export function handleUpdateRandomizerAddress(
  call: UpdateRandomizerAddressCall
): void {
  let contract = GenArt721Core.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleUpdateArtblocksAddress(
  call: UpdateArtblocksAddressCall
): void {
  let contract = GenArt721Core.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleUpdateArtblocksPercentage(
  call: UpdateArtblocksPercentageCall
): void {
  let contract = GenArt721Core.bind(call.to);
  refreshContract(contract, call.block.timestamp);
}

export function handleAddProjectScript(call: AddProjectScriptCall): void {
  let contract = GenArt721Core.bind(call.to);
  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
}

export function handleClearTokenIpfsImageUri(
  call: ClearTokenIpfsImageUriCall
): void {
  let contract = GenArt721Core.bind(call.to);
  refreshTokenUri(contract, call.inputs._tokenId);
}

export function handleOverrideTokenDynamicImageWithIpfsLink(
  call: OverrideTokenDynamicImageWithIpfsLinkCall
): void {
  let contract = GenArt721Core.bind(call.to);
  refreshTokenUri(contract, call.inputs._tokenId);
}

export function handleRemoveProjectLastScript(
  call: RemoveProjectLastScriptCall
): void {
  let contract = GenArt721Core.bind(call.to);
  refreshProjectScript(contract, call.inputs._projectId, call.block.timestamp);
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

export function handleToggleProjectUseHashString(
  call: ToggleProjectUseHashStringCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project && project.contract == call.to.toHexString()) {
    project.useHashString = !project.useHashString;
    project.updatedAt = call.block.timestamp;
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

  if (project) {
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

export function handleUpdateProjectCurrencyInfo(
  call: UpdateProjectCurrencyInfoCall
): void {
  let project = Project.load(
    generateContractSpecificId(call.to, call.inputs._projectId)
  );

  if (project) {
    project.currencySymbol = call.inputs._currencySymbol;
    project.currencyAddress = call.inputs._currencyAddress;
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
  let contract = GenArt721Core.bind(call.to);

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

      // Old site used curation_status, new site uses curationStatus
      let curationStatusJSONValue = scriptJSON.get("curation_status");
      if (!curationStatusJSONValue || curationStatusJSONValue.isNull()) {
        curationStatusJSONValue = scriptJSON.get("curationStatus");
      }

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
function refreshContract<T>(contract: T, timestamp: BigInt): Contract | null {
  if (!(contract instanceof GenArt721Core)) {
    return null;
  }

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
  contractEntity.randomizerContract = contract.randomizerContract();
  contractEntity.updatedAt = timestamp;

  contractEntity.save();

  return contractEntity as Contract;
}

function refreshTokenUri(contract: GenArt721Core, tokenId: BigInt): void {
  let tokenURI = contract.tokenURI(tokenId);

  let token = Token.load(
    generateContractSpecificId(contract._address, tokenId)
  );
  if (token) {
    token.uri = tokenURI;
    token.save();
  }
}

function refreshProjectScript<T>(
  contract: T,
  projectId: BigInt,
  timestamp: BigInt
): void {
  if (!(contract instanceof GenArt721Core)) {
    return;
  }

  let project = Project.load(
    generateContractSpecificId(contract._address, projectId)
  );

  if (project) {
    let scriptInfo = contract.projectScriptInfo(projectId);

    let prevScriptCount = project.scriptCount.toI32();
    let scriptCount = scriptInfo.value1.toI32();

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
      let script = contract.projectScriptByIndex(projectId, BigInt.fromI32(i));

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
    project.scriptCount = scriptInfo.value1;
    project.updatedAt = timestamp;
    project.scriptUpdatedAt = timestamp;

    project.save();
  }
}
/** END HELPERS ***/
