import { Address, BigInt, ByteArray, Bytes, ethereum, log } from "@graphprotocol/graph-ts";

import { AtomicMatch_Call, WyvernExchange } from "../generated/WyvernExchange/WyvernExchange";

import {
  Contract,
  OpenSeaSale,
  Token,
  OpenSeaSaleLookupTable,
} from "../generated/schema";
import { WYVERN_ATOMICIZER_ADDRESS, NULL_ADDRESS, TRANSFER_FROM_SELECTOR } from "./constants";
import { generateContractSpecificId } from "./helpers";

/** Call handlers */
/**
 *
 * @param call The AtomicMatch call that triggered this call handler.
 * @description When a sale is made on OpenSea an AtomicMatch_ call is invoked.
 *              This handler will create the associated OpenSeaSale entity
 */
export function handleAtomicMatch_(call: AtomicMatch_Call): void {
  let addrs: Address[] = call.inputs.addrs;
  let saleAdress: Address = addrs[11];
  let saleTargetAddressStr: string = saleAdress.toHexString();

  if (saleTargetAddressStr == WYVERN_ATOMICIZER_ADDRESS) {
    /**
     * When dealing with bundle sale, the targeted sale address is
     * the address of the OpenSea Atomicizer (that will atomically
     * call every transferFrom methods of each NFT contract involved
     * in the bundle).
     *
     */
    _handleBundleSale(call);
  } else {
    /**
     * In case of normal "single asset sale", the saleTarget input is
     * set to the NFT contract.
     */
    _handleSingleAssetSale(call);
  }
}

/** Private implementation */

/**
 *
 * @param call The AtomicMatch call that triggered the handleAtomicMatch_ call handler.
 * @description This function is used to handle the case of a "normal" sale made from OpenSea.
 *              A "normal" sale is a sale that is not a bundle (only contains one asset).
 */
function _handleSingleAssetSale(call: AtomicMatch_Call): void {
  log.warning("_handleSingleAssetSale", []);

  let callInputs = call.inputs;
  let uints: BigInt[] = callInputs.uints;
  let addrs: Address[] = callInputs.addrs;

  // Only interested in Art Blocks sells
  let nftContract: Address = addrs[11];
  let contract = Contract.load(nftContract.toHexString());
  if (contract) {
    // TODO: The price could be retrieved from the calculateMatchPrice_ method of OpenSea Smart Contract
    let price: BigInt = uints[4];

    let buyerAdress: Address = addrs[1]; // Buyer.maker
    let sellerAdress: Address = addrs[8]; // Saler.maker
    let paymentTokenErc20Address: Address = addrs[6];

    // Merge sell order data with buy order data (just like they are doing in their contract)
    let mergedCallData = _guardedArrayReplace(
      callInputs.calldataBuy,
      callInputs.calldataSell,
      callInputs.replacementPatternBuy
    );

    // Fetch the token ID that has been sold from the call data
    let tokenIdStr = _getSingleTokenIdFromTransferFromCallData(mergedCallData);

    // The token must already exist (minted) to be sold on OpenSea
    let token = Token.load(
      generateContractSpecificId(nftContract, BigInt.fromString(tokenIdStr))
    );

    if (token) {
      // Create the OpenSeaSale
      let openSeaSaleId = call.transaction.hash.toHexString();
      let openSeaSale = new OpenSeaSale(openSeaSaleId);
      openSeaSale.saleType = "Single";
      openSeaSale.blockNumber = call.block.number;
      openSeaSale.blockTimestamp = call.block.timestamp;
      openSeaSale.buyer = buyerAdress;
      openSeaSale.seller = sellerAdress;
      openSeaSale.paymentToken = paymentTokenErc20Address;
      openSeaSale.price = price;
      openSeaSale.summaryTokensSold = token.id;
      openSeaSale.isPrivate = _isPrivateSale(call);
      openSeaSale.save();

      // Create the associated entry in the Nft <=> OpenSeaSale lookup table
      let tableEntryId = _buildTokenSaleLookupTableId(token.project, token.id, openSeaSaleId);
      let openSeaSaleLookupTable = new OpenSeaSaleLookupTable(
        tableEntryId
      );
      openSeaSaleLookupTable.token = token.id;
      openSeaSaleLookupTable.project = token.project;
      openSeaSaleLookupTable.openSeaSale = openSeaSale.id;
      openSeaSaleLookupTable.timestamp = openSeaSale.blockTimestamp;
      openSeaSaleLookupTable.blockNumber = openSeaSale.blockNumber;
      openSeaSaleLookupTable.save();
    }
  }
}

/**
 *
 * @param call The AtomicMatch call that triggered the handleAtomicMatch_ call handler.
 * @description This function is used to handle the case of a "bundle" sale made from OpenSea.
 *              A "bundle" sale is a sale that contains several assets embeded in the same, atomic, transaction.
 */
function _handleBundleSale(call: AtomicMatch_Call): void {
  log.warning("_handleBundleSale", []);

  let callInputs = call.inputs;
  let addrs: Address[] = callInputs.addrs;
  let uints: BigInt[] = callInputs.uints;

  // TODO: The price should be retrieved from the calculateMatchPrice_ method of OpenSea Smart Contract
  let price: BigInt = uints[4];

  let buyerAdress: Address = addrs[1]; // Buyer.maker
  let sellerAdress: Address = addrs[8]; // Saler.maker
  let paymentTokenErc20Address: Address = addrs[6];

  // Merge sell order data with buy order data (just like they are doing in their contract)
  let mergedCallDataStr = _guardedArrayReplace(
    callInputs.calldataBuy,
    callInputs.calldataSell,
    callInputs.replacementPatternBuy
  );

  // Fetch the token IDs list that has been sold from the call data for this bundle sale
  let results = _getNftContractAddressAndTokenIdFromCallData(mergedCallDataStr);
  let nftContractList = results[0];
  let bundleIncludesArtBlocks = false;
  for (let i = 0; i < nftContractList.length; i++) {
    let contract = Contract.load(nftContractList[i]);
    if (contract) {
      bundleIncludesArtBlocks = true;
      break;
    }
  }

  let tokenIdsList = results[1];

  // If the bundle does not contain any artblocks sales we don't care
  if (bundleIncludesArtBlocks) {
    // Create the sale
    let openSeaSaleId = call.transaction.hash.toHexString();
    let openSeaSale = new OpenSeaSale(openSeaSaleId);
    openSeaSale.saleType = "Bundle";
    openSeaSale.blockNumber = call.block.number;
    openSeaSale.blockTimestamp = call.block.timestamp;
    openSeaSale.buyer = buyerAdress;
    openSeaSale.seller = sellerAdress;
    openSeaSale.paymentToken = paymentTokenErc20Address;
    openSeaSale.price = price;
    openSeaSale.isPrivate = _isPrivateSale(call);

    // Build the token sold summary and create all the associated entries in the Nft <=> OpenSeaSale lookup table
    let summaryTokensSold = "";
    for (let i = 0; i < tokenIdsList.length; i++) {
      let tokenId = tokenIdsList[i];

      if (summaryTokensSold.length == 0) {
        summaryTokensSold += tokenId;
      } else {
        summaryTokensSold += "::" + tokenId;
      }

      // Get the asosciated Art Blocks token if any (might not be an AB token)
      let token = Token.load(
        generateContractSpecificId(
          Address.fromString(nftContractList[i]),
          BigInt.fromString(tokenId)
        )
      );
      if (token) {
        // Link both of them (NFT with OpenSeaSale)
        let tableEntryId = _buildTokenSaleLookupTableId(
          token.project,
          token.id,
          openSeaSaleId
        );

        let openSeaSaleLookupTable = new OpenSeaSaleLookupTable(
          tableEntryId
        );
        
        openSeaSaleLookupTable.token = token.id;
        openSeaSaleLookupTable.project = token.project;
        openSeaSaleLookupTable.openSeaSale = openSeaSale.id;
        openSeaSaleLookupTable.timestamp = openSeaSale.blockTimestamp;
        openSeaSaleLookupTable.blockNumber = openSeaSale.blockNumber;
        openSeaSaleLookupTable.save();
      }
    }

    openSeaSale.summaryTokensSold = summaryTokensSold;
    openSeaSale.save();
  }
}

/**
 * Return true if the associated sale was private.
 *
 * @param call The original call data
 * @returns true if the sale was private else false 
 */
function _isPrivateSale(call: AtomicMatch_Call): boolean {
  /**
   * If the sale was private it means the seller hardcoded the address
   * of the buyer in the order. This is translated in code with the "taker"
   * side of the "sell" order NOT being the NULL address
   */
  let addrs: Address[] = call.inputs.addrs;
  let takerOfSellOrder = addrs[9];

  return takerOfSellOrder.toHexString() != NULL_ADDRESS;
}

/**
 * Replace bytes in an array with bytes in another array, guarded by a bitmask
 *
 * @param array The original array
 * @param replacement The replacement array
 * @param mask The mask specifying which bits can be changed in the original array
 * @returns The updated byte array
 */
function _guardedArrayReplace(
  array: Bytes,
  replacement: Bytes,
  mask: Bytes
): Bytes {
  array.reverse();
  replacement.reverse();
  mask.reverse();

  let bigIntgArray = BigInt.fromUnsignedBytes(array);
  let bigIntReplacement = BigInt.fromUnsignedBytes(replacement);
  let bigIntMask = BigInt.fromUnsignedBytes(mask);

  // array |= replacement & mask;
  bigIntReplacement = bigIntReplacement.bitAnd(bigIntMask);
  bigIntgArray = bigIntgArray.bitOr(bigIntReplacement);
  // let callDataHexString = bigIntgArray.toHexString();
  return (changetype<Bytes>(ByteArray.fromBigInt(bigIntgArray).reverse()));
}

/**
 *
 * @param atomicizeCallData The ABI encoded atomicize method call used by OpenSea Smart library (WyvernAtomicizer)
 *                          to trigger bundle sales (looping over NFT and calling transferFrom for each)
 * @returns An array of 2 cells: [listOfContractAddress][listOfTokenId]
 */
function _getNftContractAddressAndTokenIdFromCallData(
  atomicizeCallData: Bytes
): string[][] {
  let dataWithoutFunctionSelector: Bytes = changetype<Bytes>(atomicizeCallData.subarray(4));
  
  // As function encoding is not handled yet by the lib, we first need to reach the offset of where the 
  // actual params are located. As they are all dynamic we can just fetch the offset of the first param
  // and then start decoding params from there as known sized types
  let offset: i32 = ethereum.decode(
    "uint256", 
    changetype<Bytes>(dataWithoutFunctionSelector)
  )!.toBigInt().toI32();
  
  // Get the length of the first array. All arrays must have same length so fetching only this one is enough
  let arrayLength: i32 = ethereum.decode(
    "uint256", 
    changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
  )!.toBigInt().toI32();
  offset += 1 * 32;
  
  // Now that we know the size of each params we can decode them one by one as know sized types
  // function atomicize(address[] addrs,uint256[] values,uint256[] calldataLengths,bytes calldatas)
  let decodedAddresses: Address[] = ethereum.decode(
    `address[${arrayLength}]`, 
    changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
  )!.toAddressArray();
  offset += arrayLength * 32;
  
  offset += 1 * 32;
  // We don't need those values, just move the offset forward
  // let decodedValues: BigInt[] = ethereum.decode(
  //   `uint256[${arrayLength}]`, 
  //   changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
  // )!.toBigIntArray();
  offset += arrayLength * 32;
  
  offset += 1 * 32;
  let decodedCalldataIndividualLengths = ethereum.decode(
    `uint256[${arrayLength}]`, 
    changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
  )!.toBigIntArray().map<i32>(e => e.toI32());
  offset += arrayLength * 32;
  
  let decodedCallDatasLength = ethereum.decode(
    "uint256", 
    changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
  )!.toBigInt().toI32();
  offset += 1 * 32;

  let callDatas: Bytes = changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset, offset + decodedCallDatasLength));

  let nftContractsAddrsList: string[] = [];
  let tokenIds: string[] = [];
  
  let calldataOffset = 0;
  for(let i = 0; i < decodedAddresses.length; i++) {
    let callDataLength = decodedCalldataIndividualLengths[1];
    let calldata: Bytes = changetype<Bytes>(callDatas.subarray(calldataOffset, calldataOffset + callDataLength));

    // Sometime the call data is not a transferFrom (ie: https://etherscan.io/tx/0xe8629bfc57ab619a442f027c46d63e1f101bd934232405fa8e8eaf156bfca848) 
    // Ignore if not transferFrom
    let functionSelector: string =  changetype<Bytes>(calldata.subarray(0,4)).toHexString();
    if(functionSelector === TRANSFER_FROM_SELECTOR) {
      nftContractsAddrsList.push(decodedAddresses[i].toHexString());
      tokenIds.push(_getSingleTokenIdFromTransferFromCallData(calldata));
    }
    calldataOffset += callDataLength;
  }

  return [nftContractsAddrsList,tokenIds];
}

/**
 *
 * @param transferFromData The ABI encoded transferFrom method call used by OpenSea Smart contract
 *                 to trigger the Nft transfer between the seller and the buyer
 * @returns The tokenId (string) of the transfer
 */
function _getSingleTokenIdFromTransferFromCallData(
  transferFromData: Bytes,
): string {

  let dataWithoutFunctionSelector = changetype<Bytes>(transferFromData.subarray(4));
  let decoded = ethereum.decode("(address,address,uint256)", dataWithoutFunctionSelector)!.toTuple();
  return decoded[2].toBigInt().toString();
}

/**
 * 
 * @param projectId The projectId id
 * @param tokenId The token id
 * @param saleId The sale id (eth tx hash)
 * @returns The corresponding lookup table id
 */
function _buildTokenSaleLookupTableId(projectId: string, tokenId: string, saleId: string): string {
  return projectId + "::" + tokenId + "::" + saleId;
}

