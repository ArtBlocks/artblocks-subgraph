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
// get contract from the subgraph config
if (!config.iGenArt721CoreContractV3_BaseContracts) {
  throw new Error("No iGenArt721CoreContractV3_BaseContracts in config");
}
const genArt721CoreAddress =
  config.iGenArt721CoreContractV3_BaseContracts[0].address;

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

  describe("MinterApprovedForContract", () => {
    it("updates MinterFilter entity", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // approve minter for contract
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterForContract(genArt721CoreAddress, newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter filter contract allowlist was updated
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
        minterFilterRes.minterFilterContractAllowlists.map(
          (minterFilterContractAllowlists) =>
            minterFilterContractAllowlists.contract.id
        )
      ).toContain(genArt721CoreAddress.toLowerCase());
      // get target minter filter contract allowlist
      const minterFilterContractAllowlistRes =
        minterFilterRes.minterFilterContractAllowlists.find(
          (minterFilterContractAllowlists) =>
            minterFilterContractAllowlists.contract.id ===
            genArt721CoreAddress.toLowerCase()
        );
      if (!minterFilterContractAllowlistRes)
        throw new Error("No minter filter contract allowlist entity found");
      // verify minter was added to contract allowlist
      expect(
        minterFilterContractAllowlistRes.minterContractAllowlist.map(
          (minter) => minter.id
        )
      ).toContain(newMinter.address.toLowerCase());
      // derived field of knownMinters should also be updated
      expect(minterFilterRes.knownMinters.map((minter) => minter.id)).toContain(
        newMinter.address.toLowerCase()
      );
      // clean up - remove minter from contract allowlist
      await sharedMinterFilterContract
        .connect(deployer)
        .revokeMinterForContract(genArt721CoreAddress, newMinter.address);
    });

    it("does not update minter to be globally allowlisted", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // approve minter for contract
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterForContract(genArt721CoreAddress, newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter is not globally allowlisted
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
      expect(minterRes.isGloballyAllowlistedOnMinterFilter).toBe(false);
      // clean up - remove minter from contract allowlist
      await sharedMinterFilterContract
        .connect(deployer)
        .revokeMinterForContract(genArt721CoreAddress, newMinter.address);
    });
  });

  describe("MinterRevokedForContract", () => {
    it("updates MinterFilter entity", async () => {
      // deploy two new shared minters
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      const newMinter2 = await deployNewMinter(sharedMinterFilter.address);
      // approve minters for contract
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterForContract(genArt721CoreAddress, newMinter.address);
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterForContract(genArt721CoreAddress, newMinter2.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter filter contract allowlist was updated
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
      // get target minter filter contract allowlist
      const minterFilterContractAllowlistRes =
        minterFilterRes.minterFilterContractAllowlists.find(
          (minterFilterContractAllowlists) =>
            minterFilterContractAllowlists.contract.id ===
            genArt721CoreAddress.toLowerCase()
        );
      if (!minterFilterContractAllowlistRes)
        throw new Error("No minter filter contract allowlist entity found");
      // verify minters were added to contract allowlist
      expect(
        minterFilterContractAllowlistRes.minterContractAllowlist.map(
          (minter) => minter.id
        )
      ).toContain(newMinter.address.toLowerCase());
      expect(
        minterFilterContractAllowlistRes.minterContractAllowlist.map(
          (minter) => minter.id
        )
      ).toContain(newMinter2.address.toLowerCase());

      // revoke newMinter for contract
      await sharedMinterFilterContract
        .connect(deployer)
        .revokeMinterForContract(genArt721CoreAddress, newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter filter contract allowlist was updated
      const minterFilterRes2 = (
        await client
          .query<
            GetTargetMinterFiltersQuery,
            GetTargetMinterFiltersQueryVariables
          >(GetTargetMinterFiltersDocument, { targetId: minterFilterId })
          .toPromise()
      ).data?.minterFilters[0];
      if (!minterFilterRes2) throw new Error("No minter filter entity found");
      // get target minter filter contract allowlist
      const minterFilterContractAllowlistRes2 =
        minterFilterRes2.minterFilterContractAllowlists.find(
          (minterFilterContractAllowlists) =>
            minterFilterContractAllowlists.contract.id ===
            genArt721CoreAddress.toLowerCase()
        );
      if (!minterFilterContractAllowlistRes2)
        throw new Error("No minter filter contract allowlist entity found");
      // verify newMinter was removed from contract allowlist
      expect(
        minterFilterContractAllowlistRes2.minterContractAllowlist.map(
          (minter) => minter.id
        )
      ).not.toContain(newMinter.address.toLowerCase());
      // verify newMinter2 is still in contract allowlist
      expect(
        minterFilterContractAllowlistRes2.minterContractAllowlist.map(
          (minter) => minter.id
        )
      ).toContain(newMinter2.address.toLowerCase());
      // revoke newMinter2 for contract
      await sharedMinterFilterContract
        .connect(deployer)
        .revokeMinterForContract(genArt721CoreAddress, newMinter2.address);
      await waitUntilSubgraphIsSynced(client);
      // verify minter filter contract allowlist was updated
      const minterFilterRes3 = (
        await client
          .query<
            GetTargetMinterFiltersQuery,
            GetTargetMinterFiltersQueryVariables
          >(GetTargetMinterFiltersDocument, { targetId: minterFilterId })
          .toPromise()
      ).data?.minterFilters[0];
      if (!minterFilterRes3) throw new Error("No minter filter entity found");
      // get target minter filter contract allowlist
      const minterFilterContractAllowlistRes3 =
        minterFilterRes3.minterFilterContractAllowlists.find(
          (minterFilterContractAllowlists) =>
            minterFilterContractAllowlists.contract.id ===
            genArt721CoreAddress.toLowerCase()
        );
      // vefify that the contract allowlist entity was deleted, since it is now empty
      expect(minterFilterContractAllowlistRes3).toBeUndefined();
      // derived field of knownMinters should still have minter
      expect(minterFilterRes.knownMinters.map((minter) => minter.id)).toContain(
        newMinter.address.toLowerCase()
      );
      // @dev already cleaned up contract minter allowlist
    });
  });
});
