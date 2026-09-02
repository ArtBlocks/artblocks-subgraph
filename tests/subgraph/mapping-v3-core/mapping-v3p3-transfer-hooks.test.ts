import {
  assert,
  clearStore,
  test,
  newMockEvent,
  describe,
  beforeEach
} from "matchstick-as/assembly/index";
import { BigInt, Bytes, ethereum, Address } from "@graphprotocol/graph-ts";
import {
  PROJECT_ENTITY_TYPE,
  CURRENT_BLOCK_TIMESTAMP,
  RandomAddressGenerator,
  TEST_CONTRACT_ADDRESS,
  addTestContractToStoreOfTypeAndVersion,
  addNewProjectToStore
} from "../shared-helpers";
import { generateContractSpecificId } from "../../../src/helpers";
import { Project } from "../../../generated/schema";
import {
  handleProjectTransferHookUpdated,
  handleProjectTransferHookLocked,
  handleProjectUpdated,
  getIsPreV3_2,
  ENUM_FIELD_PROJECT_TRANSFER_HOOK,
  ENUM_FIELD_PROJECT_TRANSFER_HOOK_LOCKED
} from "../../../src/mapping-v3-core";
import { ProjectUpdated } from "../../../generated/IGenArt721CoreV3_Base/IGenArt721CoreContractV3_Base";
import {
  ProjectTransferHookUpdated,
  ProjectTransferHookLocked
} from "../../../generated/templates/IGenArt721CoreV3_Engine_Template/IGenArt721CoreContractV3_Engine";

const randomAddressGenerator = new RandomAddressGenerator();

const coreType = "GenArt721CoreV3_Engine";
const coreVersion = "v3.3.0"; // test v3.3 contract handling (transfer hooks)

const PROJECT_ID = BigInt.fromI32(0);
const FULL_PROJECT_ID = generateContractSpecificId(
  TEST_CONTRACT_ADDRESS,
  PROJECT_ID
);

function seedProject(): void {
  clearStore();
  addTestContractToStoreOfTypeAndVersion(
    BigInt.fromI32(1),
    coreType,
    coreVersion
  );
  addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    PROJECT_ID,
    "Test Project",
    randomAddressGenerator.generateRandomAddress(),
    BigInt.fromI32(0),
    CURRENT_BLOCK_TIMESTAMP
  );
}

/**
 * Assert on the entity rather than with `assert.fieldEquals(..., "null")`.
 *
 * @dev A nullable field that was never assigned is ABSENT from the entity, not
 * present-and-null, so `fieldEquals` fails with "No field named ...". Assigning
 * null does not help either: the generated setter calls `unset()`. Note also
 * that graph-ts types the nullable `Boolean` as a non-null `boolean` getter
 * returning false when absent — the null/true distinction this schema relies on
 * is real at the GraphQL layer but invisible from AssemblyScript.
 */
function loadTestProject(): Project {
  return changetype<Project>(Project.load(FULL_PROJECT_ID));
}

function hookUpdatedEvent(hook: Address): ProjectTransferHookUpdated {
  const event: ProjectTransferHookUpdated = changetype<
    ProjectTransferHookUpdated
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(PROJECT_ID)
    ),
    new ethereum.EventParam("_hook", ethereum.Value.fromAddress(hook))
  ];
  return event;
}

function hookLockedEvent(hook: Address): ProjectTransferHookLocked {
  const event: ProjectTransferHookLocked = changetype<
    ProjectTransferHookLocked
  >(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(PROJECT_ID)
    ),
    new ethereum.EventParam("_hook", ethereum.Value.fromAddress(hook))
  ];
  return event;
}

function projectUpdatedEvent(field: Bytes): ProjectUpdated {
  const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(PROJECT_ID)
    ),
    new ethereum.EventParam("_update", ethereum.Value.fromBytes(field))
  ];
  return event;
}

describe(`${coreType}-${coreVersion}: transfer hooks`, () => {
  beforeEach(() => {
    seedProject();
  });

  test("a new project has no hook and no explicit lock", () => {
    // @dev null on transferHookLocked means "no explicit lock action observed",
    // NOT "unlocked" — the four-week auto-lock is derived by consumers
    const project = loadTestProject();
    assert.assertTrue(!project.transferHook);
    assert.assertTrue(!project.transferHookLocked);
  });

  test("configuring a hook records its address", () => {
    const hook = randomAddressGenerator.generateRandomAddress();
    handleProjectTransferHookUpdated(hookUpdatedEvent(hook));
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      FULL_PROJECT_ID,
      "transferHook",
      hook.toHexString()
    );
    // configuring is not locking
    assert.assertTrue(!loadTestProject().transferHookLocked);
  });

  test("clearing a hook stores null rather than the zero address", () => {
    const hook = randomAddressGenerator.generateRandomAddress();
    handleProjectTransferHookUpdated(hookUpdatedEvent(hook));
    handleProjectTransferHookUpdated(hookUpdatedEvent(Address.zero()));
    assert.assertTrue(!loadTestProject().transferHook);
  });

  test("locking sets transferHookLocked and leaves the hook in place", () => {
    const hook = randomAddressGenerator.generateRandomAddress();
    handleProjectTransferHookUpdated(hookUpdatedEvent(hook));
    handleProjectTransferHookLocked(hookLockedEvent(hook));
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      FULL_PROJECT_ID,
      "transferHookLocked",
      "true"
    );
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      FULL_PROJECT_ID,
      "transferHook",
      hook.toHexString()
    );
  });

  test("locking at the zero address is recorded", () => {
    // an artist may permanently lock a project at "no hook", which is the
    // pre-v3.3 transfer security profile
    handleProjectTransferHookLocked(hookLockedEvent(Address.zero()));
    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      FULL_PROJECT_ID,
      "transferHookLocked",
      "true"
    );
    assert.assertTrue(!loadTestProject().transferHook);
  });

  test("hook events for an unknown project are ignored, not fatal", () => {
    clearStore();
    const hook = randomAddressGenerator.generateRandomAddress();
    handleProjectTransferHookUpdated(hookUpdatedEvent(hook));
    handleProjectTransferHookLocked(hookLockedEvent(hook));
    assert.notInStore(PROJECT_ENTITY_TYPE, FULL_PROJECT_ID);
  });

  test("ProjectUpdated fields 17 and 18 are recognized no-ops", () => {
    // the core emits these alongside the dedicated events; they must not be
    // treated as unknown fields, and must not themselves mutate hook state
    const hook = randomAddressGenerator.generateRandomAddress();
    handleProjectTransferHookUpdated(hookUpdatedEvent(hook));

    handleProjectUpdated(projectUpdatedEvent(ENUM_FIELD_PROJECT_TRANSFER_HOOK));
    handleProjectUpdated(
      projectUpdatedEvent(ENUM_FIELD_PROJECT_TRANSFER_HOOK_LOCKED)
    );

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      FULL_PROJECT_ID,
      "transferHook",
      hook.toHexString()
    );
    assert.assertTrue(!loadTestProject().transferHookLocked);
  });
});

describe("core version parsing", () => {
  test("v3.3 is not treated as pre-v3.2", () => {
    // getIsPreV3_2 is an allowlist of versions that predate v3.2, not a check
    // for "is v3.2". That shape is why v3.3 needed no parsing changes, and this
    // pins it so a future refactor to `startsWith("v3.2.")` fails here.
    assert.assertTrue(!getIsPreV3_2("v3.3.0"));
    assert.assertTrue(!getIsPreV3_2("v3.3.1"));
    assert.assertTrue(!getIsPreV3_2("v3.2.9"));
    assert.assertTrue(getIsPreV3_2("v3.0.0"));
    assert.assertTrue(getIsPreV3_2("v3.1.4"));
  });
});
