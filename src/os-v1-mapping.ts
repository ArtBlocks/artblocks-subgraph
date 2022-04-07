import {
  Address,
  BigInt,
} from "@graphprotocol/graph-ts";

import { AtomicMatch_Call, } from "../generated/WyvernExchange/WyvernExchange";

import {
  Contract,
  OpenSeaSale,
  Token,
  OpenSeaSaleLookupTable
} from "../generated/schema";

import { WYVERN_ATOMICIZER_ADDRESS, } from "./constants";

import { generateContractSpecificId } from "./helpers";

import {
  buildTokenSaleLookupTableId,
  calculateMatchPrice,
  getNftContractAddressAndTokenIdFromAtomicizerCallData,
  getSingleTokenIdFromTransferFromCallData,
  guardedArrayReplace,
  isPrivateSale
} from "./os-helper";

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
  let addrs: Address[] = callInputs.addrs;
  let uints: BigInt[] = callInputs.uints;
  let feeMethodsSidesKindsHowToCalls =
    callInputs.feeMethodsSidesKindsHowToCalls;

  // Only interested in Art Blocks sells
  let nftContract: Address = addrs[11];
  let contract = Contract.load(nftContract.toHexString());
  if (contract) {
    let price: BigInt = calculateMatchPrice(
      1,
      feeMethodsSidesKindsHowToCalls[1],
      feeMethodsSidesKindsHowToCalls[2],
      uints[4],
      uints[5],
      uints[6],
      uints[7],
      feeMethodsSidesKindsHowToCalls[5],
      feeMethodsSidesKindsHowToCalls[6],
      uints[13],
      uints[14],
      uints[15],
      uints[16],
      addrs[10]
    );

    let buyerAdress: Address = addrs[1]; // Buyer.maker
    let sellerAdress: Address = addrs[8]; // Saler.maker
    let paymentTokenErc20Address: Address = addrs[6];

    // Merge sell order data with buy order data (just like they are doing in their contract)
    let mergedCallData = guardedArrayReplace(
      callInputs.calldataBuy,
      callInputs.calldataSell,
      callInputs.replacementPatternBuy
    );

    // Fetch the token ID that has been sold from the call data
    let tokenIdStr = getSingleTokenIdFromTransferFromCallData(mergedCallData);

    // The token must already exist (minted) to be sold on OpenSea
    let token = Token.load(
      generateContractSpecificId(nftContract, BigInt.fromString(tokenIdStr))
    );

    if (token) {
      // Create the OpenSeaSale
      let openSeaSaleId = call.transaction.hash.toHexString();
      let openSeaSale = new OpenSeaSale(openSeaSaleId);
      openSeaSale.openSeaVersion = "V1";
      openSeaSale.saleType = "Single";
      openSeaSale.blockNumber = call.block.number;
      openSeaSale.blockTimestamp = call.block.timestamp;
      openSeaSale.buyer = buyerAdress;
      openSeaSale.seller = sellerAdress;
      openSeaSale.paymentToken = paymentTokenErc20Address;
      openSeaSale.price = price;
      openSeaSale.summaryTokensSold = token.id;
      openSeaSale.isPrivate = isPrivateSale(addrs);
      openSeaSale.save();

      // Create the associated entry in the Nft <=> OpenSeaSale lookup table
      let tableEntryId = buildTokenSaleLookupTableId(
        token.project,
        token.id,
        openSeaSaleId
      );

      let openSeaSaleLookupTable = new OpenSeaSaleLookupTable(tableEntryId);
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
  let callInputs = call.inputs;
  let addrs: Address[] = callInputs.addrs;
  let uints: BigInt[] = callInputs.uints;
  let feeMethodsSidesKindsHowToCalls =
    callInputs.feeMethodsSidesKindsHowToCalls;

  let price: BigInt = calculateMatchPrice(
    1,
    feeMethodsSidesKindsHowToCalls[1],
    feeMethodsSidesKindsHowToCalls[2],
    uints[4],
    uints[5],
    uints[6],
    uints[7],
    feeMethodsSidesKindsHowToCalls[5],
    feeMethodsSidesKindsHowToCalls[6],
    uints[13],
    uints[14],
    uints[15],
    uints[16],
    addrs[10]
  );

  let buyerAdress: Address = addrs[1]; // Buyer.maker
  let sellerAdress: Address = addrs[8]; // Saler.maker
  let paymentTokenErc20Address: Address = addrs[6];

  // Merge sell order data with buy order data (just like they are doing in their contract)
  let mergedCallDataStr = guardedArrayReplace(
    callInputs.calldataBuy,
    callInputs.calldataSell,
    callInputs.replacementPatternBuy
  );

  // Fetch the token IDs list that has been sold from the call data for this bundle sale
  let results = getNftContractAddressAndTokenIdFromAtomicizerCallData(1, mergedCallDataStr);
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
    openSeaSale.openSeaVersion = "V1";
    openSeaSale.saleType = "Bundle";
    openSeaSale.blockNumber = call.block.number;
    openSeaSale.blockTimestamp = call.block.timestamp;
    openSeaSale.buyer = buyerAdress;
    openSeaSale.seller = sellerAdress;
    openSeaSale.paymentToken = paymentTokenErc20Address;
    openSeaSale.price = price;
    openSeaSale.isPrivate = isPrivateSale(addrs);

    // Build the token sold summary and create all the associated entries in the Nft <=> OpenSeaSale lookup table
    let summaryTokensSold = "";
    for (let i = 0; i < tokenIdsList.length; i++) {
      let tokenId = tokenIdsList[i];

      let fullTokenId = generateContractSpecificId(
        Address.fromString(nftContractList[i]),
        BigInt.fromString(tokenId)
      );

      if (summaryTokensSold.length == 0) {
        summaryTokensSold += fullTokenId;
      } else {
        summaryTokensSold += "::" + fullTokenId;
      }

      // Get the asosciated Art Blocks token if any (might not be an AB token)
      let token = Token.load(fullTokenId);

      if (token) {
        // Link both of them (NFT with OpenSeaSale)
        let tableEntryId = buildTokenSaleLookupTableId(
          token.project,
          token.id,
          openSeaSaleId
        );

        let openSeaSaleLookupTable = new OpenSeaSaleLookupTable(tableEntryId);

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
