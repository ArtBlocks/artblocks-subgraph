import {
  assert,
  clearStore,
  test,
  newMockEvent,
  describe,
  beforeEach,
  createMockedFunction
} from "matchstick-as/assembly/index";
import {
  Address,
  BigInt,
  Bytes,
  json,
  JSONValue,
  JSONValueKind,
  TypedMap,
  store,
  log,
  ethereum
} from "@graphprotocol/graph-ts";

// helper src imports
import { getTotalDAExpAuctionTime } from "../../src/helpers";

describe(`getTotalDAExpAuctionTime`, () => {
  // note that calculations are also tested in e2e tests: i-filtered-shared-da-exp.test.ts, see function
  // `getApproxDAExpLength` (written in typescript, not assemblyscript)

  test("should return correct known-values", () => {
    // known values come from Hasura database, with values known to be accurate in prod
    const auctionLength = getTotalDAExpAuctionTime(
      BigInt.fromString("3000000000000000000"), // start price
      BigInt.fromString("90000000000000000"), // base price
      BigInt.fromString("354") // half life seconds
    );
    // start time = 1691600400, approx end time = 1691602198
    const targetAuctionLength = BigInt.fromString("1691602198").minus(
      BigInt.fromString("1691600400")
    );
    assert.assertTrue(auctionLength.equals(targetAuctionLength));
  });

  test("should return correct known-values case 2", () => {
    // known values come from Hasura database, with values known to be accurate in prod
    const auctionLength = getTotalDAExpAuctionTime(
      BigInt.fromString("2000000000000000000"), // start price
      BigInt.fromString("80000000000000000"), // base price
      BigInt.fromString("381") // half life seconds
    );
    // start time = 1685638800, approx end time = 1685640598
    const targetAuctionLength = BigInt.fromString("1685640598").minus(
      BigInt.fromString("1685638800")
    );
    assert.assertTrue(auctionLength.equals(targetAuctionLength));
  });
});
