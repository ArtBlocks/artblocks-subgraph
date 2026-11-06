import {
  assert,
  clearStore,
  describe,
  test,
  newMockEvent
} from "matchstick-as/assembly/index";
import { BigInt, ethereum, Address } from "@graphprotocol/graph-ts";
import {
  PROJECT_ENTITY_TYPE,
  PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
  CURRENT_BLOCK_TIMESTAMP,
  TEST_CONTRACT_ADDRESS,
  TEST_ARTIST_ADDRESS,
  ONE_ETH_IN_WEI,
  addNewMinterToStore,
  addNewProjectToStore
} from "../shared-helpers";

import { Project } from "../../../generated/schema";
import { ProjectRequiredPMPKeysUpdated } from "../../../generated/RequiredPMPLib/ISharedMinterRequiredPMPV0";
import { handleProjectRequiredPMPKeysUpdated } from "../../../src/required-pmp-lib-mapping";
import { getProjectMinterConfigId } from "../../../src/helpers";

const PROJECT_NUMBER = BigInt.fromI32(0);

class TestSetup {
  minterAddress: Address;
  project: Project;
  configId: string;

  constructor(minterAddress: Address, project: Project, configId: string) {
    this.minterAddress = minterAddress;
    this.project = project;
    this.configId = configId;
  }
}

// @dev AssemblyScript does not support closures, so each test calls this
// rather than sharing state through beforeEach
function setup(): TestSetup {
  clearStore();
  const minter = addNewMinterToStore("MinterSetPricePMPV0");
  const project = addNewProjectToStore(
    TEST_CONTRACT_ADDRESS,
    PROJECT_NUMBER,
    "Test Project",
    TEST_ARTIST_ADDRESS,
    ONE_ETH_IN_WEI,
    CURRENT_BLOCK_TIMESTAMP
  );
  return new TestSetup(
    Address.fromString(minter.id),
    project,
    getProjectMinterConfigId(minter.id, project.id)
  );
}

function createProjectRequiredPMPKeysUpdatedEvent(
  minterAddress: Address,
  projectNumber: BigInt,
  requiredPMPKeys: string[],
  timestamp: BigInt
): ProjectRequiredPMPKeysUpdated {
  const event = changetype<ProjectRequiredPMPKeysUpdated>(newMockEvent());
  event.address = minterAddress;
  event.block.timestamp = timestamp;
  event.parameters = [
    new ethereum.EventParam(
      "projectId",
      ethereum.Value.fromUnsignedBigInt(projectNumber)
    ),
    new ethereum.EventParam(
      "coreContract",
      ethereum.Value.fromAddress(TEST_CONTRACT_ADDRESS)
    ),
    new ethereum.EventParam(
      "requiredPMPKeys",
      ethereum.Value.fromStringArray(requiredPMPKeys)
    )
  ];
  return event;
}

describe("RequiredPMPLib/ProjectRequiredPMPKeysUpdated", () => {
  test("stores required PMP keys in extraMinterDetails", () => {
    const s = setup();

    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        s.minterAddress,
        PROJECT_NUMBER,
        ["color", "name"],
        CURRENT_BLOCK_TIMESTAMP
      )
    );

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      s.configId,
      "extraMinterDetails",
      '{"requiredPMPKeys":["color","name"]}'
    );
  });

  test("clears required PMP keys when updated with an empty array", () => {
    const s = setup();

    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        s.minterAddress,
        PROJECT_NUMBER,
        ["color"],
        CURRENT_BLOCK_TIMESTAMP
      )
    );
    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        s.minterAddress,
        PROJECT_NUMBER,
        [],
        CURRENT_BLOCK_TIMESTAMP
      )
    );

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      s.configId,
      "extraMinterDetails",
      '{"requiredPMPKeys":[]}'
    );
  });

  test("skips keys that are not JSON-safe", () => {
    const s = setup();

    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        s.minterAddress,
        PROJECT_NUMBER,
        ["color", 'bad"key', "bad\\key", "name"],
        CURRENT_BLOCK_TIMESTAMP
      )
    );

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      s.configId,
      "extraMinterDetails",
      '{"requiredPMPKeys":["color","name"]}'
    );
  });

  test("updates project updatedAt when the minter config is active", () => {
    const s = setup();
    s.project.minterConfiguration = s.configId;
    s.project.save();
    const updatedTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(10));

    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        s.minterAddress,
        PROJECT_NUMBER,
        ["color"],
        updatedTimestamp
      )
    );

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      s.project.id,
      "updatedAt",
      updatedTimestamp.toString()
    );
  });

  test("does not create a config when the project does not exist", () => {
    const s = setup();

    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        s.minterAddress,
        BigInt.fromI32(999),
        ["color"],
        CURRENT_BLOCK_TIMESTAMP
      )
    );

    assert.entityCount(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, 0);
  });
});
