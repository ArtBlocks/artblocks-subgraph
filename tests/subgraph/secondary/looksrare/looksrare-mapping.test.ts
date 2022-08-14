import { clearStore, test, assert } from "matchstick-as/assembly/index";
import {
  Token,
  SaleLookupTable,
  Sale,
  Project
} from "../../../../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";

import {
  handleTakerAsk,
  handleTakerBid
} from "../../../../src/secondary/looksrare/looksrare-mapping";
import { buildTokenSaleLookupTableId } from "../../../../src/secondary/secondary-helpers";
import { generateContractSpecificId } from "../../../../src/helpers";
import { createTakerAskEvent, createTakerBidEvent } from "./looksrareHelpers";
import {
  addNewContractToStore,
  DEFAULT_PRICE,
  DEFAULT_TAKER
} from "../../shared-helpers";
import {
  addNewProjectToStore,
  addNewTokenToStore,
  DEFAULT_CURRENCY
} from "../../shared-helpers";
import { LR_V1 } from "../../../../src/constants";
test("handleTakerBid should create sale if contract and token are in store", () => {
  addNewContractToStore();
  let token = addNewTokenToStore();
  let takerBidEvent = createTakerBidEvent(false);

  handleTakerBid(takerBidEvent);

  let saleId = takerBidEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.fieldEquals(
    "Sale",
    saleId,
    "id",
    "0xbc5a2acf703138c9562adf29a4131756ef6fe70f7a03c08cbc8a4fd22d53f1a7"
  );
  assert.fieldEquals("Sale", saleId, "exchange", LR_V1);
  assert.fieldEquals("Sale", saleId, "saleType", "Single");
  assert.fieldEquals(
    "Sale",
    saleId,
    "blockNumber",
    takerBidEvent.block.number.toString()
  );
  assert.fieldEquals(
    "Sale",
    saleId,
    "blockTimestamp",
    takerBidEvent.block.timestamp.toString()
  );
  let sale = Sale.load(saleId)!;
  let paymentsFromSale = sale.payments;
  assert.fieldEquals(
    "Payment",
    paymentsFromSale[0],
    "price",
    DEFAULT_PRICE.toString()
  );
  assert.fieldEquals(
    "Payment",
    paymentsFromSale[0],
    "paymentToken",
    DEFAULT_CURRENCY.toHexString()
  );
  assert.fieldEquals(
    "Payment",
    paymentsFromSale[0],
    "recipient",
    DEFAULT_TAKER.toHexString()
  );
  assert.fieldEquals("Payment", paymentsFromSale[0], "sale", saleId);

  assert.fieldEquals("Sale", saleId, "summaryTokensSold", token.id);
  assert.fieldEquals("Sale", saleId, "isPrivate", "false");

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerBid should create sale marked as private if private sale strategy is used", () => {
  addNewContractToStore();
  addNewTokenToStore();
  let takerBidEvent = createTakerBidEvent(true);

  handleTakerBid(takerBidEvent);

  let saleId = takerBidEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.fieldEquals("Sale", saleId, "isPrivate", "true");

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerBid should create sale with seller as maker and buyer as taker", () => {
  addNewContractToStore();
  addNewTokenToStore();
  let takerBidEvent = createTakerBidEvent(true);

  handleTakerBid(takerBidEvent);

  let saleId = takerBidEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.fieldEquals(
    "Sale",
    saleId,
    "seller",
    "0x26a6434385cd63a88450ea06e2b2256979400b29"
  );
  assert.fieldEquals(
    "Sale",
    saleId,
    "buyer",
    "0x258a5e28aa40aef3c2c4cdf728b11dd9dd2b8bcd"
  );

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerBid should create saleLookUpTable if contract and token are in store", () => {
  addNewContractToStore();
  let token = addNewTokenToStore();
  let takerBidEvent = createTakerBidEvent(false);

  handleTakerBid(takerBidEvent);

  // Get the sale
  let saleId = takerBidEvent.params.orderHash.toHexString();
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

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerBid should update saleLookUpTables of token if contract and token are in store", () => {
  addNewContractToStore();
  let token = addNewTokenToStore();
  let takerBidEvent = createTakerBidEvent(false);

  handleTakerBid(takerBidEvent);

  // Get the sale
  let saleId = takerBidEvent.params.orderHash.toHexString();
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

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerBid should update saleLookUpTables of sale if contract and token are in store", () => {
  addNewContractToStore();
  let token = addNewTokenToStore();
  let takerBidEvent = createTakerBidEvent(false);

  handleTakerBid(takerBidEvent);

  // Get the sale
  let saleId = takerBidEvent.params.orderHash.toHexString();
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

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerBid should update saleLookUpTables of project if contract and token are in store", () => {
  let randomAddress = Address.fromString(
    "0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f"
  );
  let project = addNewProjectToStore(
    randomAddress,
    BigInt.fromString("1"),
    "test",
    randomAddress,
    BigInt.fromString("1"),
    BigInt.fromString("1621328821")
  );
  addNewContractToStore();
  let token = addNewTokenToStore();
  token.project = project.id;
  token.save();
  let takerBidEvent = createTakerBidEvent(false);

  handleTakerBid(takerBidEvent);

  // Get the sale
  let saleId = takerBidEvent.params.orderHash.toHexString();
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

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerBid should not create sale if token is not in store", () => {
  addNewContractToStore();
  let takerBidEvent = createTakerBidEvent(false);

  handleTakerBid(takerBidEvent);

  let saleId = takerBidEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.assertNull(Sale.load(saleId));

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerBid should not create sale if contract is not in store", () => {
  addNewTokenToStore();
  let takerBidEvent = createTakerBidEvent(false);

  handleTakerBid(takerBidEvent);

  let saleId = takerBidEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.assertNull(Sale.load(saleId));

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should create sale if contract and token are in store", () => {
  addNewContractToStore();
  let token = addNewTokenToStore();
  let TakerAskEvent = createTakerAskEvent(false);

  handleTakerAsk(TakerAskEvent);

  let saleId = TakerAskEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.fieldEquals(
    "Sale",
    saleId,
    "id",
    "0xbc5a2acf703138c9562adf29a4131756ef6fe70f7a03c08cbc8a4fd22d53f1a7"
  );
  assert.fieldEquals("Sale", saleId, "exchange", LR_V1);
  assert.fieldEquals("Sale", saleId, "saleType", "Single");
  assert.fieldEquals(
    "Sale",
    saleId,
    "blockNumber",
    TakerAskEvent.block.number.toString()
  );
  assert.fieldEquals(
    "Sale",
    saleId,
    "blockTimestamp",
    TakerAskEvent.block.timestamp.toString()
  );
  let sale = Sale.load(saleId)!;
  let paymentsFromSale = sale.payments;
  assert.fieldEquals(
    "Payment",
    paymentsFromSale[0],
    "price",
    DEFAULT_PRICE.toString()
  );
  assert.fieldEquals(
    "Payment",
    paymentsFromSale[0],
    "paymentToken",
    DEFAULT_CURRENCY.toHexString()
  );
  assert.fieldEquals(
    "Payment",
    paymentsFromSale[0],
    "recipient",
    DEFAULT_TAKER.toHexString()
  );
  assert.fieldEquals("Payment", paymentsFromSale[0], "sale", saleId);
  assert.fieldEquals("Sale", saleId, "summaryTokensSold", token.id);
  assert.fieldEquals("Sale", saleId, "isPrivate", "false");

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should create sale marked as private if private sale strategy is used", () => {
  addNewContractToStore();
  addNewTokenToStore();
  let TakerAskEvent = createTakerAskEvent(true);

  handleTakerAsk(TakerAskEvent);

  let saleId = TakerAskEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.fieldEquals("Sale", saleId, "isPrivate", "true");

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should create sale with seller as taker and buyer as maker", () => {
  addNewContractToStore();
  addNewTokenToStore();
  let TakerAskEvent = createTakerAskEvent(true);

  handleTakerAsk(TakerAskEvent);

  let saleId = TakerAskEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.fieldEquals(
    "Sale",
    saleId,
    "seller",
    "0x258a5e28aa40aef3c2c4cdf728b11dd9dd2b8bcd"
  );
  assert.fieldEquals(
    "Sale",
    saleId,
    "buyer",
    "0x26a6434385cd63a88450ea06e2b2256979400b29"
  );

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should create saleLookUpTable if contract and token are in store", () => {
  addNewContractToStore();
  let token = addNewTokenToStore();
  let TakerAskEvent = createTakerAskEvent(false);

  handleTakerAsk(TakerAskEvent);

  // Get the sale
  let saleId = TakerAskEvent.params.orderHash.toHexString();
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

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should update saleLookUpTables of token if contract and token are in store", () => {
  addNewContractToStore();
  let token = addNewTokenToStore();
  let TakerAskEvent = createTakerAskEvent(false);

  handleTakerAsk(TakerAskEvent);

  // Get the sale
  let saleId = TakerAskEvent.params.orderHash.toHexString();
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

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should update saleLookUpTables of sale if contract and token are in store", () => {
  addNewContractToStore();
  let token = addNewTokenToStore();
  let TakerAskEvent = createTakerAskEvent(false);

  handleTakerAsk(TakerAskEvent);

  // Get the sale
  let saleId = TakerAskEvent.params.orderHash.toHexString();
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

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should update saleLookUpTables of project if contract and token are in store", () => {
  let randomAddress = Address.fromString(
    "0xd8a5d498ab43ed060cb6629b97a19e3e4276dd9f"
  );
  let project = addNewProjectToStore(
    randomAddress,
    BigInt.fromString("1"),
    "test",
    randomAddress,
    BigInt.fromString("1"),
    BigInt.fromString("1621328821")
  );
  addNewContractToStore();
  let token = addNewTokenToStore();
  token.project = project.id;
  token.save();
  let TakerAskEvent = createTakerAskEvent(false);

  handleTakerAsk(TakerAskEvent);

  // Get the sale
  let saleId = TakerAskEvent.params.orderHash.toHexString();
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

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should not create sale if token is not in store", () => {
  addNewContractToStore();
  let TakerAskEvent = createTakerAskEvent(false);

  handleTakerAsk(TakerAskEvent);

  let saleId = TakerAskEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.assertNull(Sale.load(saleId));

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});

test("handleTakerAsk should not create sale if contract is not in store", () => {
  addNewTokenToStore();
  let takerAskEvent = createTakerAskEvent(false);

  handleTakerAsk(takerAskEvent);

  let saleId = takerAskEvent.params.orderHash.toHexString();

  // Assert the state of the store
  assert.assertNull(Sale.load(saleId));

  // Clear the store in order to start the next test off on a clean slate
  clearStore();
});
