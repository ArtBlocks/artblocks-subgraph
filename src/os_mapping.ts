import {
    OrdersMatched
} from "../generated/WyvernExchange/WyvernExchange";

import { OSSaleWrapper } from "../generated/schema";

// Handle orders matched events from OpenSea SC
// When this event is raised, terminate to build the associated
// OSSaleWrapper by setting its price
export function handleOrdersMatched(event: OrdersMatched): void {
    let txHash = event.transaction.hash.toHexString();

    let saleWrapper = OSSaleWrapper.load(txHash);
    if (saleWrapper != null) {
        saleWrapper.priceInWei = event.params.price;
        saleWrapper.save();
    }
}