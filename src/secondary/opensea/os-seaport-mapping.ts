import { log } from "matchstick-as";

import {
  Token,
  Sale,
  SaleLookupTable,
  Contract,
  Payment
} from "../../../generated/schema";

import {
  OrderFulfilled,
  OrderFulfilledOfferStruct,
  OrderFulfilledConsiderationStruct
} from "../../../generated/SeaportExchange/SeaportExchange";
import { OS_SP, NATIVE, ERC20, ERC721, ERC1155 } from "../../constants";

import { generateContractSpecificId } from "../../helpers";
import { buildTokenSaleLookupTableId } from "../secondary-helpers";

// Enum for Seaport's ItemType
export enum ItemType {
  NATIVE,
  ERC20,
  ERC721,
  ERC1155,
  ERC721_WITH_CRITERIA,
  ERC1155_WITH_CRITERIA
}

// Array to map the above ItemType enum to their string counterparts
// (With_Criteria entries map to their regular counterpart)
const itemTypeMapping = [NATIVE, ERC20, ERC721, ERC1155, ERC721, ERC1155];

// Checks if Order is a private sale - returns true if so
// Seaport private sales have the offer token in the consideration struct as well
function isPrivateSale(
  offer: OrderFulfilledOfferStruct[],
  consideration: OrderFulfilledConsiderationStruct[]
): boolean {
  let priv = false;
  for (let i = 0; i < offer.length; i++) {
    let o = offer[i];
    for (let j = 0; j < consideration.length; j++) {
      let c = consideration[j];
      // Private sale if offer item also in consideration array
      if (
        o.itemType == c.itemType &&
        o.token == c.token &&
        o.identifier == c.identifier
      ) {
        priv = true;
      }
    }
  }
  return priv;
}

/**
 * @param event OrderFulfilled
 * @description Event handler for the Seaport OrderFulfilled event (which happens on sale)
 */
export function handleOrderFulfilled(event: OrderFulfilled): void {
  let bundleIncludesArtBlocks = false;

  for (let i = 0; i < event.params.offer.length; i++) {
    let contract = Contract.load(event.params.offer[i].token.toHexString());
    if (contract) {
      bundleIncludesArtBlocks = true;
      break;
    }
  }

  // Only interested in Art Blocks sells
  if (!bundleIncludesArtBlocks) {
    return;
  }

  // Loop over every item sold in the trade
  let summaryTokensSold = "";
  let numValidTokens = 0;
  let saleId = event.params.orderHash.toHexString();
  let saleLookupTables: SaleLookupTable[] = [];
  for (let i = 0; i < event.params.offer.length; i++) {
    let offerItem = event.params.offer[i];

    let fullTokenId = generateContractSpecificId(
      offerItem.token,
      offerItem.identifier
    );

    if (summaryTokensSold.length == 0) {
      summaryTokensSold += fullTokenId;
    } else {
      summaryTokensSold += "::" + fullTokenId;
    }

    // Get the asosciated Art Blocks token if any (might not be an AB token)
    let token = Token.load(fullTokenId);

    // Skip if this is not a token associated with Art Blocks
    if (!token) {
      continue;
    }
    numValidTokens++;

    // Link both of them (NFT with sale)
    let tableEntryId = buildTokenSaleLookupTableId(
      token.project,
      token.id,
      saleId
    );

    let saleLookupTable = new SaleLookupTable(tableEntryId);

    saleLookupTable.token = token.id;
    saleLookupTable.project = token.project;
    saleLookupTable.sale = saleId;
    saleLookupTable.timestamp = event.block.timestamp;
    saleLookupTable.blockNumber = event.block.number;
    saleLookupTables.push(saleLookupTable);
  }

  if (numValidTokens == 0) {
    return;
  }

  let payments = new Array<Payment>();
  for (let i = 0; i < event.params.consideration.length; i++) {
    const considerationItem = event.params.consideration[i];

    let p = new Payment(saleId + "-" + i.toString());
    p.sale = saleId;
    p.paymentType = itemTypeMapping[considerationItem.itemType];
    p.paymentToken = considerationItem.token;
    p.price = considerationItem.amount;
    p.recipient = considerationItem.recipient;
    payments.push(p);
  }

  // Create sale
  let sale = new Sale(saleId);
  sale.txHash = event.transaction.hash;
  sale.exchange = OS_SP;
  sale.saleType = event.params.offer.length > 1 ? "Bundle" : "Single";
  sale.blockNumber = event.block.number;
  sale.blockTimestamp = event.block.timestamp;
  sale.buyer = event.params.recipient;
  sale.seller = event.params.offerer;
  sale.isPrivate = isPrivateSale(
    event.params.offer,
    event.params.consideration
  );
  sale.summaryTokensSold = summaryTokensSold;
  sale.save();

  for (let i = 0; i < payments.length; i++) {
    payments[i].save();
  }
  // Lastly, save the lookup tables (must be saved AFTER sale gets saved)
  for (let i = 0; i < saleLookupTables.length; i++) {
    saleLookupTables[i].save();
  }
}
