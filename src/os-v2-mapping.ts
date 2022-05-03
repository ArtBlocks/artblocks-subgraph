import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";

import {
  Contract,
  Token,
  Sale,
  SaleLookupTable
} from "../generated/schema";

import { AtomicMatch_Call } from "../generated/WyvernExchangeWithBulkCancellations/WyvernExchangeWithBulkCancellations";

import { WYVERN_ATOMICIZER_ADDRESS, WYVERN_MERKLE_ADDRESS } from "./constants";

import { generateContractSpecificId } from "./helpers";

import {
  buildTokenSaleLookupTableId,
  calculateMatchPrice,
  getNftContractAddressAndTokenIdFromAtomicizerCallData,
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
  } else if (saleTargetAddressStr == WYVERN_MERKLE_ADDRESS) {
    /**
     * In case of normal "single asset sale", the saleTarget input is
     * set to the MerkleValidator contract.
     */
    _handleSingleAssetSale(call);
  } else {
    log.warning("[OSV2 handler] Unexpected target in tx {}: {}", [call.transaction.hash.toHexString(), saleTargetAddressStr]);
  }
}

/** Private implementation */

/**
 *
 * @param call The AtomicMatch call that triggered the handleAtomicMatch_ call handler.
 * @description This function is used to handle the case of a "normal" sale made from OpenSea V2.
 *              A "normal" sale is a sale that is not a bundle (only contains one asset).
 */
function _handleSingleAssetSale(call: AtomicMatch_Call): void {
  let callInputs = call.inputs;
  let addrs: Address[] = callInputs.addrs;
  let uints: BigInt[] = callInputs.uints;
  let feeMethodsSidesKindsHowToCalls =
    callInputs.feeMethodsSidesKindsHowToCalls;

  // Merge sell order data with buy order data (just like they are doing in their contract)
  let mergedCallData = guardedArrayReplace(
    callInputs.calldataBuy,
    callInputs.calldataSell,
    callInputs.replacementPatternBuy
  );

  //decode data (from, to, nft token address, token id), here's the difference with V1
  //We need to retrieve nft token contract and token id from call data
  let decodedCallData = _retrieveDecodedDataFromCallData(mergedCallData);

  let nftContract: Address = decodedCallData[2].toAddress();
  let contract = Contract.load(nftContract.toHexString());

  // Only interested in Art Blocks sales
  if (!contract) {
    return;
  }

  let price: BigInt = calculateMatchPrice(
    2,
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

  // Fetch the token ID that has been sold from the call data
  let tokenIdStr = decodedCallData[3].toBigInt().toString();

  let token = Token.load(
    generateContractSpecificId(nftContract, BigInt.fromString(tokenIdStr))
  );
  
  // The token must already exist (minted) to be sold on OpenSea
  if (!token) {
    return;
  }

  // Create the OpenSeaSale
  let saleId = call.transaction.hash.toHexString();
  let sale = new Sale(saleId);
  sale.exchange = "OSV2";
  sale.saleType = "Single";
  sale.blockNumber = call.block.number;
  sale.blockTimestamp = call.block.timestamp;
  sale.buyer = buyerAdress;
  sale.seller = sellerAdress;
  sale.paymentToken = paymentTokenErc20Address;
  sale.price = price;
  sale.summaryTokensSold = token.id;
  sale.isPrivate = isPrivateSale(call.from, addrs);
  sale.save();

  // Create the associated entry in the Nft <=> OpenSeaSale lookup table
  let tableEntryId = buildTokenSaleLookupTableId(
    token.project,
    token.id,
    saleId
  );

  let saleLookUpTable = new SaleLookupTable(tableEntryId);
  saleLookUpTable.token = token.id;
  saleLookUpTable.project = token.project;
  saleLookUpTable.sale = sale.id;
  saleLookUpTable.timestamp = sale.blockTimestamp;
  saleLookUpTable.blockNumber = sale.blockNumber;
  saleLookUpTable.save();
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
    2,
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
  let results = getNftContractAddressAndTokenIdFromAtomicizerCallData(
    2,
    mergedCallDataStr
  );
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
  if (!bundleIncludesArtBlocks) {
    return;
  }

  // Create the sale
  let saleId = call.transaction.hash.toHexString();
  let sale = new Sale(saleId);
  sale.exchange = "OSV2";
  sale.saleType = "Bundle";
  sale.blockNumber = call.block.number;
  sale.blockTimestamp = call.block.timestamp;
  sale.buyer = buyerAdress;
  sale.seller = sellerAdress;
  sale.paymentToken = paymentTokenErc20Address;
  sale.price = price;
  sale.isPrivate = isPrivateSale(call.from, addrs);

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

    if (!token) {
      continue;
    }

    // Link both of them (NFT with OpenSeaSale)
    let tableEntryId = buildTokenSaleLookupTableId(
      token.project,
      token.id,
      saleId
    );

    let saleLookUpTable = new SaleLookupTable(tableEntryId);
    saleLookUpTable.token = token.id;
    saleLookUpTable.project = token.project;
    saleLookUpTable.sale = sale.id;
    saleLookUpTable.timestamp = sale.blockTimestamp;
    saleLookUpTable.blockNumber = sale.blockNumber;
    saleLookUpTable.save();
  }

  sale.summaryTokensSold = summaryTokensSold;
  sale.save();
}

/**
 *
 * @param callData The ABI encoded method call used by OpenSea Smart contract V2
 *                 to trigger the Nft transfer between the seller and the buyer
 * @returns Ethereum tuple corresponding to decoded call data, in the order: from, to, nft token address, token id
 */
export function _retrieveDecodedDataFromCallData(
  callData: Bytes
): ethereum.Tuple {
  let dataWithoutFunctionSelector = changetype<Bytes>(callData.subarray(4));
  let decoded = ethereum
    .decode("(address,address,address,uint256)", dataWithoutFunctionSelector)!
    .toTuple();
  return decoded;
}