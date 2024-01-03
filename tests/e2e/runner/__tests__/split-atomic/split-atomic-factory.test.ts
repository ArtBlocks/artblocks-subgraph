import { describe, test, expect } from "@jest/globals";
import {
  getSubgraphConfig,
  createSubgraphClient,
  getAccounts,
  waitUntilSubgraphIsSynced,
  getSplitAtomicFactoryDetails,
  getSplitAtomicContractDetails,
} from "../utils/helpers";

// splitter contracts
import { SplitAtomicFactoryV0__factory } from "../../contracts/factories/SplitAtomicFactoryV0__factory";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();

const client = createSubgraphClient();
const { deployer, artist } = getAccounts();

// get SplitAtomicFactory contract from the subgraph config
if (!config.iSplitAtomicFactoryV0Contracts) {
  throw new Error("No iSplitAtomicFactoryV0Contracts in config");
}
const splitAtomicFactoryV0Address =
  config.iSplitAtomicFactoryV0Contracts[0].address;
const splitAtomicFactoryV0Contract = new SplitAtomicFactoryV0__factory(
  deployer
).attach(splitAtomicFactoryV0Address);
// get SplitAtomic implementation contract from the subgraph config metadata
if (!config.metadata?.splitAtomicImplementationAddress) {
  throw new Error("No splitAtomicImplementationAddress metadata in config");
}
const splitAtomicImplementationAddress =
  config.metadata.splitAtomicImplementationAddress;

describe("SplitAtomicFactoryV0 event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Indexed after setup", () => {
    test("created new Minter during deployment and allowlisting", async () => {
      const targetId = splitAtomicFactoryV0Address.toLowerCase();
      const splitAtomicFactoryRes = await getSplitAtomicFactoryDetails(
        client,
        targetId
      );
      expect(splitAtomicFactoryRes.id).toBe(targetId);
    });
  });

  describe("Deployed", () => {
    // @dev since factory was already deployed, confirm state of existing subgraph entity
    test("updated after deployment", async () => {
      const targetId = splitAtomicFactoryV0Address.toLowerCase();
      const splitAtomicFactoryRes = await getSplitAtomicFactoryDetails(
        client,
        targetId
      );
      // validate fields
      expect(splitAtomicFactoryRes.id).toBe(targetId);
      expect(splitAtomicFactoryRes.type).toBe("SplitAtomicFactoryV0");
      expect(splitAtomicFactoryRes.implementation).toBe(
        splitAtomicImplementationAddress.toLowerCase()
      );
      expect(splitAtomicFactoryRes.splitAtomicContracts.length).toBe(0);
      expect(splitAtomicFactoryRes.requiredSplitAddress).toBe(
        deployer.address.toLowerCase()
      );
      expect(splitAtomicFactoryRes.requiredSplitBasisPoints).toBe("2222");
      expect(splitAtomicFactoryRes.abandoned).toBe(false);
      expect(splitAtomicFactoryRes.updatedAt).toBeDefined();
    });
  });

  describe("SplitAtomicCreated", () => {
    test("handles split atomic factory creation", async () => {
      // validate initial state of split atomic factory in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = splitAtomicFactoryV0Address.toLowerCase();
      const splitAtomicFactoryRes = await getSplitAtomicFactoryDetails(
        client,
        targetId
      );
      const initialUpdatedAt = splitAtomicFactoryRes.updatedAt;
      // deploy the split atomic from the factory
      const splitStruct = [
        {
          recipient: deployer.address,
          basisPoints: 2222,
        },
        {
          recipient: artist.address,
          basisPoints: 7778,
        },
      ];
      await splitAtomicFactoryV0Contract.createSplit(splitStruct);
      await waitUntilSubgraphIsSynced(client);
      // validate split atomic factory in subgraph
      const splitAtomicFactoryRes2 = await getSplitAtomicFactoryDetails(
        client,
        targetId
      );
      expect(parseInt(splitAtomicFactoryRes2.updatedAt)).toBeGreaterThan(
        parseInt(initialUpdatedAt)
      );
      expect(
        splitAtomicFactoryRes2.splitAtomicContracts.length
      ).toBeGreaterThan(0);

      // validate new split atomic contract in subgraph
      const splitAtomicContractId =
        splitAtomicFactoryRes2.splitAtomicContracts[0].id;
      const splitAtomicContractRes = await getSplitAtomicContractDetails(
        client,
        splitAtomicContractId
      );
      expect(splitAtomicContractRes.id).toBe(splitAtomicContractId);
      expect(splitAtomicContractRes.type).toBe("SplitAtomicV0");
      expect(splitAtomicContractRes.implementation).toBe(
        splitAtomicImplementationAddress.toLowerCase()
      );
      expect(splitAtomicContractRes.splitAtomicFactory.id).toBe(targetId);
      expect(splitAtomicContractRes.splits.length).toBe(2);
      expect(splitAtomicContractRes.updatedAt).toBe(
        splitAtomicFactoryRes2.updatedAt
      );
      // validate splits
      const split0 = splitAtomicContractRes.splits[0];
      expect(split0.id).toBe(`${splitAtomicContractId}-0`);
      expect(split0.splitAtomicContract.id).toBe(splitAtomicContractId);
      expect(split0.index).toBe("0");
      expect(split0.recipient).toBe(deployer.address.toLowerCase());
      expect(split0.basisPoints).toBe("2222");
      const split1 = splitAtomicContractRes.splits[1];
      expect(split1.id).toBe(`${splitAtomicContractId}-1`);
      expect(split1.splitAtomicContract.id).toBe(splitAtomicContractId);
      expect(split1.index).toBe("1");
      expect(split1.recipient).toBe(artist.address.toLowerCase());
      expect(split1.basisPoints).toBe("7778");
    });
  });

  describe("SplitAtomicAbandoned", () => {
    test("handles split atomic factory abandonment", async () => {
      // validate initial state of split atomic factory in subgraph
      await waitUntilSubgraphIsSynced(client);
      const targetId = splitAtomicFactoryV0Address.toLowerCase();
      const splitAtomicFactoryRes = await getSplitAtomicFactoryDetails(
        client,
        targetId
      );
      expect(splitAtomicFactoryRes.abandoned).toBe(false);
      // abandon the split atomic factory
      await splitAtomicFactoryV0Contract.connect(deployer).abandon();
      await waitUntilSubgraphIsSynced(client);
      // validate split atomic factory state update
      const splitAtomicFactoryRes2 = await getSplitAtomicFactoryDetails(
        client,
        targetId
      );
      expect(splitAtomicFactoryRes2.abandoned).toBe(true);
    });
  });
});
