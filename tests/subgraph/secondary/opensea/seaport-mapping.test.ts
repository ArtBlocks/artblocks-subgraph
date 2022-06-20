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
import { addNewContractToStore, addNewTokenToStore } from "../secondaryHelpers";
import { generateContractSpecificId } from "../../../../src/helpers";
import { addNewProjectToStore } from "../../shared-helpers";
import { handleOrderFulfilled } from "../../../../src/secondary/opensea/os-seaport-mapping";
import { DEFAULT_PRICE, DEFAULT_COLLECTION } from "../secondaryHelpers";
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

describe("Test Single Item Sale", () => {
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
    let saleLookUpTable = SaleLookupTable.load(saleLookUpTableId)!;
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

describe("Test Bundle Sale", () => {
  beforeEach(() => {
    addNewContractToStore();
  });
  afterEach(() => {
    // Clear the store in order to start the next test off on a clean slate
    clearStore();
  });
  test("handleOrderFulfilled should create bundle sale if contract and token are in store", () => {
    let token1 = addNewTokenToStore(DEFAULT_COLLECTION, "10", "7019");
    let token2 = addNewTokenToStore(DEFAULT_COLLECTION, "11", "7020");
    let orderFulfilledEvent = createOrderFulfilledEvent(false, true);
    handleOrderFulfilled(orderFulfilledEvent);
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    // Assert the state of the store
    assert.fieldEquals("Sale", saleId, "id", DEFAULT_ORDER_HASH);
    assert.fieldEquals("Sale", saleId, "exchange", "OS_SP");
    assert.fieldEquals("Sale", saleId, "saleType", "Bundle");
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
    assert.fieldEquals(
      "Sale",
      saleId,
      "summaryTokensSold",
      token1.id + "::" + token2.id
    );
    assert.fieldEquals("Sale", saleId, "isPrivate", "false");
  });
  test("handleOrderFulfilled should create saleLookUpTables for bundle if contract and token are in store", () => {
    let token1 = addNewTokenToStore(DEFAULT_COLLECTION, "10", "7019");
    let token2 = addNewTokenToStore(DEFAULT_COLLECTION, "11", "7020");
    let orderFulfilledEvent = createOrderFulfilledEvent(false, true);
    handleOrderFulfilled(orderFulfilledEvent);

    // Get the sale
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    let sale = Sale.load(saleId)!;
    // Get the id of the saleLookupTable
    let saleLookUpTableId1 = buildTokenSaleLookupTableId(
      token1.project,
      token1.id,
      sale.id
    );
    let saleLookUpTableId2 = buildTokenSaleLookupTableId(
      token2.project,
      token2.id,
      sale.id
    );

    // Assert the state of the store
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId1,
      "token",
      token1.id
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId2,
      "token",
      token2.id
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId1,
      "project",
      token1.project
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId2,
      "project",
      token2.project
    );
    assert.fieldEquals("SaleLookupTable", saleLookUpTableId1, "sale", saleId);
    assert.fieldEquals("SaleLookupTable", saleLookUpTableId2, "sale", saleId);
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId1,
      "timestamp",
      sale.blockTimestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId2,
      "timestamp",
      sale.blockTimestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId1,
      "blockNumber",
      sale.blockNumber.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableId2,
      "blockNumber",
      sale.blockNumber.toString()
    );
  });
  test("handleOrderFulfilled should update saleLookUpTables of tokens if contract and token are in store", () => {
    let token1 = addNewTokenToStore(DEFAULT_COLLECTION, "10", "7019");
    let token2 = addNewTokenToStore(DEFAULT_COLLECTION, "11", "7020");
    let orderFulfilledEvent = createOrderFulfilledEvent(false, true);
    handleOrderFulfilled(orderFulfilledEvent);

    // Get the sale
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    let sale = Sale.load(saleId)!;
    // Get the saleLookupTable
    let saleLookUpTableId1 = buildTokenSaleLookupTableId(
      token1.project,
      token1.id,
      sale.id
    );
    let saleLookUpTableId2 = buildTokenSaleLookupTableId(
      token2.project,
      token2.id,
      sale.id
    );
    let saleLookUpTable1 = SaleLookupTable.load(saleLookUpTableId1)!;
    let saleLookUpTable2 = SaleLookupTable.load(saleLookUpTableId2)!;

    token1 = Token.load(
      generateContractSpecificId(
        Address.fromString(DEFAULT_COLLECTION),
        BigInt.fromString("7019")
      )
    )!;
    token2 = Token.load(
      generateContractSpecificId(
        Address.fromString(DEFAULT_COLLECTION),
        BigInt.fromString("7020")
      )
    )!;
    let saleLookUpTableFromToken1 = token1.saleLookupTables;
    let saleLookUpTableFromToken2 = token2.saleLookupTables;

    // Assert the state of the store
    assert.i32Equals(1, saleLookUpTableFromToken1.length);
    assert.i32Equals(1, saleLookUpTableFromToken2.length);
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken1[0],
      "token",
      saleLookUpTable1.token
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken2[0],
      "token",
      saleLookUpTable2.token
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken1[0],
      "project",
      saleLookUpTable1.project
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken2[0],
      "project",
      saleLookUpTable2.project
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken1[0],
      "sale",
      saleLookUpTable1.sale
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken2[0],
      "sale",
      saleLookUpTable2.sale
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken1[0],
      "timestamp",
      saleLookUpTable1.timestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken2[0],
      "timestamp",
      saleLookUpTable2.timestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken1[0],
      "blockNumber",
      saleLookUpTable1.blockNumber.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromToken2[0],
      "blockNumber",
      saleLookUpTable2.blockNumber.toString()
    );
  });
  test("handleOrderFulfilled should update saleLookUpTables of bundle sale if contract and token are in store", () => {
    let token1 = addNewTokenToStore(DEFAULT_COLLECTION, "10", "7019");
    let token2 = addNewTokenToStore(DEFAULT_COLLECTION, "11", "7020");
    let orderFulfilledEvent = createOrderFulfilledEvent(false, true);
    handleOrderFulfilled(orderFulfilledEvent);

    // Get the sale
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    let sale = Sale.load(saleId)!;
    // Get the saleLookupTable
    let saleLookUpTableId = buildTokenSaleLookupTableId(
      token1.project,
      token1.id,
      sale.id
    );
    let saleLookUpTable = SaleLookupTable.load(saleLookUpTableId)!;
    let saleLookUpTableFromSale = sale.saleLookupTables;

    // Assert the state of the store
    assert.i32Equals(2, saleLookUpTableFromSale.length);
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
  test("handleOrderFulfilled should update saleLookUpTables of projects if contract and token are in store", () => {
    let randomAddress = Address.fromString(
      "0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f"
    );
    let project1 = addNewProjectToStore(
      randomAddress,
      BigInt.fromString("10"),
      "test",
      randomAddress,
      BigInt.fromString("1"),
      BigInt.fromString("1621328821")
    );
    let project2 = addNewProjectToStore(
      randomAddress,
      BigInt.fromString("11"),
      "test2",
      randomAddress,
      BigInt.fromString("1"),
      BigInt.fromString("1621328822")
    );
    let token1 = addNewTokenToStore(DEFAULT_COLLECTION, "10", "7019");
    let token2 = addNewTokenToStore(DEFAULT_COLLECTION, "11", "7020");

    let orderFulfilledEvent = createOrderFulfilledEvent(false, true);

    handleOrderFulfilled(orderFulfilledEvent);

    // Get the sale
    let saleId = orderFulfilledEvent.params.orderHash.toHexString();
    let sale = Sale.load(saleId)!;
    // Get the saleLookupTable
    let saleLookUpTableId1 = buildTokenSaleLookupTableId(
      token1.project,
      token1.id,
      sale.id
    );
    let saleLookUpTableId2 = buildTokenSaleLookupTableId(
      token2.project,
      token2.id,
      sale.id
    );
    let saleLookUpTable1 = SaleLookupTable.load(saleLookUpTableId1)!;

    let saleLookUpTable2 = SaleLookupTable.load(saleLookUpTableId2)!;

    project1 = Project.load(project1.id)!;
    project2 = Project.load(project2.id)!;

    let saleLookUpTableFromProject1 = project1.saleLookupTables;

    let saleLookUpTableFromProject2 = project2.saleLookupTables;

    // Assert the state of the store
    assert.i32Equals(1, saleLookUpTableFromProject1.length);
    assert.i32Equals(1, saleLookUpTableFromProject2.length);
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject1[0],
      "token",
      saleLookUpTable1.token
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject2[0],
      "token",
      saleLookUpTable2.token
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject1[0],
      "project",
      saleLookUpTable1.project
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject2[0],
      "project",
      saleLookUpTable2.project
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject1[0],
      "sale",
      saleLookUpTable1.sale
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject2[0],
      "sale",
      saleLookUpTable2.sale
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject1[0],
      "timestamp",
      saleLookUpTable1.timestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject2[0],
      "timestamp",
      saleLookUpTable2.timestamp.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject1[0],
      "blockNumber",
      saleLookUpTable1.blockNumber.toString()
    );
    assert.fieldEquals(
      "SaleLookupTable",
      saleLookUpTableFromProject2[0],
      "blockNumber",
      saleLookUpTable2.blockNumber.toString()
    );
  });
  test("handleOrderFulfilled should not create sale if token is not in store", () => {
    let orderFulfilledEvent = createOrderFulfilledEvent(false, true);

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
