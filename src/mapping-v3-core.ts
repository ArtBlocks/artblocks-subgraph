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
  GenArt721CoreV3,
  Mint,
  Transfer,
  PlatformUpdated,
  MinterUpdated,
  ProposedArtistAddressesAndSplits as ProposedArtistAddressesAndSplitsEvent,
  AcceptedArtistAddressesAndSplits
} from "../generated/GenArt721CoreV3/GenArt721CoreV3";

import { MinterFilterV0 } from "../generated/MinterFilterV0/MinterFilterV0";
import { loadOrCreateAndSetProjectMinterConfiguration } from "./minter-filter-mapping";

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
  ProjectMinterConfiguration,
  ProposedArtistAddressesAndSplits
} from "../generated/schema";

import {
  generateAccountProjectId,
  generateWhitelistingId,
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

// Handle platform updates
// This is a generic event that can be used to update a number of different
// contract state variables. All of the expected `_field` values are handled in
// the `refreshContract` helper function.
export function handlePlatformUpdated(event: PlatformUpdated): void {
  let contract = GenArt721CoreV3.bind(event.address);
  refreshContract(contract, event.block.timestamp);
}

// Handle minter updated
// This is an event emitted when a V3 contract's minter is updated.
// @dev for V3, only one minter at a time is allowed, so this event can be
// interpreted as also indicating removal of an existing minter.
// @dev it can be assumed that the minter on V3 is a MinterFilter contract that
// conforms to IMinterFilterV0, unless the minter address is the zero address.
export function handleMinterUpdated(event: MinterUpdated): void {
  let contract = GenArt721CoreV3.bind(event.address);

  let contractEntity = loadOrCreateContract(contract, event.block.timestamp);

  // Clear the minter config for all projects on core contract when a new
  // minter filter is set
  clearAllMinterConfigurations(contract, event.block.timestamp);

  let newMinterFilterAddress = event.params._currentMinter.toHexString();
  if (newMinterFilterAddress == Address.zero().toHexString()) {
    // only when MinterFilter is zero address should we should assume
    // the  minter is not a MinterFilter contract
    // update contract entity with null MinterFilter
    contractEntity.minterFilter = null;
    contractEntity.mintWhitelisted = [];
  } else {
    // we can assume the minter is a MinterFilter contract.
    contractEntity.mintWhitelisted = [event.params._currentMinter];
    let minterFilterContract = MinterFilterV0.bind(event.params._currentMinter);
    // create and save minter filter entity if doesn't exist
    loadOrCreateMinterFilter(minterFilterContract, event.block.timestamp);
    // check that the MinterFilter's core contract is the contract that emitted
    // the event.
    if (
      minterFilterContract.genArt721CoreAddress().toHexString() !=
      event.address.toHexString()
    ) {
      // if the minter filter's core contract is not the contract that emitted
      // the event, then we should null the core contract entity's minterFilter
      // field (since invalid minter filter), keep mintWhitelisted as the
      // new address (technically the new minter could mint) and warn because
      // this is an unintended state.
      contractEntity.minterFilter = null;
      log.warning(
        "[WARN] Invalid minter filter at address {} set on core contract {} - minter filter's core contract is not the contract that emitted the event.",
        [newMinterFilterAddress, contractEntity.id]
      );
    } else {
      // update contract entity with new valid MinterFilter ID
      contractEntity.minterFilter = newMinterFilterAddress;
      // sync all pre-set projectMinterConfigurations
      populateAllExistingMinterConfigurations(
        minterFilterContract,
        contract,
        event.block.timestamp
      );
    }
  }

  // update contract entity and save
  contractEntity.updatedAt = event.block.timestamp;
  contractEntity.save();
}

// Handle artist proposed address and splits updates
// This is an event indicating that the artist has proposed a new set of
// addresses and splits for a project.
export function handleProposedArtistAddressesAndSplits(
  event: ProposedArtistAddressesAndSplitsEvent
): void {
  // load associated project entity
  const newEntityId = generateContractSpecificId(
    event.address,
    event.params._projectId
  );
  const project = Project.load(newEntityId);
  if (!project) {
    return;
  }
  // remove any existing proposed artist addresses and splits
  const existingProposedArtistAddressesAndSplitsId =
    project.proposedArtistAddressesAndSplits;
  if (existingProposedArtistAddressesAndSplitsId !== null) {
    project.proposedArtistAddressesAndSplits = null;
    store.remove(
      "ProposedArtistAddressesAndSplits",
      existingProposedArtistAddressesAndSplitsId
    );
  }
  // create new proposed artist addresses and splits entity
  const proposedArtistAddressesAndSplits = new ProposedArtistAddressesAndSplits(
    newEntityId
  );
  // populate new entity with event params
  proposedArtistAddressesAndSplits.artistAddress = event.params._artistAddress;
  proposedArtistAddressesAndSplits.additionalPayeePrimarySalesAddress =
    event.params._additionalPayeePrimarySales;
  proposedArtistAddressesAndSplits.additionalPayeePrimarySalesPercentage =
    event.params._additionalPayeePrimarySalesPercentage;
  proposedArtistAddressesAndSplits.additionalPayeeSecondarySalesAddress =
    event.params._additionalPayeeSecondarySales;
  proposedArtistAddressesAndSplits.additionalPayeeSecondarySalesPercentage =
    event.params._additionalPayeeSecondarySalesPercentage;
  proposedArtistAddressesAndSplits.createdAt = event.block.timestamp;
  proposedArtistAddressesAndSplits.project = project.id;
  // save new entity to store
  proposedArtistAddressesAndSplits.createdAt = event.block.timestamp;
  proposedArtistAddressesAndSplits.save();
  // set the project's proposedArtistAddressesAndSplits field to the new entity
  project.proposedArtistAddressesAndSplits =
    proposedArtistAddressesAndSplits.id;
  project.updatedAt = event.block.timestamp;
  project.save();
}

// Handle admin accepting the currently proposed artist address and splits.
export function handleAcceptedArtistAddressesAndSplits(
  event: AcceptedArtistAddressesAndSplits
): void {
  // load associated project entity
  const newEntityId = generateContractSpecificId(
    event.address,
    event.params._projectId
  );
  const project = Project.load(newEntityId);
  if (!project) {
    return;
  }
  // load the existing proposed artist addresses and splits
  const existingProposedArtistAddressesAndSplitsId =
    project.proposedArtistAddressesAndSplits;
  if (existingProposedArtistAddressesAndSplitsId === null) {
    // we don't expect this state to be possible, so we should log a warning
    log.warning(
      "[WARN] No proposed artist addresses and splits found on project {}.",
      [newEntityId]
    );
    return;
  }
  const proposedArtistAddressesAndSplits = ProposedArtistAddressesAndSplits.load(
    newEntityId
  );
  if (!proposedArtistAddressesAndSplits) {
    // we dont expect this state to be possible, so we should log a warning
    log.warning(
      "[WARN] No proposed artist addresses and splits found with id {}.",
      [newEntityId]
    );
    return;
  }
  // update project entity with new artist addresses and splits
  project.artistAddress = proposedArtistAddressesAndSplits.artistAddress;
  project.additionalPayee =
    proposedArtistAddressesAndSplits.additionalPayeePrimarySalesAddress;
  project.additionalPayeePercentage =
    proposedArtistAddressesAndSplits.additionalPayeePrimarySalesPercentage;
  project.additionalPayeeSecondarySalesAddress =
    proposedArtistAddressesAndSplits.additionalPayeeSecondarySalesAddress;
  project.additionalPayeeSecondarySalesPercentage =
    proposedArtistAddressesAndSplits.additionalPayeeSecondarySalesPercentage;
  // keep the proposed artist addresses and splits entity because it still
  // exists on the blockchain, and admin could still "accept" it again (even
  // though it wouldn't change anything)
  project.updatedAt = event.block.timestamp;
  project.save();
}

/*** END EVENT HANDLERS ***/

/*** NO CALL HANDLERS  ***/

/** HELPERS ***/

// loads or creates a contract entity and returns it.
function loadOrCreateContract(
  contract: GenArt721CoreV3,
  timestamp: BigInt
): Contract {
  let contractEntity = Contract.load(contract._address.toHexString());
  if (!contractEntity) {
    contractEntity = refreshContract(contract, timestamp);
  }
  return contractEntity;
}

// loads or creates a MinterFilter entity and returns it.
function loadOrCreateMinterFilter(
  minterFilterContract: MinterFilterV0,
  timestamp: BigInt
): MinterFilter {
  // load or create MinterFilter entity
  let minterFilter = MinterFilter.load(
    minterFilterContract._address.toHexString()
  );
  if (!minterFilter) {
    minterFilter = new MinterFilter(
      minterFilterContract._address.toHexString()
    );
    minterFilter.coreContract = minterFilterContract
      .genArt721CoreAddress()
      .toHexString();
    // if this is the first time we have seen this minter filter, we can
    // assume the minter allowlist is empty If it was not empty, we would
    // have seen it when the minter filter was allowlisting a minter.
    // @dev this assumes the minter filter is in subgraph's config
    minterFilter.minterAllowlist = [];
    minterFilter.updatedAt = timestamp;
    minterFilter.save();
  }
  return minterFilter;
}

// Refresh contract entity state. Creates new contract in store if one does not
// already exist. Expected to handle any update that emits a `PlatformUpdated`
// event.
// @dev Warning - this does not handle updates where the contract's
// minterFilter is updated. For that, see handleMinterUpdated.
function refreshContract(
  contract: GenArt721CoreV3,
  timestamp: BigInt
): Contract {
  let contractEntity = Contract.load(contract._address.toHexString());
  if (!contractEntity) {
    contractEntity = new Contract(contract._address.toHexString());
    contractEntity.createdAt = timestamp;
    contractEntity.mintWhitelisted = [];
    contractEntity.newProjectsForbidden = false;
    contractEntity.nextProjectId = contract.nextProjectId();
  }
  contractEntity.admin = contract.admin();
  contractEntity.type = contract.coreType();
  contractEntity.renderProviderAddress = contract.artblocksPrimarySalesAddress();
  contractEntity.renderProviderPercentage = contract.artblocksPrimarySalesPercentage();
  contractEntity.renderProviderSecondarySalesAddress = contract.artblocksSecondarySalesAddress();
  contractEntity.renderProviderSecondarySalesBPS = contract.artblocksSecondarySalesBPS();
  contractEntity.nextProjectId = contract.nextProjectId();
  contractEntity.randomizerContract = contract.randomizerContract();
  let _minterContract = contract.minterContract();
  if (_minterContract != Address.zero()) {
    contractEntity.mintWhitelisted = [_minterContract];
  } else {
    contractEntity.mintWhitelisted = [];
  }
  contractEntity.newProjectsForbidden = contract.newProjectsForbidden();
  contractEntity.curationRegistry = contract.artblocksCurationRegistryAddress();
  contractEntity.dependencyRegistry = contract.artblocksDependencyRegistryAddress();

  contractEntity.updatedAt = timestamp;

  contractEntity.save();

  return contractEntity as Contract;
}

// Clear all minter configurations for all of a V3 core contract's projects
function clearAllMinterConfigurations(
  contract: GenArt721CoreV3,
  timestamp: BigInt
): void {
  let contractEntity = loadOrCreateContract(contract, timestamp);

  let startingProjectId = contract.startingProjectId().toI32();
  let nextProjectId = contractEntity.nextProjectId.toI32();
  for (let i = startingProjectId; i < nextProjectId; i++) {
    let fullProjectId = contractEntity.id + "-" + i.toString();
    let project = Project.load(fullProjectId);

    if (project) {
      project.minterConfiguration = null;
      project.updatedAt = timestamp;
      project.save();
    }
  }
}

// Populate all project minter configurations from a given minter filter
function populateAllExistingMinterConfigurations(
  minterFilterContract: MinterFilterV0,
  contract: GenArt721CoreV3,
  timestamp: BigInt
): void {
  // Check the new minter filter for any pre-allowlisted minters and update Projects accordingly
  let numProjectsWithMinters = minterFilterContract.getNumProjectsWithMinters();
  for (
    let i = BigInt.fromI32(0);
    i.lt(numProjectsWithMinters);
    i = i.plus(BigInt.fromI32(1))
  ) {
    let projectAndMinterInfo = minterFilterContract.getProjectAndMinterInfoAt(
      i
    );
    let projectId = projectAndMinterInfo.value0;
    let minterAddress = projectAndMinterInfo.value1;

    let project = Project.load(
      generateContractSpecificId(contract._address, projectId)
    );

    if (project) {
      loadOrCreateAndSetProjectMinterConfiguration(
        project,
        minterAddress,
        timestamp
      );
    }
  }
}

/** END HELPERS ***/
