import { Address } from "@graphprotocol/graph-ts";

import {
  Token,
  Sale,
  SaleLookupTable,
  Contract
} from "../../../generated/schema";

import { TakerAsk, TakerBid } from "../../../generated/LooksRareExchange/LooksRareExchange";

import { generateContractSpecificId } from "../../helpers";
import { buildTokenSaleLookupTableId } from "../secondary-helpers";
import { LR_PRIVATE_SALE_STRATEGY } from "../../constants";

/**
* 
* @param event TakerAsk
* @description Event handler for the TakerAsk event. Forward call to `handleLooksRareEvents`
*/
export function handleTakerAsk(event: TakerAsk): void {
  handleSale(event);
}

/**
* 
* @param event TakerBid
* @description Event handler for the TakerBid event. Forward call to `handleLooksRareEvents`
*/
export function handleTakerBid(event: TakerBid): void {
  handleSale(event);
}

/**
* 
* @param event TakerAsk or TakerBid event from looksrare, beeing emitted when a seller accept
* an offer from a buyer (TakerAsk) or when a buyer accept to buy from a seller (TakerBid)
* @description This function handle TakerAsk/TakerBid events from LooksRare, build the associated Sale and 
* SaleLookUpTable entities and store them 
*/
function handleSale<T>(event: T): void {
  // Invalid call, not a valid event
  if (!(event instanceof TakerBid) && !(event instanceof TakerAsk)) {
    return;
  }

  let contract = Contract.load(event.params.collection.toHexString());

  // Only interested in Art Blocks sells
  if (!contract) {
    return;
  }

  // The token must already exists (minted) to be sold on LooksRare
  let token = Token.load(
    generateContractSpecificId(Address.fromString(event.params.collection.toHexString()), event.params.tokenId)
  );

  // The token must already exist (minted) to be sold on LooksRare
  if (!token) {
    return;
  }

  // Create sale
  let saleId = event.transaction.hash.toHexString();
  let sale = new Sale(saleId);
  sale.exchange = "LR_V1";
  sale.saleType = "Single";
  sale.blockNumber = event.block.number;
  sale.blockTimestamp = event.block.timestamp;

  if (event instanceof TakerAsk) {
    sale.buyer = event.params.maker;
    sale.seller = event.params.taker;
  } else {
    sale.buyer = event.params.taker;
    sale.seller = event.params.maker;
  }

  sale.paymentToken = event.params.currency;
  sale.price = event.params.price;
  sale.summaryTokensSold = token.id;
  sale.isPrivate = event.params.strategy.toHexString() == LR_PRIVATE_SALE_STRATEGY;
  sale.save();

  // Create the associated entry in the Nft <=> lookup table
  let tableEntryId = buildTokenSaleLookupTableId(
    token.project,
    token.id,
    saleId
  );

  // Create saleLookUpTable with sale and token info
  let saleLookUpTable = new SaleLookupTable(tableEntryId);
  saleLookUpTable.token = token.id;
  saleLookUpTable.project = token.project;
  saleLookUpTable.sale = sale.id;
  saleLookUpTable.timestamp = sale.blockTimestamp;
  saleLookUpTable.blockNumber = sale.blockNumber;
  saleLookUpTable.save();
}