import { log, newMockEvent } from "matchstick-as/assembly/index";
import { Token, Contract } from "../../../generated/schema";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  TakerAsk,
  TakerBid
} from "../../../generated/LooksRareExchange/LooksRareExchange";
import { generateContractSpecificId } from "../../../src/helpers";
import {
  OrderFulfilled,
  OrderFulfilledConsiderationStruct,
  OrderFulfilledOfferStruct
} from "../../../generated/SeaportExchange/SeaportExchange";
import { ItemType } from "../../../src/secondary/opensea/os-seaport-mapping";

export const DEFAULT_ORDER_HASH =
  "0xbc5a2acf703138c9562adf29a4131756ef6fe70f7a03c08cbc8a4fd22d53f1a7";
export const DEFAULT_ORDER_NONCE = "48";
export const DEFAULT_TAKER = "0x258a5e28aa40aef3c2c4cdf728b11dd9dd2b8bcd";
export const DEFAULT_MAKER = "0x26a6434385cd63a88450ea06e2b2256979400b29";
export const DEFAULT_STRATEGY = "0x56244bb70cbd3ea9dc8007399f61dfc065190031";
export const DEFAULT_CURRENCY = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
export const DEFAULT_COLLECTION = "0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f";
export const DEFAULT_PROJECT_ID = "18";
export const DEFAULT_TOKEN_ID = "7019";
export const DEFAULT_AMOUNT = "1";
export const DEFAULT_PRICE = "700000000000000000";
export const DEFAULT_ZONE = "0x004C00500000aD104D7DBd00e3ae0A5C00560C00";

const MOCK_AB_ADDRESS = "0x6C093Fe8bc59e1e0cAe2Ec10F0B717D3D182056B";
const MOCK_OS_ADDRESS = "0x5b3256965e7C3cF26E11FCAf296DfC8807C01073";

export function addNewContractToStore(): Contract {
  let contract = new Contract(DEFAULT_COLLECTION);
  contract.save();

  return contract;
}

export function addNewTokenToStore(
  collection: string = DEFAULT_COLLECTION,
  projectId: string = DEFAULT_PROJECT_ID,
  tokenId: string = DEFAULT_TOKEN_ID
): Token {
  let token = new Token(
    generateContractSpecificId(
      Address.fromString(collection),
      BigInt.fromString(tokenId)
    )
  );
  token.project = generateContractSpecificId(
    Address.fromString(collection),
    BigInt.fromString(projectId)
  );
  token.save();

  return token;
}

export function createOrderFulfilledEvent(
  isPrivateSale: boolean,
  bundle: boolean = false,
  orderHashParam: string = DEFAULT_ORDER_HASH,
  recipientParam: string = DEFAULT_TAKER,
  offererParam: string = DEFAULT_MAKER,
  currencyParam: string = DEFAULT_CURRENCY,
  collectionParam: string = DEFAULT_COLLECTION,
  tokenIdParam: string = DEFAULT_TOKEN_ID,
  zoneParam: string = DEFAULT_ZONE,
  priceParam: string = DEFAULT_PRICE,
  abAddr: string = MOCK_AB_ADDRESS,
  osAddr: string = MOCK_OS_ADDRESS
): OrderFulfilled {
  let mockEvent = newMockEvent();

  let orderFulfilledEvent = new OrderFulfilled(
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
  let offerrer = new ethereum.EventParam(
    "offerrer",
    ethereum.Value.fromAddress(Address.fromString(offererParam))
  );

  let zone = new ethereum.EventParam(
    "zone",
    ethereum.Value.fromAddress(Address.fromString(zoneParam))
  );

  let recipient = new ethereum.EventParam(
    "recipient",
    ethereum.Value.fromAddress(Address.fromString(recipientParam))
  );

  let numOrders = bundle ? 2 : 1;
  let orderTupleArray = new Array<ethereum.Tuple>();
  for (let i = 0; i < numOrders; i++) {
    let orderTuple = new ethereum.Tuple();

    orderTuple.push(ethereum.Value.fromI32(ItemType.ERC721));
    orderTuple.push(
      ethereum.Value.fromAddress(Address.fromString(collectionParam))
    );
    orderTuple.push(
      ethereum.Value.fromUnsignedBigInt(
        BigInt.fromString(tokenIdParam).plus(BigInt.fromI32(i))
      )
    );
    orderTuple.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)));
    orderTupleArray.push(orderTuple);
  }

  let offer = new ethereum.EventParam(
    "offer",
    ethereum.Value.fromTupleArray(orderTupleArray)
  );

  let considerationTupleArray = new Array<ethereum.Tuple>();
  considerationTupleArray.push(new ethereum.Tuple());
  considerationTupleArray.push(new ethereum.Tuple());
  considerationTupleArray.push(new ethereum.Tuple());

  for (let i = 0; i < considerationTupleArray.length; i++) {
    considerationTupleArray[i].push(ethereum.Value.fromI32(ItemType.ERC20));
    considerationTupleArray[i].push(
      ethereum.Value.fromAddress(Address.fromString(currencyParam))
    );
    considerationTupleArray[i].push(
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
    );
    let addr = i == 0 ? recipientParam : i == 1 ? abAddr : osAddr;
    let percent = i == 0 ? 0.9 : i == 1 ? 0.075 : 0.025;

    considerationTupleArray[i].push(
      ethereum.Value.fromUnsignedBigInt(
        BigInt.fromI64(i64(parseInt(priceParam) * percent))
      )
    );
    considerationTupleArray[i].push(
      ethereum.Value.fromAddress(Address.fromString(addr))
    );
  }

  let consideration = new ethereum.EventParam(
    "consideration",
    ethereum.Value.fromTupleArray(considerationTupleArray)
  );

  orderFulfilledEvent.parameters = new Array();
  orderFulfilledEvent.parameters.push(orderHash);
  orderFulfilledEvent.parameters.push(offerrer);
  orderFulfilledEvent.parameters.push(zone);
  orderFulfilledEvent.parameters.push(recipient);
  orderFulfilledEvent.parameters.push(offer);
  orderFulfilledEvent.parameters.push(consideration);

  return orderFulfilledEvent;
}

export function createTakerBidEvent(
  isPrivateSale: boolean,
  orderHashParam: string = DEFAULT_ORDER_HASH,
  orderNonceParam: string = DEFAULT_ORDER_NONCE,
  takerParam: string = DEFAULT_TAKER,
  makerParam: string = DEFAULT_MAKER,
  strategyParam: string = DEFAULT_STRATEGY,
  currencyParam: string = DEFAULT_CURRENCY,
  collectionParam: string = DEFAULT_COLLECTION,
  tokenIdParam: string = DEFAULT_TOKEN_ID,
  amountParam: string = DEFAULT_AMOUNT,
  priceParam: string = DEFAULT_PRICE
): TakerBid {
  let strategyAddress = strategyParam;
  if (isPrivateSale) {
    strategyAddress = "0x58d83536d3efedb9f7f2a1ec3bdaad2b1a4dd98c";
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
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(orderNonceParam))
  );
  let taker = new ethereum.EventParam(
    "taker",
    ethereum.Value.fromAddress(Address.fromString(takerParam))
  );
  let maker = new ethereum.EventParam(
    "maker",
    ethereum.Value.fromAddress(Address.fromString(makerParam))
  );
  let strategy = new ethereum.EventParam(
    "strategy",
    ethereum.Value.fromAddress(Address.fromString(strategyAddress))
  );
  let currency = new ethereum.EventParam(
    "currency",
    ethereum.Value.fromAddress(Address.fromString(currencyParam))
  );
  let collection = new ethereum.EventParam(
    "collection",
    ethereum.Value.fromAddress(Address.fromString(collectionParam))
  );
  let tokenId = new ethereum.EventParam(
    "tokenId",
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(tokenIdParam))
  );
  let amount = new ethereum.EventParam(
    "amount",
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(amountParam))
  );
  let price = new ethereum.EventParam(
    "price",
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(priceParam))
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
  orderNonceParam: string = DEFAULT_ORDER_NONCE,
  takerParam: string = DEFAULT_TAKER,
  makerParam: string = DEFAULT_MAKER,
  strategyParam: string = DEFAULT_STRATEGY,
  currencyParam: string = DEFAULT_CURRENCY,
  collectionParam: string = DEFAULT_COLLECTION,
  tokenIdParam: string = DEFAULT_TOKEN_ID,
  amountParam: string = DEFAULT_AMOUNT,
  priceParam: string = DEFAULT_PRICE
): TakerAsk {
  let strategyAddress = strategyParam;
  if (isPrivateSale) {
    strategyAddress = "0x58d83536d3efedb9f7f2a1ec3bdaad2b1a4dd98c";
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
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(orderNonceParam))
  );
  let taker = new ethereum.EventParam(
    "taker",
    ethereum.Value.fromAddress(Address.fromString(takerParam))
  );
  let maker = new ethereum.EventParam(
    "maker",
    ethereum.Value.fromAddress(Address.fromString(makerParam))
  );
  let strategy = new ethereum.EventParam(
    "strategy",
    ethereum.Value.fromAddress(Address.fromString(strategyAddress))
  );
  let currency = new ethereum.EventParam(
    "currency",
    ethereum.Value.fromAddress(Address.fromString(currencyParam))
  );
  let collection = new ethereum.EventParam(
    "collection",
    ethereum.Value.fromAddress(Address.fromString(collectionParam))
  );
  let tokenId = new ethereum.EventParam(
    "tokenId",
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(tokenIdParam))
  );
  let amount = new ethereum.EventParam(
    "amount",
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(amountParam))
  );
  let price = new ethereum.EventParam(
    "price",
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(priceParam))
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
