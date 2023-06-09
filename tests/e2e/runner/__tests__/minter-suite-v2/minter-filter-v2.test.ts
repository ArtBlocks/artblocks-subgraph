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
  GetTargetProjectsDocument,
  GetTargetProjectsQuery,
  GetTargetProjectsQueryVariables,
  Minter,
} from "../../generated/graphql";
import {
  getSubgraphConfig,
  getAccounts,
  createSubgraphClient,
  waitUntilSubgraphIsSynced,
} from "../utils/helpers";

import {
  GenArt721CoreV3__factory,
  GenArt721CoreV3LibraryAddresses,
} from "../../contracts/factories/GenArt721CoreV3__factory";
import { MinterFilterV2__factory } from "../../contracts/factories/MinterFilterV2__factory";
// @dev dummy shared minter used to test shared minter filter, but isn't used in production
import { DummySharedMinter__factory } from "../../contracts/factories/DummySharedMinter__factory";
import { DummySharedMinter } from "../../contracts";
import { constants, ethers } from "ethers";
import { after } from "node:test";

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

const bytecodeStorageReaderAddress =
  config.metadata?.bytecodeStorageReaderAddress;
if (!bytecodeStorageReaderAddress)
  throw new Error(
    "No bytecode storage reader address found in config metadata"
  );
const linkLibraryAddresses: GenArt721CoreV3LibraryAddresses = {
  "contracts/libs/0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
    bytecodeStorageReaderAddress,
};
const genArt721CoreContract = new GenArt721CoreV3__factory(
  linkLibraryAddresses,
  deployer
).attach(genArt721CoreAddress);

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
    let newMinterAddressToCleanUp: string = "";
    afterEach(async () => {
      // clean up - remove minter from contract allowlist
      try {
        await sharedMinterFilterContract
          .connect(deployer)
          .revokeMinterForContract(
            genArt721CoreAddress,
            newMinterAddressToCleanUp
          );
      } catch (error) {
        // swallow error if minter didn't need removal (likely failed test)
      }
    });

    it("updates MinterFilter entity", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // ensure new minter address is cleaned up
      newMinterAddressToCleanUp = newMinter.address;
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
    });

    it("does not update minter to be globally allowlisted", async () => {
      // deploy a new shared minter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // ensure new minter address is cleaned up
      newMinterAddressToCleanUp = newMinter.address;
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
    let newMinterAddressToCleanUp: string = "";
    let newMinter2AddressToCleanUp: string = "";
    beforeEach(async () => {
      // attempt to clean up two minters in case of test failure
      try {
        // clean up - remove minter from contract allowlist
        await sharedMinterFilterContract
          .connect(deployer)
          .revokeMinterForContract(
            genArt721CoreAddress,
            newMinterAddressToCleanUp
          );
      } catch (error) {
        // swallow error if minter didn't need removal (likely failed test)
      }
      try {
        // clean up - remove minter from contract allowlist
        await sharedMinterFilterContract
          .connect(deployer)
          .revokeMinterForContract(
            genArt721CoreAddress,
            newMinter2AddressToCleanUp
          );
      } catch (error) {
        // swallow error if minter didn't need removal (likely failed test)
      }
    });

    it("updates MinterFilter entity", async () => {
      // deploy two new shared minters
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      newMinterAddressToCleanUp = newMinter.address;
      const newMinter2 = await deployNewMinter(sharedMinterFilter.address);
      newMinter2AddressToCleanUp = newMinter2.address;
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
    });
  });

  describe("ProjectMinterRegistered", () => {
    afterEach(async () => {
      try {
        // reset project minter
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (e) {
        // swallow error in case of test failure
      }
      try {
        // reset core contract MinterFilter
        await genArt721CoreContract
          .connect(deployer)
          .updateMinterContract(sharedMinterFilter.address);
      } catch (e) {
        // swallow error in case of test failure
      }
    });

    it("does not affect project if core contract's minterFilter is different", async () => {
      // temporarily update core contract's minterFilter to dummy address
      const dummyAddress = ethers.Wallet.createRandom().address;
      await genArt721CoreContract
        .connect(deployer)
        .updateMinterContract(dummyAddress);
      // deploy new minter connected to inactive minterFilter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // global allowlist newMinter on inactive minterFilter
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterGlobally(newMinter.address);
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(0, genArt721CoreAddress, newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // project should not be updated since core contract's minterFilter is different
      const projectRes = (
        await client
          .query<GetTargetProjectsQuery, GetTargetProjectsQueryVariables>(
            GetTargetProjectsDocument,
            { targetId: genArt721CoreAddress.toLowerCase().concat("-0") }
          )
          .toPromise()
      ).data?.projects[0];
      if (!projectRes) throw new Error("No project entity found");
      // fix
      expect(projectRes.minterConfiguration).toBeNull();
    });

    it("updates project's minterConfiguration when valid", async () => {
      // deploy new minter connected to active minterFilter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // global allowlist newMinter on active minterFilter
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterGlobally(newMinter.address);
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(0, genArt721CoreAddress, newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // project should be updated
      const projectRes = (
        await client
          .query<GetTargetProjectsQuery, GetTargetProjectsQueryVariables>(
            GetTargetProjectsDocument,
            { targetId: genArt721CoreAddress.toLowerCase().concat("-0") }
          )
          .toPromise()
      ).data?.projects[0];
      if (!projectRes) throw new Error("No project entity found");
      // verify minterConfiguration was updated as expected
      const projectMinterConfig = projectRes.minterConfiguration;
      if (!projectMinterConfig) {
        throw new Error("No minterConfiguration entity found");
      }
      expect(projectMinterConfig.minter.id).toEqual(
        newMinter.address.toLowerCase()
      );
      expect(projectMinterConfig.project.id).toEqual(
        genArt721CoreAddress.toLowerCase().concat("-0")
      );
      expect(projectMinterConfig.priceIsConfigured).toBe(false);
      expect(projectMinterConfig.currencySymbol).toBe("ETH");
      expect(projectMinterConfig.currencyAddress).toBe(constants.AddressZero);
      expect(projectMinterConfig.purchaseToDisabled).toBe(false);
      expect(projectMinterConfig.extraMinterDetails).toBe("{}");
      expect(projectMinterConfig.basePrice).toBeNull();
      expect(projectMinterConfig.maxInvocations).toBeNull();
    });
  });

  describe("ProjectMinterRemoved", () => {
    afterEach(async () => {
      // attempt to remove minter for project zero in case of test failure
      try {
        // reset project minter
        await sharedMinterFilterContract
          .connect(artist)
          .removeMinterForProject(0, genArt721CoreAddress);
      } catch (e) {
        // swallow error in case of test success
      }
    });

    it("clears project's minterConfiguration", async () => {
      // deploy new minter connected to active minterFilter
      const newMinter = await deployNewMinter(sharedMinterFilter.address);
      // global allowlist newMinter on active minterFilter
      await sharedMinterFilterContract
        .connect(deployer)
        .approveMinterGlobally(newMinter.address);
      await sharedMinterFilterContract
        .connect(artist)
        .setMinterForProject(0, genArt721CoreAddress, newMinter.address);
      await waitUntilSubgraphIsSynced(client);
      // project should be updated
      const projectRes = (
        await client
          .query<GetTargetProjectsQuery, GetTargetProjectsQueryVariables>(
            GetTargetProjectsDocument,
            { targetId: genArt721CoreAddress.toLowerCase().concat("-0") }
          )
          .toPromise()
      ).data?.projects[0];
      if (!projectRes) throw new Error("No project entity found");
      // verify minterConfiguration was updated as expected
      const projectMinterConfig = projectRes.minterConfiguration;
      if (!projectMinterConfig) {
        throw new Error("No minterConfiguration entity found");
      }
      expect(projectMinterConfig.minter.id).toEqual(
        newMinter.address.toLowerCase()
      );
      // remove minter from project
      await sharedMinterFilterContract
        .connect(artist)
        .removeMinterForProject(0, genArt721CoreAddress);
      await waitUntilSubgraphIsSynced(client);
      // project should be updated
      const projectRes2 = (
        await client
          .query<GetTargetProjectsQuery, GetTargetProjectsQueryVariables>(
            GetTargetProjectsDocument,
            { targetId: genArt721CoreAddress.toLowerCase().concat("-0") }
          )
          .toPromise()
      ).data?.projects[0];
      if (!projectRes2) throw new Error("No project entity found");
      // verify minterConfiguration was updated as expected
      expect(projectRes2.minterConfiguration).toBeNull();
      expect(parseInt(projectRes2.updatedAt)).toBeGreaterThan(
        parseInt(projectRes.updatedAt)
      );
    });
  });

  describe("CoreRegistryUpdated", () => {
    afterEach(async () => {
      // reset minter filter's core registry
      try {
        await sharedMinterFilterContract
          .connect(deployer)
          .updateCoreRegistry(coreRegistryAddress);
      } catch (error) {
        // swallow error in case of test failure
      }
    });

    it("updates minter filter's core registry", async () => {
      const dummyAddress = ethers.Wallet.createRandom().address;
      // update minter filter's core registry to dummy address
      await sharedMinterFilterContract
        .connect(deployer)
        .updateCoreRegistry(dummyAddress);
      await waitUntilSubgraphIsSynced(client);
      // verify minter filter's core registry was updated
      const minterFilterRes = (
        await client
          .query<
            GetTargetMinterFiltersQuery,
            GetTargetMinterFiltersQueryVariables
          >(GetTargetMinterFiltersDocument, {
            targetId: sharedMinterFilter.address.toLowerCase(),
          })
          .toPromise()
      ).data?.minterFilters[0];
      if (!minterFilterRes) throw new Error("No minterFilter entity found");
      expect(minterFilterRes.coreRegistry.id).toEqual(
        dummyAddress.toLowerCase()
      );
      // expect core registry to have been created with dummy address
      const coreRegistryRes = (
        await client
          .query<
            GetTargetCoreRegistriesQuery,
            GetTargetCoreRegistriesQueryVariables
          >(GetTargetCoreRegistriesDocument, {
            targetId: dummyAddress.toLowerCase(),
          })
          .toPromise()
      ).data?.coreRegistries[0];
      if (!coreRegistryRes) throw new Error("No coreRegistry entity found");
      expect(coreRegistryRes.id).toEqual(dummyAddress.toLowerCase());
    });
  });
});
