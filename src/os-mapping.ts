import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import { AtomicMatch_Call } from "../generated/WyvernExchange/WyvernExchange";

import {
  Contract,
  OpenSeaSale,
  Token,
  TokenOpenSeaSaleLookupTable
} from "../generated/schema";
import {
  ARTBLOCKS_ADDRESS,
  ARTBLOCKS_ORIGINAL_ADDRESS,
  WYVERN_ATOMICIZER_ADDRESS
} from "./constants";
import { generateContractSpecificId } from "./global-helpers";

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
  let callInputs = call.inputs;
  let uints: BigInt[] = callInputs.uints;
  let addrs: Address[] = callInputs.addrs;

  // Only interested in Art Blocks sells
  let nftContract: Address = addrs[11];
  let contract = Contract.load(nftContract.toHexString());
  if (contract != null) {
    // TODO: The price could be retrieved from the calculateMatchPrice_ method of OpenSea Smart Contract
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

    // Fetch the token ID that has been sold from the call data
    let tokenIdStr = _getSingleTokenIdFromTransferFromCallData(
      mergedCallDataStr,
      true
    );

    // The token must already exist (minted) to be sold on OpenSea
    let token = Token.load(
      generateContractSpecificId(nftContract, BigInt.fromString(tokenIdStr))
    );
    if (token != null) {
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
      openSeaSale.save();

      // Create the associated entry in the Nft <=> OpenSeaSale lookup table
      let tableEntryId = _buildTokenSaleLookupTableId(token.id, openSeaSaleId);
      let tokenOpenSeaSaleLookupTable = new TokenOpenSeaSaleLookupTable(
        tableEntryId
      );
      tokenOpenSeaSaleLookupTable.token = token.id;
      tokenOpenSeaSaleLookupTable.openSeaSale = openSeaSale.id;
      tokenOpenSeaSaleLookupTable.save();
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
    if (contract != null) {
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
      if (token != null) {
        // Link both of them (NFT with OpenSeaSale)
        let tableEntryId = _buildTokenSaleLookupTableId(
          token.id,
          openSeaSaleId
        );
        let tokenOpenSeaSaleLookupTable = new TokenOpenSeaSaleLookupTable(
          tableEntryId
        );
        tokenOpenSeaSaleLookupTable.token = token.id;
        tokenOpenSeaSaleLookupTable.openSeaSale = openSeaSale.id;
        tokenOpenSeaSaleLookupTable.save();
      }
    }

    openSeaSale.summaryTokensSold = summaryTokensSold;
    openSeaSale.save();
  }
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
): string {
  array.reverse();
  replacement.reverse();
  mask.reverse();

  let bigIntgArray = BigInt.fromUnsignedBytes(array);
  let bigIntReplacement = BigInt.fromUnsignedBytes(replacement);
  let bigIntMask = BigInt.fromUnsignedBytes(mask);

  // array |= replacement & mask;
  bigIntReplacement = bigIntReplacement.bitAnd(bigIntMask);
  bigIntgArray = bigIntgArray.bitOr(bigIntReplacement);
  let callDataHexString = bigIntgArray.toHexString();
  return callDataHexString;
}

/**
 *
 * @param atomicizeCallData The ABI encoded atomicize method call used by OpenSea Smart library (WyvernAtomicizer)
 *                          to trigger bundle sales (looping over NFT and calling transferFrom for each)
 * @returns An array of 2 cells: [listOfContractAddress][listOfTokenId]
 */
function _getNftContractAddressAndTokenIdFromCallData(
  atomicizeCallData: string
): string[][] {
  const TRAILING_0x = 2;
  const METHOD_ID_LENGTH = 8;
  const UINT_256_LENGTH = 64;

  let indexStartNbToken = TRAILING_0x + METHOD_ID_LENGTH + UINT_256_LENGTH * 4;
  let indexStopNbToken = indexStartNbToken + UINT_256_LENGTH;
  let nbTokenStr = atomicizeCallData.substring(
    indexStartNbToken,
    indexStopNbToken
  );
  let nbToken = parseI32(nbTokenStr, 16);

  // Get the associated NFT contracts
  let nftContractsAddrsList: string[] = [];
  let offset = indexStopNbToken;
  for (let i = 0; i < nbToken; i++) {
    let addrs = atomicizeCallData.substring(offset, offset + UINT_256_LENGTH);

    // Remove the 24 leading zeros
    addrs = addrs.substring(24);
    nftContractsAddrsList.push("0x" + addrs);

    // Move forward in the call data
    offset += UINT_256_LENGTH;
  }

  /**
   * After reading the contract addresses involved in the bundle sale
   * there are 2 chunks of params of length nbToken * UINT_256_LENGTH.
   *
   * Those chunks are each preceded by a "chunk metadata" of length UINT_256_LENGTH
   * Finalluy a last "chunk metadata" is set of length UINT_256_LENGTH. (3 META_CHUNKS)
   *
   *
   * After that we are reading the abiencoded data representing the transferFrom calls
   */
  const LEFT_CHUNKS = 2;
  const NB_META_CHUNKS = 3;
  offset +=
    nbToken * UINT_256_LENGTH * LEFT_CHUNKS + NB_META_CHUNKS * UINT_256_LENGTH;

  // Get the NFT token IDs
  const TRANSFER_FROM_DATA_LENGTH = METHOD_ID_LENGTH + UINT_256_LENGTH * 3;
  let tokenIdsList: string[] = [];
  for (let i = 0; i < nbToken; i++) {
    let transferFromData = atomicizeCallData.substring(
      offset,
      offset + TRANSFER_FROM_DATA_LENGTH
    );
    let tokenIdstr = _getSingleTokenIdFromTransferFromCallData(
      transferFromData,
      false
    );
    tokenIdsList.push(tokenIdstr);

    // Move forward in the call data
    offset += TRANSFER_FROM_DATA_LENGTH;
  }

  return [nftContractsAddrsList, tokenIdsList];
}

/**
 *
 * @param transferFromData The ABI encoded transferFrom method call used by OpenSea Smart contract
 *                 to trigger the Nft transfer between the seller and the buyer
 * @returns The tokenId (string) of the transfer
 */
function _getSingleTokenIdFromTransferFromCallData(
  transferFromData: string,
  trailing0x: boolean
): string {
  let TRAILING_0x = trailing0x ? 2 : 0;
  const METHOD_ID_LENGTH = 8;
  const UINT_256_LENGTH = 64;

  /**
   * The calldata input is formated as:
   * Format => METHOD_ID (transferFrom) | FROM | TO | TOKEN_ID
   * Size   =>            X             |   Y  |  Y |    Y
   *      Where :
   *          - X = 32 bits (8 hex chars)
   *          - Y = 256 bits (64 hex chars)
   *
   * +2 | 0 chars for the "0x" leading part
   */
  let tokenIdHexStr: string = transferFromData.substring(
    TRAILING_0x + METHOD_ID_LENGTH + UINT_256_LENGTH * 2
  );
  let tokenId = parseI64(tokenIdHexStr, 16);
  let tokenIdStr: string = tokenId.toString();

  return tokenIdStr;
}

/**
 *
 * @param tokenId The token id
 * @param saleId The sale id (eth tx hash)
 * @returns The corresponding lookup table id
 */
function _buildTokenSaleLookupTableId(tokenId: string, saleId: string): string {
  return tokenId + "<=>" + saleId;
}
