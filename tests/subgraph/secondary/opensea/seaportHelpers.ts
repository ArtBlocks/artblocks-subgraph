import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";
import { OrderFulfilled } from "../../../../generated/SeaportExchange/SeaportExchange";
import { ItemType } from "../../../../src/secondary/opensea/os-seaport-mapping";
import {
  DEFAULT_COLLECTION,
  DEFAULT_CURRENCY,
  DEFAULT_ORDER_HASH,
  DEFAULT_TAKER,
  DEFAULT_MAKER,
  DEFAULT_TOKEN_ID,
  DEFAULT_ZONE,
  DEFAULT_PRICE
} from "../../shared-helpers";

export const MOCK_AB_ADDRESS = Address.fromString(
  "0x6C093Fe8bc59e1e0cAe2Ec10F0B717D3D182056B"
);
export const MOCK_OS_ADDRESS = Address.fromString(
  "0x5b3256965e7C3cF26E11FCAf296DfC8807C01073"
);

function buildOrderTuple(
  tokenId: BigInt,
  collection: Address = DEFAULT_COLLECTION,
  itemType: ItemType = ItemType.ERC721
): ethereum.Tuple {
  let orderTuple = new ethereum.Tuple();

  orderTuple.push(ethereum.Value.fromI32(itemType));
  orderTuple.push(ethereum.Value.fromAddress(collection));
  orderTuple.push(ethereum.Value.fromUnsignedBigInt(tokenId));
  orderTuple.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)));
  return orderTuple;
}

function buildConsiderationTuple(
  recipient: Address,
  price: BigInt,
  itemType: ItemType = ItemType.NATIVE,
  currency: Address = DEFAULT_CURRENCY
): ethereum.Tuple {
  let tuple = new ethereum.Tuple();
  tuple.push(ethereum.Value.fromI32(itemType));
  tuple.push(ethereum.Value.fromAddress(currency));
  tuple.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)));
  tuple.push(ethereum.Value.fromUnsignedBigInt(price));
  tuple.push(ethereum.Value.fromAddress(recipient));
  return tuple;
}

export function createOrderFulfilledEvent(
  isPrivateSale: boolean,
  bundle: boolean = false,
  multiplePayments: boolean = false,
  orderHashParam: string = DEFAULT_ORDER_HASH,
  recipientParam: Address = DEFAULT_TAKER,
  offererParam: Address = DEFAULT_MAKER,
  currencyParam: Address = DEFAULT_CURRENCY,
  collectionParam: Address = DEFAULT_COLLECTION,
  tokenIdParam: BigInt = DEFAULT_TOKEN_ID,
  zoneParam: Address = DEFAULT_ZONE,
  priceParam: BigInt = DEFAULT_PRICE
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
    ethereum.Value.fromAddress(offererParam)
  );

  let zone = new ethereum.EventParam(
    "zone",
    ethereum.Value.fromAddress(zoneParam)
  );

  let recipient = new ethereum.EventParam(
    "recipient",
    ethereum.Value.fromAddress(recipientParam)
  );

  let numOrders = bundle ? 2 : 1;
  let orderTupleArray = new Array<ethereum.Tuple>();
  for (let i = 0; i < numOrders; i++) {
    orderTupleArray.push(
      buildOrderTuple(
        tokenIdParam.plus(BigInt.fromI32(i)),
        collectionParam,
        ItemType.ERC721
      )
    );
  }

  let offer = new ethereum.EventParam(
    "offer",
    ethereum.Value.fromTupleArray(orderTupleArray)
  );

  let considerationTupleArray = new Array<ethereum.Tuple>();

  // Simulate standard OS txn (90% to buyer, 7.5% to AB, 2.5% to OS)
  considerationTupleArray.push(
    buildConsiderationTuple(
      offererParam,
      priceParam.div(BigInt.fromI32(10)).times(BigInt.fromI32(9))
    )
  );
  considerationTupleArray.push(
    buildConsiderationTuple(
      MOCK_AB_ADDRESS,
      priceParam.div(BigInt.fromI32(1000)).times(BigInt.fromI32(75))
    )
  );
  considerationTupleArray.push(
    buildConsiderationTuple(
      MOCK_OS_ADDRESS,
      priceParam.div(BigInt.fromI32(1000)).times(BigInt.fromI32(25))
    )
  );

  if (multiplePayments) {
    // Add additional ERC20 payment
    considerationTupleArray.push(
      buildConsiderationTuple(
        offererParam,
        BigInt.fromI32(1000),
        ItemType.ERC20,
        Address.fromString("0x11111139b223fe8d0a0e5c4f27ead9083c756cc2")
      )
    );

    // Add ERC721 payment
    considerationTupleArray.push(
      buildConsiderationTuple(
        offererParam,
        BigInt.fromI32(1),
        ItemType.ERC721,
        Address.fromString("0x22222239b223fe8d0a0e5c4f27ead9083c756cc2")
      )
    );

    // Add ERC1155 payment
    considerationTupleArray.push(
      buildConsiderationTuple(
        recipientParam,
        BigInt.fromI32(1),
        ItemType.ERC1155,
        Address.fromString("0x33333339b223fe8d0a0e5c4f27ead9083c756cc2")
      )
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
