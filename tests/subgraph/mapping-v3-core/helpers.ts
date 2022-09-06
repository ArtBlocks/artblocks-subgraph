import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  createMockedFunction,
  newMockEvent
} from "matchstick-as/assembly/index";

// schema imports
import { Project } from "../../../generated/schema";

// helper src imports
import { generateContractSpecificId } from "../../../src/helpers";

// shared exports across all tests
import {
  CURRENT_BLOCK_TIMESTAMP,
  DEFAULT_PROJECT_VALUES,
  TEST_CONTRACT_ADDRESS,
  TEST_CONTRACT,
  PROJECT_ENTITY_TYPE,
  booleanToString
} from "../shared-helpers";
import {
  FIELD_PROJECT_ACTIVE,
  FIELD_PROJECT_ARTIST_NAME,
  FIELD_PROJECT_ASPECT_RATIO,
  FIELD_PROJECT_DESCRIPTION,
  FIELD_PROJECT_IPFS_HASH,
  FIELD_PROJECT_LICENSE,
  FIELD_PROJECT_MAX_INVOCATIONS,
  FIELD_PROJECT_NAME,
  FIELD_PROJECT_PAUSED,
  FIELD_PROJECT_SCRIPT_TYPE,
  FIELD_PROJECT_WEBSITE,
  handleProjectUpdated
} from "../../../src/mapping-v3-core";
import { ProjectUpdated } from "../../../generated/GenArt721CoreV3/GenArt721CoreV3";

// mocks return values for Soldity contract calls in refreshContract() helper function
export function mockRefreshContractCalls(
  nextProjectId: BigInt,
  overrides: Map<string, string> | null
): void {
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "admin",
    "admin():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.admin)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksAddress",
    "artblocksAddress():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.renderProviderAddress)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "artblocksPercentage",
    "artblocksPercentage():(uint256)"
  ).returns([
    ethereum.Value.fromUnsignedBigInt(TEST_CONTRACT.renderProviderPercentage)
  ]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "nextProjectId",
    "nextProjectId():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(nextProjectId)]);

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "randomizerContract",
    "randomizerContract():(address)"
  ).returns([ethereum.Value.fromAddress(TEST_CONTRACT.randomizerContract)]);
}

export function mockTokenURICall(tokenId: BigInt, tokenURI: string): void {
  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "tokenURI",
    "tokenURI(uint256):(string)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
    .returns([ethereum.Value.fromString(tokenURI)]);
}

export function mockProjectDetailsCall(
  projectId: BigInt,
  projectName: string,
  overrides: Map<string, string> | null
): void {
  let projectDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(projectName),
    ethereum.Value.fromString(
      overrides && overrides.has("artistName")
        ? changetype<Map<string, string>>(overrides).get("artistName")
        : DEFAULT_PROJECT_VALUES.artistName
    ), // artistName
    ethereum.Value.fromString(
      overrides && overrides.has("description")
        ? changetype<Map<string, string>>(overrides).get("description")
        : DEFAULT_PROJECT_VALUES.description
    ), // description
    ethereum.Value.fromString(
      overrides && overrides.has("website")
        ? changetype<Map<string, string>>(overrides).get("website")
        : DEFAULT_PROJECT_VALUES.website
    ), // website
    ethereum.Value.fromString(
      overrides && overrides.has("license")
        ? changetype<Map<string, string>>(overrides).get("license")
        : DEFAULT_PROJECT_VALUES.license
    ) // license
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectDetails",
    "projectDetails(uint256):(string,string,string,string,string)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectDetailsReturnArray);
}

export function mockProjectScriptDetailsCall(
  projectId: BigInt,
  overrides: Map<string, string> | null
): void {
  let projectScriptDetailsReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromString(
      overrides && overrides.has("scriptTypeAndVersion")
        ? changetype<Map<string, string>>(overrides).get("scriptTypeAndVersion")
        : DEFAULT_PROJECT_VALUES.scriptTypeAndVersion
    ), // scriptTypeAndVersion
    ethereum.Value.fromString(
      overrides && overrides.has("aspectRatio")
        ? changetype<Map<string, string>>(overrides).get("aspectRatio")
        : DEFAULT_PROJECT_VALUES.aspectRatio
    ), // aspectRatio
    ethereum.Value.fromString(
      overrides && overrides.has("ipfsHash")
        ? changetype<Map<string, string>>(overrides).get("ipfsHash")
        : DEFAULT_PROJECT_VALUES.ipfsHash
    ), // ipfsHash
    ethereum.Value.fromUnsignedBigInt(
      overrides && overrides.has("scriptCount")
        ? BigInt.fromString(
            changetype<Map<string, string>>(overrides).get("scriptCount")
          )
        : DEFAULT_PROJECT_VALUES.scriptCount
    ) // scriptCount
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectScriptDetails",
    "projectScriptDetails(uint256):(string,string,string,uint256)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectScriptDetailsReturnArray);
}

export function mockProjectStateDataCall(
  projectId: BigInt,
  overrides: Map<string, string> | null
): void {
  let projectStateDataReturnArray: Array<ethereum.Value> = [
    ethereum.Value.fromUnsignedBigInt(
      overrides && overrides.has("invocations")
        ? BigInt.fromString(
            changetype<Map<string, string>>(overrides).get("invocations")
          )
        : DEFAULT_PROJECT_VALUES.invocations
    ), // invocations
    ethereum.Value.fromUnsignedBigInt(
      overrides && overrides.has("maxInvocations")
        ? BigInt.fromString(
            changetype<Map<string, string>>(overrides).get("maxInvocations")
          )
        : DEFAULT_PROJECT_VALUES.maxInvocations
    ), // maxInvocations
    ethereum.Value.fromBoolean(
      overrides && overrides.has("active")
        ? changetype<Map<string, string>>(overrides).get("active") == "true"
        : DEFAULT_PROJECT_VALUES.active
    ), // active
    ethereum.Value.fromBoolean(
      overrides && overrides.has("paused")
        ? changetype<Map<string, string>>(overrides).get("paused") == "true"
        : DEFAULT_PROJECT_VALUES.paused
    ), // paused
    ethereum.Value.fromBoolean(
      overrides && overrides.has("locked")
        ? changetype<Map<string, string>>(overrides).get("locked") == "true"
        : DEFAULT_PROJECT_VALUES.paused
    ) // locked
  ];

  createMockedFunction(
    TEST_CONTRACT_ADDRESS,
    "projectStateData",
    "projectStateData(uint256):(uint256,uint256,bool,bool,bool)"
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(projectId)])
    .returns(projectStateDataReturnArray);
}

//

/**
 * @param  {string} updateField - The update field on the event. Can be "projectName", "artistName", "description", "website", "license"
 * @param  {string} newValue - The new value for the update to be returned by the mocked function
 * @returns void
 * This function should only be used in "GenArt721CoreV3: handleProjectUpdated" > "updated" > "projectDetailsUpdated"
 * as it assumes that context. We would define the function within that block but closures in assemblyscript are
 * not currently supported (https://www.assemblyscript.org/status.html#on-closures).
 */
export function testProjectDetailsUpdated(
  updateField: string,
  newValue: string
): void {
  const validFieldNames = [
    FIELD_PROJECT_ARTIST_NAME,
    FIELD_PROJECT_DESCRIPTION,
    FIELD_PROJECT_LICENSE,
    FIELD_PROJECT_NAME,
    FIELD_PROJECT_WEBSITE
  ];

  if (!validFieldNames.includes(updateField)) {
    throw new Error("Invalid update field");
  }

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const project: Project = changetype<Project>(Project.load(fullProjectId));
  let oldFieldValue: string | null = null;
  if (updateField == FIELD_PROJECT_ARTIST_NAME) {
    oldFieldValue = project.artistName;
  } else if (updateField == FIELD_PROJECT_DESCRIPTION) {
    oldFieldValue = project.description;
  } else if (updateField == FIELD_PROJECT_LICENSE) {
    oldFieldValue = project.license;
  } else if (updateField == FIELD_PROJECT_NAME) {
    oldFieldValue = project.name;
  } else if (updateField == FIELD_PROJECT_WEBSITE) {
    oldFieldValue = project.website;
  }
  const newFieldValue = newValue;

  const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_update",
      ethereum.Value.fromBytes(Bytes.fromUTF8(updateField))
    )
  ];

  const projectDetailsCallReturnOverrides = new Map<string, string>();
  projectDetailsCallReturnOverrides.set(updateField, newValue);
  mockProjectDetailsCall(
    projectId,
    changetype<string>(updateField == "name" ? newValue : project.name),
    projectDetailsCallReturnOverrides
  );

  assert.assertTrue(oldFieldValue != newFieldValue);

  handleProjectUpdated(event);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    updateField,
    newFieldValue
  );
}

/**
 * @param  {string} updateField - The update field on the event. Can be "active", "maxInvocations", "paused"
 * @param  {string} newValueAsString - The new value converted to a string if not already a string for the update to be returned by the mocked function
 * @returns void
 * This function should only be used in "GenArt721CoreV3: handleProjectUpdated" > "updated" > "projectStateDataUpdated"
 * as it assumes that context. We would define the function within that block but closures in assemblyscript are
 * not yet supported (https://www.assemblyscript.org/status.html#on-closures).
 */
export function testProjectStateDataUpdated(
  updateField: string,
  newValueAsString: string
): void {
  const validFieldNames = [
    FIELD_PROJECT_ACTIVE,
    FIELD_PROJECT_MAX_INVOCATIONS,
    FIELD_PROJECT_PAUSED
  ];

  if (!validFieldNames.includes(updateField)) {
    throw new Error("Invalid update field");
  }

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const project: Project = changetype<Project>(Project.load(fullProjectId));

  let oldFieldValueAsString: string | null = null;
  if (updateField == FIELD_PROJECT_ACTIVE) {
    oldFieldValueAsString = booleanToString(project.active);
  } else if (updateField == FIELD_PROJECT_MAX_INVOCATIONS) {
    oldFieldValueAsString = project.maxInvocations.toString();
  } else if (updateField == FIELD_PROJECT_PAUSED) {
    oldFieldValueAsString = booleanToString(project.paused);
  }

  const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_update",
      ethereum.Value.fromBytes(Bytes.fromUTF8(FIELD_PROJECT_ACTIVE))
    )
  ];

  const projectStateDataCallReturnOverrides = new Map<string, string>();
  projectStateDataCallReturnOverrides.set(updateField, newValueAsString);
  mockProjectStateDataCall(projectId, projectStateDataCallReturnOverrides);

  assert.assertTrue(oldFieldValueAsString != newValueAsString);

  handleProjectUpdated(event);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    updateField,
    newValueAsString
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
}

/**
 * @param  {string} updateField - The update field on the event. Can be "aspectRatio", "ipfsHash", "scriptType"
 * @param  {string} newValue - The new value for the update to be returned by the mocked function
 * @returns void
 * This function should only be used in "GenArt721CoreV3: handleProjectUpdated" > "updated" > "projectScriptDetailsUpdated"
 * as it assumes that context. We would define the function within that block but closures in assemblyscript are
 * not yet supported (https://www.assemblyscript.org/status.html#on-closures).
 */
export function testProjectScriptDetailsUpdated(
  updateField: string,
  newValue: string
): void {
  const validFieldNames = [
    FIELD_PROJECT_ASPECT_RATIO,
    FIELD_PROJECT_IPFS_HASH,
    FIELD_PROJECT_SCRIPT_TYPE
  ];

  if (!validFieldNames.includes(updateField)) {
    throw new Error("Invalid update field");
  }

  const projectId = BigInt.fromI32(0);
  const fullProjectId = generateContractSpecificId(
    TEST_CONTRACT_ADDRESS,
    projectId
  );
  const project: Project = changetype<Project>(Project.load(fullProjectId));
  let oldFieldValue: string | null = null;
  if (updateField == FIELD_PROJECT_ASPECT_RATIO) {
    oldFieldValue = project.aspectRatio;
  } else if (updateField == FIELD_PROJECT_IPFS_HASH) {
    oldFieldValue = project.ipfsHash;
  } else if (updateField == FIELD_PROJECT_SCRIPT_TYPE) {
    oldFieldValue = project.scriptTypeAndVersion;
  }
  const entityFieldName =
    updateField == FIELD_PROJECT_SCRIPT_TYPE
      ? "scriptTypeAndVersion"
      : updateField;

  const event: ProjectUpdated = changetype<ProjectUpdated>(newMockEvent());
  event.address = TEST_CONTRACT_ADDRESS;
  event.block.timestamp = CURRENT_BLOCK_TIMESTAMP;
  event.parameters = [
    new ethereum.EventParam(
      "_projectId",
      ethereum.Value.fromUnsignedBigInt(projectId)
    ),
    new ethereum.EventParam(
      "_update",
      ethereum.Value.fromBytes(Bytes.fromUTF8(updateField))
    )
  ];

  const projectScriptDetailsCallReturnOverrides = new Map<string, string>();
  projectScriptDetailsCallReturnOverrides.set(entityFieldName, newValue);
  mockProjectScriptDetailsCall(
    projectId,
    projectScriptDetailsCallReturnOverrides
  );

  assert.assertTrue(oldFieldValue != newValue);

  handleProjectUpdated(event);

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    entityFieldName,
    newValue
  );

  assert.fieldEquals(
    PROJECT_ENTITY_TYPE,
    fullProjectId,
    "updatedAt",
    CURRENT_BLOCK_TIMESTAMP.toString()
  );
}
