import { Address, Bytes, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";
import {
  TakerBid,
  TakerAsk
} from "../../../../generated/LooksRareExchange/LooksRareExchange";
import {
  DEFAULT_AMOUNT,
  DEFAULT_COLLECTION,
  DEFAULT_CURRENCY,
  DEFAULT_MAKER,
  DEFAULT_ORDER_HASH,
  DEFAULT_ORDER_NONCE,
  DEFAULT_PRICE,
  DEFAULT_STRATEGY,
  DEFAULT_TAKER,
  DEFAULT_TOKEN_ID
} from "../../shared-helpers";

export function createTakerBidEvent(
  isPrivateSale: boolean,
  orderHashParam: string = DEFAULT_ORDER_HASH,
  orderNonceParam: BigInt = DEFAULT_ORDER_NONCE,
  takerParam: Address = DEFAULT_TAKER,
  makerParam: Address = DEFAULT_MAKER,
  strategyParam: Address = DEFAULT_STRATEGY,
  currencyParam: Address = DEFAULT_CURRENCY,
  collectionParam: Address = DEFAULT_COLLECTION,
  tokenIdParam: BigInt = DEFAULT_TOKEN_ID,
  amountParam: BigInt = DEFAULT_AMOUNT,
  priceParam: BigInt = DEFAULT_PRICE
): TakerBid {
  let strategyAddress = strategyParam;
  if (isPrivateSale) {
    strategyAddress = Address.fromString(
      "0x58d83536d3efedb9f7f2a1ec3bdaad2b1a4dd98c"
    );
  }

  let mockEvent = newMockEvent();
  let takerBidEvent = new TakerBid(
    mockEvent.address,
    mockEvent.logIndex,
    mockEvent.transactionLogIndex,
    mockEvent.logType,
    mockEvent.block,
    mockEvent.transaction,
    mockEvent.parameters
  );
  let orderHash = new ethereum.EventParam(
    "orderHash",
    ethereum.Value.fromFixedBytes(
      changetype<Bytes>(Bytes.fromHexString(orderHashParam))
    )
  );
  let orderNonce = new ethereum.EventParam(
    "orderNonce",
    ethereum.Value.fromUnsignedBigInt(orderNonceParam)
  );
  let taker = new ethereum.EventParam(
    "taker",
    ethereum.Value.fromAddress(takerParam)
  );
  let maker = new ethereum.EventParam(
    "maker",
    ethereum.Value.fromAddress(makerParam)
  );
  let strategy = new ethereum.EventParam(
    "strategy",
    ethereum.Value.fromAddress(strategyAddress)
  );
  let currency = new ethereum.EventParam(
    "currency",
    ethereum.Value.fromAddress(currencyParam)
  );
  let collection = new ethereum.EventParam(
    "collection",
    ethereum.Value.fromAddress(collectionParam)
  );
  let tokenId = new ethereum.EventParam(
    "tokenId",
    ethereum.Value.fromUnsignedBigInt(tokenIdParam)
  );
  let amount = new ethereum.EventParam(
    "amount",
    ethereum.Value.fromUnsignedBigInt(amountParam)
  );
  let price = new ethereum.EventParam(
    "price",
    ethereum.Value.fromUnsignedBigInt(priceParam)
  );

  takerBidEvent.parameters = new Array();
  takerBidEvent.parameters.push(orderHash);
  takerBidEvent.parameters.push(orderNonce);
  takerBidEvent.parameters.push(taker);
  takerBidEvent.parameters.push(maker);
  takerBidEvent.parameters.push(strategy);
  takerBidEvent.parameters.push(currency);
  takerBidEvent.parameters.push(collection);
  takerBidEvent.parameters.push(tokenId);
  takerBidEvent.parameters.push(amount);
  takerBidEvent.parameters.push(price);

  return takerBidEvent;
}

export function createTakerAskEvent(
  isPrivateSale: boolean,
  orderHashParam: string = DEFAULT_ORDER_HASH,
  orderNonceParam: BigInt = DEFAULT_ORDER_NONCE,
  takerParam: Address = DEFAULT_TAKER,
  makerParam: Address = DEFAULT_MAKER,
  strategyParam: Address = DEFAULT_STRATEGY,
  currencyParam: Address = DEFAULT_CURRENCY,
  collectionParam: Address = DEFAULT_COLLECTION,
  tokenIdParam: BigInt = DEFAULT_TOKEN_ID,
  amountParam: BigInt = DEFAULT_AMOUNT,
  priceParam: BigInt = DEFAULT_PRICE
): TakerAsk {
  let strategyAddress = strategyParam;
  if (isPrivateSale) {
    strategyAddress = Address.fromString(
      "0x58d83536d3efedb9f7f2a1ec3bdaad2b1a4dd98c"
    );
  }

  let mockEvent = newMockEvent();
  let takerAsk = new TakerAsk(
    mockEvent.address,
    mockEvent.logIndex,
    mockEvent.transactionLogIndex,
    mockEvent.logType,
    mockEvent.block,
    mockEvent.transaction,
    mockEvent.parameters
  );
  let orderHash = new ethereum.EventParam(
    "orderHash",
    ethereum.Value.fromFixedBytes(
      changetype<Bytes>(Bytes.fromHexString(orderHashParam))
    )
  );
  let orderNonce = new ethereum.EventParam(
    "orderNonce",
    ethereum.Value.fromUnsignedBigInt(orderNonceParam)
  );
  let taker = new ethereum.EventParam(
    "taker",
    ethereum.Value.fromAddress(takerParam)
  );
  let maker = new ethereum.EventParam(
    "maker",
    ethereum.Value.fromAddress(makerParam)
  );
  let strategy = new ethereum.EventParam(
    "strategy",
    ethereum.Value.fromAddress(strategyAddress)
  );
  let currency = new ethereum.EventParam(
    "currency",
    ethereum.Value.fromAddress(currencyParam)
  );
  let collection = new ethereum.EventParam(
    "collection",
    ethereum.Value.fromAddress(collectionParam)
  );
  let tokenId = new ethereum.EventParam(
    "tokenId",
    ethereum.Value.fromUnsignedBigInt(tokenIdParam)
  );
  let amount = new ethereum.EventParam(
    "amount",
    ethereum.Value.fromUnsignedBigInt(amountParam)
  );
  let price = new ethereum.EventParam(
    "price",
    ethereum.Value.fromUnsignedBigInt(priceParam)
  );

  takerAsk.parameters = new Array();
  takerAsk.parameters.push(orderHash);
  takerAsk.parameters.push(orderNonce);
  takerAsk.parameters.push(taker);
  takerAsk.parameters.push(maker);
  takerAsk.parameters.push(strategy);
  takerAsk.parameters.push(currency);
  takerAsk.parameters.push(collection);
  takerAsk.parameters.push(tokenId);
  takerAsk.parameters.push(amount);
  takerAsk.parameters.push(price);

  return takerAsk;
}
