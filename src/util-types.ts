import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";

export class MinterConfigSetAddressEvent extends ethereum.Event {
  get params(): MinterConfigSetAddressEvent__Params {
    return new MinterConfigSetAddressEvent__Params(this);
  }
}

class MinterConfigSetAddressEvent__Params {
  _event: MinterConfigSetAddressEvent;

  constructor(event: MinterConfigSetAddressEvent) {
    this._event = event;
  }

  get _key(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _value(): Address {
    return this._event.parameters[1].value.toAddress();
  }
}
