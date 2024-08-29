import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  getAccounts,
  waitUntilSubgraphIsSynced,
  getMinterDetails,
} from "../utils/helpers";

import { MinterMinPriceV0__factory } from "../../contracts/factories/MinterMinPriceV0__factory";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
// @dev For this file specifically, one test takes >60s due to hard-coded minimum
// auction duration on SEA minter
jest.setTimeout(100 * 1000);

const config = getSubgraphConfig();

const client = createSubgraphClient();
const { deployer } = getAccounts();

// get min price lib contract from the subgraph config
if (!config.minPriceLibContracts) {
  throw new Error("No minPriceLibContracts in config");
}
const minterMinPriceV0Address = config.minPriceLibContracts[0].address;
const minterMinPriceV0Contract = new MinterMinPriceV0__factory(deployer).attach(
  minterMinPriceV0Address
);

describe("MinPriceLib event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = minterMinPriceV0Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      expect(minterRes.id).toBe(targetId);
    });
  });

  describe("DefaultMinMintFeeUpdated", () => {
    // this is a minter-level, value set in the constructor and other function(s),
    // so we can inspect it by checking the Minter entity in the subgraph
    // that was created during deployment
    test("value was populated during deployment", async () => {
      // query public constant for the expected value (>0)
      const expectedValue = await minterMinPriceV0Contract.defaultMinMintFee();
      expect(expectedValue.gt(0)).toBe(true);
      // validate minter's extraMinterDetails in subgraph
      const targetId = minterMinPriceV0Address.toLowerCase();
      const minterRes = await getMinterDetails(client, targetId);
      const extraMinterDetails = JSON.parse(minterRes.extraMinterDetails);
      expect(extraMinterDetails.defaultMinMintFee).toBe(
        expectedValue.toString()
      );
    });
  });
});
