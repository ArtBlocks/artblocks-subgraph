import {
  clearStore,
  describe,
  test,
  assert,
  beforeEach,
  afterEach,
  log
} from "matchstick-as/assembly/index";
import {
  Token,
  SaleLookupTable,
  Sale,
  Project
} from "../../../../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";

import { buildTokenSaleLookupTableId } from "../../../../src/secondary/secondary-helpers";
import {
  addNewContractToStore,
  addNewTokenToStore,
  createTakerAskEvent,
  createTakerBidEvent
} from "../secondaryHelpers";
import { generateContractSpecificId } from "../../../../src/helpers";
import { addNewProjectToStore } from "../../shared-helpers";
import { handleOrderFulfilled } from "../../../../src/secondary/opensea/os-seaport-mapping";
import { DEFAULT_PRICE, DEFAULT_PROJECT_ID } from "../secondaryHelpers";
import { OrderFulfilled } from "../../../../generated/SeaportExchange/SeaportExchange";
import {
  DEFAULT_CURRENCY,
  DEFAULT_MAKER,
  DEFAULT_TAKER
} from "../secondaryHelpers";
import {
  createOrderFulfilledEvent,
  DEFAULT_ORDER_HASH
} from "../secondaryHelpers";

describe("regular tests", () => {
  beforeEach(() => {
    addNewContractToStore();
  });
  afterEach(() => {
    // Clear the store in order to start the next test off on a clean slate
    clearStore();
  });
  test("handleOrderFulfilled should create sale if contract and token are in store", () => {
    let token = addNewTokenToStore();
    let orderFulfilledEvent = createOrderFulfilledEvent(false);
    handleOrderFulfilled(orderFulfilledEvent);
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    // Assert the state of the store
    assert.fieldEquals("Sale", saleId, "id", DEFAULT_ORDER_HASH);
    assert.fieldEquals("Sale", saleId, "exchange", "OS_SP");
    assert.fieldEquals("Sale", saleId, "saleType", "Single");
    assert.fieldEquals(
      "Sale",
      saleId,
      "blockNumber",
      orderFulfilledEvent.block.number.toString()
    );
    assert.fieldEquals(
      "Sale",
      saleId,
      "blockTimestamp",
      orderFulfilledEvent.block.timestamp.toString()
    );
    assert.fieldEquals(
      "Sale",
      saleId,
      "txHash",
      orderFulfilledEvent.transaction.hash.toHexString()
    );
    assert.fieldEquals("Sale", saleId, "seller", DEFAULT_MAKER);
    assert.fieldEquals("Sale", saleId, "buyer", DEFAULT_TAKER);
    assert.fieldEquals("Sale", saleId, "paymentToken", DEFAULT_CURRENCY);
    assert.fieldEquals("Sale", saleId, "price", DEFAULT_PRICE);
    assert.fieldEquals("Sale", saleId, "summaryTokensSold", token.id);
    assert.fieldEquals("Sale", saleId, "isPrivate", "false");
  });
  test("handleOrderFulfilled should create saleLookUpTable if contract and token are in store", () => {
    let token = addNewTokenToStore();
    let orderFulfilledEvent = createOrderFulfilledEvent(false);
    handleOrderFulfilled(orderFulfilledEvent);

    // Get the sale
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    let sale = Sale.load(saleId)!;
    // Get the id of the saleLookupTable
    let saleLookUpTableId = buildTokenSaleLookupTableId(
      token.project,
      token.id,
      sale.id
    );

    // Assert the state of the store
    assert.fieldEquals("SaleLookupTable", saleLookUpTableId, "token", token.id);
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId,
      "project",
      token.project
    );
    assert.fieldEquals("SaleLookupTable", saleLookUpTableId, "sale", saleId);
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId,
      "timestamp",
      sale.blockTimestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId,
      "blockNumber",
      sale.blockNumber.toString()
    );
  });
  test("handleOrderFulfilled should update saleLookUpTables of token if contract and token are in store", () => {
    let token = addNewTokenToStore();
    let orderFulfilledEvent = createOrderFulfilledEvent(false);
    handleOrderFulfilled(orderFulfilledEvent);

    // Get the sale
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    let sale = Sale.load(saleId)!;
    // Get the saleLookupTable
    let saleLookUpTableId = buildTokenSaleLookupTableId(
      token.project,
      token.id,
      sale.id
    );
    let saleLookUpTable = SaleLookupTable.load(saleLookUpTableId)!;

    token = Token.load(
      generateContractSpecificId(
        Address.fromString("0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f"),
        BigInt.fromString("7019")
      )
    )!;
    let saleLookUpTableFromToken = token.saleLookupTables;

    // Assert the state of the store
    assert.i32Equals(1, saleLookUpTableFromToken.length);
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken[0],
      "token",
      saleLookUpTable.token
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken[0],
      "project",
      saleLookUpTable.project
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken[0],
      "sale",
      saleLookUpTable.sale
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken[0],
      "timestamp",
      saleLookUpTable.timestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken[0],
      "blockNumber",
      saleLookUpTable.blockNumber.toString()
    );
  });
  test("handleOrderFulfilled should update saleLookUpTables of sale if contract and token are in store", () => {
    let token = addNewTokenToStore();
    let orderFulfilledEvent = createOrderFulfilledEvent(false);
    handleOrderFulfilled(orderFulfilledEvent);

    // Get the sale
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    let sale = Sale.load(saleId)!;
    // Get the saleLookupTable
    let saleLookUpTableId = buildTokenSaleLookupTableId(
      token.project,
      token.id,
      sale.id
    );
    log.info("Here", []);
    let saleLookUpTable = SaleLookupTable.load(saleLookUpTableId)!;
    log.info("Here {}", [saleLookUpTable.id]);
    log.info("Here {} ", [saleLookUpTable.project]);
    log.info("Here {}", [saleLookUpTable.token]);
    log.info("Here {}", [saleLookUpTable.sale]);
    log.info("Sale {}", [sale.id]);
    let saleLookUpTableFromSale = sale.saleLookupTables;

    // Assert the state of the store
    assert.i32Equals(1, saleLookUpTableFromSale.length);
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromSale[0],
      "token",
      saleLookUpTable.token
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromSale[0],
      "project",
      saleLookUpTable.project
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromSale[0],
      "sale",
      saleLookUpTable.sale
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromSale[0],
      "timestamp",
      saleLookUpTable.timestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromSale[0],
      "blockNumber",
      saleLookUpTable.blockNumber.toString()
    );
  });
  test("handleOrderFulfilled should update saleLookUpTables of project if contract and token are in store", () => {
    let randomAddress = Address.fromString(
      "0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f"
    );
    let project = addNewProjectToStore(
      randomAddress,
      BigInt.fromString("2"),
      "test",
      randomAddress,
      BigInt.fromString("1"),
      BigInt.fromString("1621328821")
    );
    let token = addNewTokenToStore();
    token.project = project.id;
    token.save();
    let orderFulfilledEvent = createOrderFulfilledEvent(false);

    handleOrderFulfilled(orderFulfilledEvent);

    // Get the sale
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    let sale = Sale.load(saleId)!;
    // Get the saleLookupTable
    let saleLookUpTableId = buildTokenSaleLookupTableId(
      token.project,
      token.id,
      sale.id
    );
    let saleLookUpTable = SaleLookupTable.load(saleLookUpTableId)!;

    project = Project.load(project.id)!;
    let saleLookUpTableFromProject = project.saleLookupTables;

    // Assert the state of the store
    assert.i32Equals(1, saleLookUpTableFromProject.length);
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject[0],
      "token",
      saleLookUpTable.token
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject[0],
      "project",
      saleLookUpTable.project
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject[0],
      "sale",
      saleLookUpTable.sale
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject[0],
      "timestamp",
      saleLookUpTable.timestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject[0],
      "blockNumber",
      saleLookUpTable.blockNumber.toString()
    );
  });

  test("handleOrderFulfilled should not create sale if token is not in store", () => {
    let orderFulfilledEvent = createOrderFulfilledEvent(false);

    handleOrderFulfilled(orderFulfilledEvent);

    let saleId = orderFulfilledEvent.params.orderHash.toHexString();

    // Assert the state of the store
    assert.assertNull(Sale.load(saleId));
  });
});

// test("handleTakerBid should create sale marked as private if private sale strategy is used", () => {
//   addNewContractToStore();
//   addNewTokenToStore();
//   let takerBidEvent = createTakerBidEvent(true);

//   handleTakerBid(takerBidEvent);

//   let saleId = takerBidEvent.params.orderHash.toHexString();

//   // Assert the state of the store
//   assert.fieldEquals("Sale", saleId, "isPrivate", "true");

//   // Clear the store in order to start the next test off on a clean slate
//   clearStore();
// });

// test("handleTakerBid should not create sale if contract is not in store", () => {
//   addNewTokenToStore();
//   let takerBidEvent = createTakerBidEvent(false);

//   handleTakerBid(takerBidEvent);

//   let saleId = takerBidEvent.params.orderHash.toHexString();

//   // Assert the state of the store
//   assert.assertNull(Sale.load(saleId));

//   // Clear the store in order to start the next test off on a clean slate
//   clearStore();
// });
