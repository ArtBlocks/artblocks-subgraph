import { newMockEvent } from 'matchstick-as/assembly/index'
import {
    Token,
    Contract,
} from "../../../../generated/schema";
import {
    Address,
    BigInt,
    ethereum
} from "@graphprotocol/graph-ts";
import {
    TakerAsk,
    TakerBid
} from "../../../../generated/LooksRareExchange/LooksRareExchange";
import { generateContractSpecificId } from '../../../../src/helpers';

const DEFAULT_ORDER_HASH = "0xbc5a2acf703138c9562adf29a4131756ef6fe70f7a03c08cbc8a4fd22d53f1a7";
const DEFAULT_ORDER_NONCE = "48";
const DEFAULT_TAKER = "0x258a5e28aa40aef3c2c4cdf728b11dd9dd2b8bcd";
const DEFAULT_MAKER = "0x26a6434385cd63a88450ea06e2b2256979400b29";
const DEFAULT_STRATEGY = "0x56244bb70cbd3ea9dc8007399f61dfc065190031";
const DEFAULT_CURRENCY = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const DEFAULT_COLLECTION = "0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f";
const DEFAULT_TOKEN_ID = "7019";
const DEFAULT_AMOUNT = "1";
const DEFAULT_PRICE = "700000000000000000";

export function addNewContractToStore(): Contract {
    let contract = new Contract("0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f");
    contract.save();

    return contract;
}

export function addNewTokenToStore(): Token {
    let token = new Token(generateContractSpecificId(Address.fromString("0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f"), BigInt.fromString('7019')));
    token.save();

    return token;
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
    priceParam: string = DEFAULT_PRICE,
): TakerBid {

    let strategyAddress = strategyParam;
    if (isPrivateSale) {
        strategyAddress = "0x58d83536d3efedb9f7f2a1ec3bdaad2b1a4dd98c";
    }
    // Create takerBid event
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
    //bytes32,uint256,indexed address,indexed address,indexed address,address,address,uint256,uint256,uint256
    let orderHash = new ethereum.EventParam('orderHash', ethereum.Value.fromString(orderHashParam));
    let orderNonce = new ethereum.EventParam('orderNonce', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(orderNonceParam)));
    let taker = new ethereum.EventParam('taker', ethereum.Value.fromAddress(Address.fromString(takerParam)));
    let maker = new ethereum.EventParam('maker', ethereum.Value.fromAddress(Address.fromString(makerParam)));
    let strategy = new ethereum.EventParam('strategy', ethereum.Value.fromAddress(Address.fromString(strategyAddress)));
    let currency = new ethereum.EventParam('currency', ethereum.Value.fromAddress(Address.fromString(currencyParam)));
    let collection = new ethereum.EventParam('collection', ethereum.Value.fromAddress(Address.fromString(collectionParam)));
    let tokenId = new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(tokenIdParam)));
    let amount = new ethereum.EventParam('amount', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(amountParam)));
    let price = new ethereum.EventParam('price', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(priceParam)));

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
    priceParam: string = DEFAULT_PRICE,
): TakerAsk {

    let strategyAddress = "0x56244bb70cbd3ea9dc8007399f61dfc065190031";
    if (isPrivateSale) {
        strategyAddress = "0x58d83536d3efedb9f7f2a1ec3bdaad2b1a4dd98c";
    }
    // Create takerBid event
    // using this tx as template https://ethtx.info/mainnet/0xb002e339fdfc53b664eccceb7410d501196422d9716a2bdb0493f11bed5b0324/
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
    //bytes32,uint256,indexed address,indexed address,indexed address,address,address,uint256,uint256,uint256
    let orderHash = new ethereum.EventParam('orderHash', ethereum.Value.fromString(orderHashParam));
    let orderNonce = new ethereum.EventParam('orderNonce', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(orderNonceParam)));
    let taker = new ethereum.EventParam('taker', ethereum.Value.fromAddress(Address.fromString(takerParam)));
    let maker = new ethereum.EventParam('maker', ethereum.Value.fromAddress(Address.fromString(makerParam)));
    let strategy = new ethereum.EventParam('strategy', ethereum.Value.fromAddress(Address.fromString(strategyAddress)));
    let currency = new ethereum.EventParam('currency', ethereum.Value.fromAddress(Address.fromString(currencyParam)));
    let collection = new ethereum.EventParam('collection', ethereum.Value.fromAddress(Address.fromString(collectionParam)));
    let tokenId = new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(tokenIdParam)));
    let amount = new ethereum.EventParam('amount', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(amountParam)));
    let price = new ethereum.EventParam('price', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(priceParam)));

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