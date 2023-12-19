import { Address, log, BigInt } from "@graphprotocol/graph-ts";

import {
  SplitAtomicFactory,
  SplitAtomicContract,
  SplitAtomicSplit
} from "../generated/schema";

import {
  Deployed,
  SplitAtomicCreated
} from "../generated/ISplitAtomicFactory/ISplitAtomicFactoryV0";

import { ISplitAtomicV0 } from "../generated/ISplitAtomicFactory/ISplitAtomicV0";

/*** EVENT HANDLERS ***/
export function handlehandleDeployed(event: Deployed): void {
  // create the split atomic factory entity
  const splitAtomicFactory = new SplitAtomicFactory(
    event.address.toHexString()
  );
  // update the implementation and type
  splitAtomicFactory.implementation = event.params.implementation;
  splitAtomicFactory.type = event.params.type_.toString();
  // update the updated at timestamp
  splitAtomicFactory.updatedAt = event.block.timestamp;
  // save the split atomic factory
  splitAtomicFactory.save();
}

export function handleSplitAtomicCreated(event: SplitAtomicCreated): void {
  // load the split atomic factory
  const splitAtomicFactory = SplitAtomicFactory.load(
    event.address.toHexString()
  );
  if (!splitAtomicFactory) {
    // This should never happen
    log.warning("SplitAtomicCreated: split atomic factory {} not found", [
      event.address.toHexString()
    ]);
    return;
  }
  // update the updated at timestamp
  splitAtomicFactory.updatedAt = event.block.timestamp;
  // save the split atomic factory
  splitAtomicFactory.save();

  // create the split atomic contract
  const splitAtomicContract = new SplitAtomicContract(
    event.params.splitAtomic.toHexString()
  );
  // set the split atomic factory
  splitAtomicContract.splitAtomicFactory = splitAtomicFactory.id;
  // set the implementation and type
  splitAtomicContract.implementation = splitAtomicFactory.implementation;
  // @dev web3 call to get the type
  const splitAtomicContractInstance = ISplitAtomicV0.bind(
    event.params.splitAtomic
  );
  // use a try catch block to catch a possible revert, even though we never expect this to happen
  const splitAtomicFactoryTypeResult = splitAtomicContractInstance.try_type_();
  if (splitAtomicFactoryTypeResult.reverted) {
    // This should never happen
    log.warning(
      "SplitAtomicCreated: type_ call reverted for split atomic contract {}",
      [event.params.splitAtomic.toHexString()]
    );
    return;
  }
  splitAtomicContract.type = splitAtomicFactoryTypeResult.value.toString();
  // safe the split atomic contract
  splitAtomicContract.save();

  // create the splits
  // @dev web3 call to get the splits
  // use a try catch block to catch a possible revert, even though we never expect this to happen
  const splitsResult = splitAtomicContractInstance.try_getSplits();
  if (splitsResult.reverted) {
    // This should never happen
    log.warning(
      "SplitAtomicCreated: getSplits call reverted for split atomic contract {}",
      [event.params.splitAtomic.toHexString()]
    );
    return;
  }
  const splits = splitsResult.value;
  // loop over the splits array and add each split to the store
  for (let i = 0; i < splits.length; i++) {
    const split = new SplitAtomicSplit(
      event.params.splitAtomic.toHexString() + "-" + i.toString()
    );
    split.splitAtomicContract = splitAtomicContract.id;
    split.index = BigInt.fromI32(i);
    split.recipient = splits[i].recipient;
    split.basisPoints = BigInt.fromI32(splits[i].basisPoints);
    split.save();
  }
}

/*** HELPER FUNCTIONS ***/
/**
 * @notice gets or creates split atomic factory at address `address`.
 * Important: does not save the split atomic factory if a new one is created.
 * This is because we don't assign all required fields in this function.
 * @param address the address of the split atomic factory
 * @returns SplitAtomicFactory the split atomic factory
 */
function loadOrCreateSplitAtomicFactory(address: Address): SplitAtomicFactory {
  let splitAtomicFactoryEntity = SplitAtomicFactory.load(address.toHexString());
  if (!splitAtomicFactoryEntity) {
    splitAtomicFactoryEntity = new SplitAtomicFactory(address.toHexString());
    // do not save, because we don't assign all required fields at this time
  }
  return splitAtomicFactoryEntity as SplitAtomicFactory;
}
