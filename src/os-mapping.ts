import { BigInt } from "@graphprotocol/graph-ts";

import {
    OrdersMatched
} from "../generated/WyvernExchange/WyvernExchange";

import { OSSaleWrapper, Project } from "../generated/schema";

// Handle orders matched events from OpenSea SC
// When this event is raised, terminate to build the associated
// OSSaleWrapper by setting its price and updating each projects
// involved in the sale
export function handleOrdersMatched(event: OrdersMatched): void {
    let txHash = event.transaction.hash.toHexString();

    let saleWrapper = OSSaleWrapper.load(txHash);
    if (saleWrapper != null) {

        // Count the number of sales for each project
        let associatedProjectsIds = saleWrapper.associatedProjectsIds!; // This field can't be null here
        let uniqueProjectsIds: string[] = [];
        let nbSalePerUniqueProjectId: BigInt[] = [];
        for (let i = 0; i < associatedProjectsIds.length; i++) {
            let projectId = associatedProjectsIds[i];
            let index = _linearFindIndex(uniqueProjectsIds, projectId);
            if (index == -1) {
                uniqueProjectsIds.push(projectId);
                nbSalePerUniqueProjectId.push(BigInt.fromI32(1));
            } else {
                nbSalePerUniqueProjectId[index] = nbSalePerUniqueProjectId[index].plus(BigInt.fromI32(1));
            }
        }

        // Now loop through each unique project in the bundle (if it is) to split the total price
        let nbTransfersInSale = BigInt.fromI32(associatedProjectsIds.length);
        for (let i = 0; i < uniqueProjectsIds.length; i++) {
            let uniqueProjectId = uniqueProjectsIds[i];
            let nbSaleForThisProject = nbSalePerUniqueProjectId[i];

            let project = Project.load(uniqueProjectId);

            // Should always be the case
            if (project != null) {
                let totalVolume = project.osTotalVolumeInWei;
                let pricePart = event.params.price.times(nbSaleForThisProject).div(nbTransfersInSale);
                project.osTotalVolumeInWei = totalVolume.plus(pricePart);
                project.save();
            }
        }

        saleWrapper.priceInWei = event.params.price;
        saleWrapper.associatedProjectsIds = null; // Reset this field to null for performance reason
        saleWrapper.save();
    }
}

// Utility method to find index of a string in an array
function _linearFindIndex(array: Array<string>, needle: string): i32 {
    for (let i = 0; i < array.length; i++) {
        if (array[i] == needle) {
            return i;
        }
    }

    return -1;
}