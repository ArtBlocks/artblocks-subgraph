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
  Transfer
} from "../generated/GenArt721CoreV3/GenArt721CoreV3";

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
/*** END EVENT HANDLERS ***/

/*** NO CALL HANDLERS  ***/

/** HELPERS ***/

/** END HELPERS ***/