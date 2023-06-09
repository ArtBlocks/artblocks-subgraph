import { describe, test, expect } from "@jest/globals";
import {
  GetTargetMinterFiltersDocument,
  GetTargetMinterFiltersQuery,
  GetTargetMinterFiltersQueryVariables,
  GetTargetCoreRegistriesDocument,
  GetTargetCoreRegistriesQuery,
  GetTargetCoreRegistriesQueryVariables,
  GetTargetMintersDocument,
  GetTargetMintersQuery,
  GetTargetMintersQueryVariables,
  Minter,
} from "../../generated/graphql";
import {
  getSubgraphConfig,
  getAccounts,
  createSubgraphClient,
  waitUntilSubgraphIsSynced,
} from "../utils/helpers";

import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
// @dev dummy shared minter used to test shared minter filter, but isn't used in production
import { DummySharedMinter__factory } from "../../contracts/factories/DummySharedMinter__factory";
import { DummySharedMinter } from "../../contracts";

// waiting for subgraph to sync can take longer than the default 5s timeout
jest.setTimeout(30 * 1000);

const config = getSubgraphConfig();

const client = createSubgraphClient();
const { deployer, artist } = getAccounts();

// set up contract instances and/or addresses
const minterFilterAdminACLV0Address =
  config.metadata?.minterFilterAdminACLAddress;
if (!minterFilterAdminACLV0Address)
  throw new Error(
    "No minter filter admin ACL address found in config metadata"
  );

const coreRegistryAddress = config.metadata?.coreRegistryAddress;
if (!coreRegistryAddress)
  throw new Error("No core registry address found in config metadata");

const sharedMinterFilter = config.sharedMinterFilterContracts?.[0];
if (!sharedMinterFilter) {
  throw new Error("No shared minter filter found in config metadata");
}
const sharedMinterFilterContract = new MinterFilterV2__factory(deployer).attach(
  sharedMinterFilter.address
);

// helper functions

// @dev deploys a new shared minter and waits for the subgraph to sync
// @returns the deployed shared minter
async function deployNewMinter(
  sharedMinterFilterAddress: string
): Promise<DummySharedMinter> {
  const dummySharedMinterFactory = new DummySharedMinter__factory(deployer);
  const dummySharedMinter = await dummySharedMinterFactory.deploy(
    sharedMinterFilterAddress
  );
  await dummySharedMinter.deployed();
  await waitUntilSubgraphIsSynced(client);
  return dummySharedMinter;
}

describe("MinterFilterV2 event handling", () => {
  beforeAll(async () => {
    await waitUntilSubgraphIsSynced(client);
  });

  describe("Deployed", () => {
    test("creates new MinterFilter during deployment", async () => {
      const targetId = sharedMinterFilter.address.toLowerCase();

      const minterFiltersRes = await client
        .query<
          GetTargetMinterFiltersQuery,
          GetTargetMinterFiltersQueryVariables
        >(GetTargetMinterFiltersDocument, { targetId })
        .toPromise();
      expect(minterFiltersRes.data?.minterFilters.length).toBe(1);
      expect(minterFiltersRes.data?.minterFilters[0].id).toBe(targetId);
    });

    test("created new CoreRegistry during deployment", async () => {
      const targetId = coreRegistryAddress.toLowerCase();

      const coreRegistryRes = await client
        .query<
          GetTargetCoreRegistriesQuery,
          GetTargetCoreRegistriesQueryVariables
        >(GetTargetCoreRegistriesDocument, { targetId })
        .toPromise();
      expect(coreRegistryRes.data?.coreRegistries.length).toBe(1);
      expect(coreRegistryRes.data?.coreRegistries[0].id).toBe(targetId);
    });

    test("populates MinterFilter entity during deployment", async () => {
      const targetId = sharedMinterFilter.address.toLowerCase();

      const minterFiltersRes = await client
        .query<
          GetTargetMinterFiltersQuery,
          GetTargetMinterFiltersQueryVariables
        >(GetTargetMinterFiltersDocument, { targetId })
        .toPromise();
      const minterFilter = minterFiltersRes.data?.minterFilters[0];
      // verify minter filter fields
      expect(minterFilter?.id).toBe(targetId);
      expect(minterFilter?.coreRegistry.id).toBe(
        coreRegistryAddress.toLowerCase()
      );
      // updated at not checked for exact value because its was not recorded during seed deployment
      // to be defined is sufficient
      expect(minterFilter?.updatedAt).toBeDefined();
    });
  });

  describe("MinterApprovedGlobally", () => {
    it("creates new Minter entity", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // @dev minter does not yet exist because it is not in subgraph config
      // approve minter globally
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterGlobally(newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter entity was created
      const minterId = newMinter.address.toLowerCase();
      const minterRes = (
        await client
          .query<GetTargetMintersQuery, GetTargetMintersQueryVariables>(
            GetTargetMintersDocument,
            { targetId: minterId }
          )
          .toPromise()
      ).data?.minters[0];
      if (!minterRes) throw new Error("No minter entity found");
      expect(minterRes.id).toBe(minterId);
    });

    it("populates Minter entity as expected", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // @dev minter does not yet exist because it is not in subgraph config
      // approve minter globally
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterGlobally(newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter entity was created and is globally allowlisted
      const minterId = newMinter.address.toLowerCase();
      const minterRes = (
        await client
          .query<GetTargetMintersQuery, GetTargetMintersQueryVariables>(
            GetTargetMintersDocument,
            { targetId: minterId }
          )
          .toPromise()
      ).data?.minters[0];
      // verify minter fields were populated as expected
      if (!minterRes) throw new Error("No minter entity found");
      expect(minterRes.id).toBe(minterId);
      expect(minterRes.type).toBe("DummySharedMinter");
      expect(minterRes.minterFilter.id).toBe(
        sharedMinterFilter.address.toLowerCase()
      );
      expect(minterRes.extraMinterDetails).toBe("{}");
      expect(minterRes.isGloballyAllowlistedOnMinterFilter).toBe(true);
    });

    it("updates MinterFilter entity global allowlist", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // @dev minter does not yet exist because it is not in subgraph config
      // approve minter globally
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterGlobally(newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter filter global allowlist was updated
      const minterFilterId = sharedMinterFilter.address.toLowerCase();
      const minterFilterRes = (
        await client
          .query<
            GetTargetMinterFiltersQuery,
            GetTargetMinterFiltersQueryVariables
          >(GetTargetMinterFiltersDocument, { targetId: minterFilterId })
          .toPromise()
      ).data?.minterFilters[0];
      if (!minterFilterRes) throw new Error("No minter filter entity found");
      expect(
        minterFilterRes.minterGlobalAllowlist.map((minter) => minter.id)
      ).toContain(newMinter.address.toLowerCase());
      // derived field of knownMinters should also be updated
      expect(minterFilterRes.knownMinters.map((minter) => minter.id)).toContain(
        newMinter.address.toLowerCase()
      );
    });
  });

  describe("MinterRemovedFromGlobalAllowlist", () => {
    it("updates Minter entity", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // add minter to global allowlist
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterGlobally(newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter entity was updated to be globally allowlisted
      const minterId = newMinter.address.toLowerCase();
      const minterRes = (
        await client
          .query<GetTargetMintersQuery, GetTargetMintersQueryVariables>(
            GetTargetMintersDocument,
            { targetId: minterId }
          )
          .toPromise()
      ).data?.minters[0];
      if (!minterRes) throw new Error("No minter entity found");
      expect(minterRes.id).toBe(minterId);
      expect(minterRes.isGloballyAllowlistedOnMinterFilter).toBe(true);
      // remove minter from global allowlist, verify minter entity was updated
      await sharedMinterFilterContract
        .connect(deployer)
        .revokeMinterGlobally(newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      const minterRes2 = (
        await client
          .query<GetTargetMintersQuery, GetTargetMintersQueryVariables>(
            GetTargetMintersDocument,
            { targetId: minterId }
          )
          .toPromise()
      ).data?.minters[0];
      if (!minterRes2) throw new Error("No minter entity found");
      expect(minterRes2.id).toBe(minterId);
      expect(minterRes2.isGloballyAllowlistedOnMinterFilter).toBe(false);
    });

    it("updates MinterFilter entity", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // add minter to global allowlist
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterGlobally(newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter filter global allowlist contains new minter
      const minterFilterId = sharedMinterFilter.address.toLowerCase();
      const minterFilterRes = (
        await client
          .query<
            GetTargetMinterFiltersQuery,
            GetTargetMinterFiltersQueryVariables
          >(GetTargetMinterFiltersDocument, { targetId: minterFilterId })
          .toPromise()
      ).data?.minterFilters[0];
      if (!minterFilterRes) throw new Error("No minter filter entity found");
      expect(
        minterFilterRes.minterGlobalAllowlist.map((minter) => minter.id)
      ).toContain(newMinter.address.toLowerCase());
      // remove minter from global allowlist
      await sharedMinterFilterContract
        .connect(deployer)
        .revokeMinterGlobally(newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter filter global allowlist does not contain new minter
      const minterFilterRes2 = (
        await client
          .query<
            GetTargetMinterFiltersQuery,
            GetTargetMinterFiltersQueryVariables
          >(GetTargetMinterFiltersDocument, { targetId: minterFilterId })
          .toPromise()
      ).data?.minterFilters[0];
      if (!minterFilterRes2) throw new Error("No minter filter entity found");
      expect(
        minterFilterRes2.minterGlobalAllowlist.map((minter) => minter.id)
      ).not.toContain(newMinter.address.toLowerCase());
      // derived field of knownMinters should still contain the minter
      expect(minterFilterRes.knownMinters.map((minter) => minter.id)).toContain(
        newMinter.address.toLowerCase()
      );
    });
  });
});
