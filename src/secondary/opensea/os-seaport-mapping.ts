import { BigInt } from "@graphprotocol/graph-ts";
import { log } from "matchstick-as";

import {
  Token,
  Sale,
  SaleLookupTable,
  Contract,
  Payment
} from "../../../generated/schema";

import { OrderFulfilled } from "../../../generated/SeaportExchange/SeaportExchange";

import { generateContractSpecificId } from "../../helpers";
import { buildTokenSaleLookupTableId } from "../secondary-helpers";

export enum ItemType {
  NATIVE,
  ERC20,
  ERC721,
  ERC1155,
  ERC721_WITH_CRITERIA,
  ERC1155_WITH_CRITERIA
}
/**
 *
 * @param event TakerAsk
 * @description Event handler for the TakerAsk event. Forward call to `handleLooksRareEvents`
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

    log.info("AA {}", [saleLookupTable.sale]);
  }

  if (numValidTokens == 0) {
    return;
  }

  let payments = new Map<string, Payment>();
  for (let i = 0; i < event.params.consideration.length; i++) {
    const considerationItem = event.params.consideration[i];

    // Skip if non-ERC20/ETH trade (Seaport supports trading ERC721, ERC1155, etc)
    if (
      considerationItem.itemType != ItemType.NATIVE &&
      considerationItem.itemType != ItemType.ERC20
    ) {
      continue;
    }

    let p: Payment | null = payments.has(considerationItem.token.toHexString())
      ? payments.get(considerationItem.token.toHexString())
      : null;

    // Create payment if haven't created yet
    if (!p) {
      p = new Payment(saleId + "-" + i.toString());
      p.sale = saleId;
      p.paymentToken = considerationItem.token;
      p.price = BigInt.zero();
      payments.set(considerationItem.token.toHexString(), p);
    }
    p.price = p.price.plus(considerationItem.amount);
    p.save();
  }

  // Create sale
  let sale = new Sale(saleId);
  sale.txHash = event.transaction.hash;
  sale.exchange = "OS_SP";
  sale.saleType = event.params.offer.length > 1 ? "Bundle" : "Single";
  sale.blockNumber = event.block.number;
  sale.blockTimestamp = event.block.timestamp;
  sale.buyer = event.params.recipient;
  sale.seller = event.params.offerer;
  sale.isPrivate = false; //isPrivateSale(call.from, addrs);
  sale.summaryTokensSold = summaryTokensSold;
  if (payments.size == 1) {
    sale.paymentToken = payments.values()[0].paymentToken;
    sale.price = payments.values()[0].price;
  }
  sale.save();

  // Lastly, save the lookup tables (must be saved AFTER project gets saved)
  for (let i = 0; i < saleLookupTables.length; i++) {
    saleLookupTables[i].save();
  }
}
