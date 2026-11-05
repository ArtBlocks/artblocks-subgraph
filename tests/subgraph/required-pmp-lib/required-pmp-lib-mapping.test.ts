import {
  assert,
  clearStore,
  describe,
  test,
  beforeEach,
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

import { Minter, Project } from "../../../generated/schema";
import { ProjectRequiredPMPKeysUpdated } from "../../../generated/RequiredPMPLib/RequiredPMPLib";
import { handleProjectRequiredPMPKeysUpdated } from "../../../src/required-pmp-lib-mapping";
import {
  generateContractSpecificId,
  getProjectMinterConfigId
} from "../../../src/helpers";

const PROJECT_NUMBER = BigInt.fromI32(0);

function createProjectRequiredPMPKeysUpdatedEvent(
  minterAddress: Address,
  requiredPMPKeys: string[],
  timestamp: BigInt
): ProjectRequiredPMPKeysUpdated {
  const event = changetype<ProjectRequiredPMPKeysUpdated>(newMockEvent());
  event.address = minterAddress;
  event.block.timestamp = timestamp;
  event.parameters = [
    new ethereum.EventParam(
      "projectId",
      ethereum.Value.fromUnsignedBigInt(PROJECT_NUMBER)
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
  let minter: Minter;
  let project: Project;
  let configId: string;

  beforeEach(() => {
    clearStore();
    minter = addNewMinterToStore("MinterSetPricePMPV0");
    project = addNewProjectToStore(
      TEST_CONTRACT_ADDRESS,
      PROJECT_NUMBER,
      "Test Project",
      TEST_ARTIST_ADDRESS,
      ONE_ETH_IN_WEI,
      CURRENT_BLOCK_TIMESTAMP
    );
    configId = getProjectMinterConfigId(minter.id, project.id);
  });

  test("stores required PMP keys in extraMinterDetails", () => {
    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        Address.fromString(minter.id),
        ["color", "name"],
        CURRENT_BLOCK_TIMESTAMP
      )
    );

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      configId,
      "extraMinterDetails",
      '{"requiredPMPKeys":["color","name"]}'
    );
  });

  test("clears required PMP keys when updated with an empty array", () => {
    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        Address.fromString(minter.id),
        ["color"],
        CURRENT_BLOCK_TIMESTAMP
      )
    );
    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        Address.fromString(minter.id),
        [],
        CURRENT_BLOCK_TIMESTAMP
      )
    );

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      configId,
      "extraMinterDetails",
      '{"requiredPMPKeys":[]}'
    );
  });

  test("skips keys that are not JSON-safe", () => {
    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        Address.fromString(minter.id),
        ["color", 'bad"key', "bad\\key", "name"],
        CURRENT_BLOCK_TIMESTAMP
      )
    );

    assert.fieldEquals(
      PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE,
      configId,
      "extraMinterDetails",
      '{"requiredPMPKeys":["color","name"]}'
    );
  });

  test("updates project updatedAt when the minter config is active", () => {
    project.minterConfiguration = configId;
    project.save();
    const updatedTimestamp = CURRENT_BLOCK_TIMESTAMP.plus(BigInt.fromI32(10));

    handleProjectRequiredPMPKeysUpdated(
      createProjectRequiredPMPKeysUpdatedEvent(
        Address.fromString(minter.id),
        ["color"],
        updatedTimestamp
      )
    );

    assert.fieldEquals(
      PROJECT_ENTITY_TYPE,
      generateContractSpecificId(TEST_CONTRACT_ADDRESS, PROJECT_NUMBER),
      "updatedAt",
      updatedTimestamp.toString()
    );
  });

  test("does not create a config when the project does not exist", () => {
    const event = createProjectRequiredPMPKeysUpdatedEvent(
      Address.fromString(minter.id),
      ["color"],
      CURRENT_BLOCK_TIMESTAMP
    );
    event.parameters[0] = new ethereum.EventParam(
      "projectId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(999))
    );

    handleProjectRequiredPMPKeysUpdated(event);

    assert.entityCount(PROJECT_MINTER_CONFIGURATION_ENTITY_TYPE, 0);
  });
});
