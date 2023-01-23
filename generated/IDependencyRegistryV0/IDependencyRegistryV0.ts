// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class DependencyAdded extends ethereum.Event {
  get params(): DependencyAdded__Params {
    return new DependencyAdded__Params(this);
  }
}

export class DependencyAdded__Params {
  _event: DependencyAdded;

  constructor(event: DependencyAdded) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _preferredCDN(): string {
    return this._event.parameters[1].value.toString();
  }

  get _preferredRepository(): string {
    return this._event.parameters[2].value.toString();
  }

  get _referenceWebsite(): string {
    return this._event.parameters[3].value.toString();
  }
}

export class DependencyAdditionalCDNRemoved extends ethereum.Event {
  get params(): DependencyAdditionalCDNRemoved__Params {
    return new DependencyAdditionalCDNRemoved__Params(this);
  }
}

export class DependencyAdditionalCDNRemoved__Params {
  _event: DependencyAdditionalCDNRemoved;

  constructor(event: DependencyAdditionalCDNRemoved) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _additionalCDNIndex(): BigInt {
    return this._event.parameters[1].value.toBigInt();
  }
}

export class DependencyAdditionalCDNUpdated extends ethereum.Event {
  get params(): DependencyAdditionalCDNUpdated__Params {
    return new DependencyAdditionalCDNUpdated__Params(this);
  }
}

export class DependencyAdditionalCDNUpdated__Params {
  _event: DependencyAdditionalCDNUpdated;

  constructor(event: DependencyAdditionalCDNUpdated) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _additionalCDN(): string {
    return this._event.parameters[1].value.toString();
  }

  get _additionalCDNIndex(): BigInt {
    return this._event.parameters[2].value.toBigInt();
  }
}

export class DependencyAdditionalRepositoryRemoved extends ethereum.Event {
  get params(): DependencyAdditionalRepositoryRemoved__Params {
    return new DependencyAdditionalRepositoryRemoved__Params(this);
  }
}

export class DependencyAdditionalRepositoryRemoved__Params {
  _event: DependencyAdditionalRepositoryRemoved;

  constructor(event: DependencyAdditionalRepositoryRemoved) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _additionalRepositoryIndex(): BigInt {
    return this._event.parameters[1].value.toBigInt();
  }
}

export class DependencyAdditionalRepositoryUpdated extends ethereum.Event {
  get params(): DependencyAdditionalRepositoryUpdated__Params {
    return new DependencyAdditionalRepositoryUpdated__Params(this);
  }
}

export class DependencyAdditionalRepositoryUpdated__Params {
  _event: DependencyAdditionalRepositoryUpdated;

  constructor(event: DependencyAdditionalRepositoryUpdated) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _additionalRepository(): string {
    return this._event.parameters[1].value.toString();
  }

  get _additionalRepositoryIndex(): BigInt {
    return this._event.parameters[2].value.toBigInt();
  }
}

export class DependencyPreferredCDNUpdated extends ethereum.Event {
  get params(): DependencyPreferredCDNUpdated__Params {
    return new DependencyPreferredCDNUpdated__Params(this);
  }
}

export class DependencyPreferredCDNUpdated__Params {
  _event: DependencyPreferredCDNUpdated;

  constructor(event: DependencyPreferredCDNUpdated) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _preferredCDN(): string {
    return this._event.parameters[1].value.toString();
  }
}

export class DependencyPreferredRepositoryUpdated extends ethereum.Event {
  get params(): DependencyPreferredRepositoryUpdated__Params {
    return new DependencyPreferredRepositoryUpdated__Params(this);
  }
}

export class DependencyPreferredRepositoryUpdated__Params {
  _event: DependencyPreferredRepositoryUpdated;

  constructor(event: DependencyPreferredRepositoryUpdated) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _preferredRepository(): string {
    return this._event.parameters[1].value.toString();
  }
}

export class DependencyReferenceWebsiteUpdated extends ethereum.Event {
  get params(): DependencyReferenceWebsiteUpdated__Params {
    return new DependencyReferenceWebsiteUpdated__Params(this);
  }
}

export class DependencyReferenceWebsiteUpdated__Params {
  _event: DependencyReferenceWebsiteUpdated;

  constructor(event: DependencyReferenceWebsiteUpdated) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _referenceWebsite(): string {
    return this._event.parameters[1].value.toString();
  }
}

export class DependencyRemoved extends ethereum.Event {
  get params(): DependencyRemoved__Params {
    return new DependencyRemoved__Params(this);
  }
}

export class DependencyRemoved__Params {
  _event: DependencyRemoved;

  constructor(event: DependencyRemoved) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }
}

export class DependencyScriptUpdated extends ethereum.Event {
  get params(): DependencyScriptUpdated__Params {
    return new DependencyScriptUpdated__Params(this);
  }
}

export class DependencyScriptUpdated__Params {
  _event: DependencyScriptUpdated;

  constructor(event: DependencyScriptUpdated) {
    this._event = event;
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }
}

export class ProjectDependencyTypeOverrideAdded extends ethereum.Event {
  get params(): ProjectDependencyTypeOverrideAdded__Params {
    return new ProjectDependencyTypeOverrideAdded__Params(this);
  }
}

export class ProjectDependencyTypeOverrideAdded__Params {
  _event: ProjectDependencyTypeOverrideAdded;

  constructor(event: ProjectDependencyTypeOverrideAdded) {
    this._event = event;
  }

  get _coreContractAddress(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _projectId(): BigInt {
    return this._event.parameters[1].value.toBigInt();
  }

  get _dependencyType(): Bytes {
    return this._event.parameters[2].value.toBytes();
  }
}

export class ProjectDependencyTypeOverrideRemoved extends ethereum.Event {
  get params(): ProjectDependencyTypeOverrideRemoved__Params {
    return new ProjectDependencyTypeOverrideRemoved__Params(this);
  }
}

export class ProjectDependencyTypeOverrideRemoved__Params {
  _event: ProjectDependencyTypeOverrideRemoved;

  constructor(event: ProjectDependencyTypeOverrideRemoved) {
    this._event = event;
  }

  get _coreContractAddress(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _projectId(): BigInt {
    return this._event.parameters[1].value.toBigInt();
  }
}

export class SupportedCoreContractAdded extends ethereum.Event {
  get params(): SupportedCoreContractAdded__Params {
    return new SupportedCoreContractAdded__Params(this);
  }
}

export class SupportedCoreContractAdded__Params {
  _event: SupportedCoreContractAdded;

  constructor(event: SupportedCoreContractAdded) {
    this._event = event;
  }

  get _coreContractAddress(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class SupportedCoreContractRemoved extends ethereum.Event {
  get params(): SupportedCoreContractRemoved__Params {
    return new SupportedCoreContractRemoved__Params(this);
  }
}

export class SupportedCoreContractRemoved__Params {
  _event: SupportedCoreContractRemoved;

  constructor(event: SupportedCoreContractRemoved) {
    this._event = event;
  }

  get _coreContractAddress(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class IDependencyRegistryV0 extends ethereum.SmartContract {
  static bind(address: Address): IDependencyRegistryV0 {
    return new IDependencyRegistryV0("IDependencyRegistryV0", address);
  }

  getDependencyScriptAtIndex(_dependencyType: Bytes, _index: BigInt): string {
    let result = super.call(
      "getDependencyScriptAtIndex",
      "getDependencyScriptAtIndex(bytes32,uint256):(string)",
      [
        ethereum.Value.fromFixedBytes(_dependencyType),
        ethereum.Value.fromUnsignedBigInt(_index)
      ]
    );

    return result[0].toString();
  }

  try_getDependencyScriptAtIndex(
    _dependencyType: Bytes,
    _index: BigInt
  ): ethereum.CallResult<string> {
    let result = super.tryCall(
      "getDependencyScriptAtIndex",
      "getDependencyScriptAtIndex(bytes32,uint256):(string)",
      [
        ethereum.Value.fromFixedBytes(_dependencyType),
        ethereum.Value.fromUnsignedBigInt(_index)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toString());
  }

  getDependencyScriptBytecodeAddressAtIndex(
    _dependencyType: Bytes,
    _index: BigInt
  ): Address {
    let result = super.call(
      "getDependencyScriptBytecodeAddressAtIndex",
      "getDependencyScriptBytecodeAddressAtIndex(bytes32,uint256):(address)",
      [
        ethereum.Value.fromFixedBytes(_dependencyType),
        ethereum.Value.fromUnsignedBigInt(_index)
      ]
    );

    return result[0].toAddress();
  }

  try_getDependencyScriptBytecodeAddressAtIndex(
    _dependencyType: Bytes,
    _index: BigInt
  ): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "getDependencyScriptBytecodeAddressAtIndex",
      "getDependencyScriptBytecodeAddressAtIndex(bytes32,uint256):(address)",
      [
        ethereum.Value.fromFixedBytes(_dependencyType),
        ethereum.Value.fromUnsignedBigInt(_index)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  getDependencyScriptCount(_dependencyType: Bytes): BigInt {
    let result = super.call(
      "getDependencyScriptCount",
      "getDependencyScriptCount(bytes32):(uint256)",
      [ethereum.Value.fromFixedBytes(_dependencyType)]
    );

    return result[0].toBigInt();
  }

  try_getDependencyScriptCount(
    _dependencyType: Bytes
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "getDependencyScriptCount",
      "getDependencyScriptCount(bytes32):(uint256)",
      [ethereum.Value.fromFixedBytes(_dependencyType)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }
}
