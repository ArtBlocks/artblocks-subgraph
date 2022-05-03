import {
    Address,
    BigInt,
    Bytes,
    ethereum,
    log,
} from "@graphprotocol/graph-ts";

import { WyvernExchange } from "../../../generated/WyvernExchange/WyvernExchange";

import { WyvernExchangeWithBulkCancellations } from "../../../generated/WyvernExchangeWithBulkCancellations/WyvernExchangeWithBulkCancellations";

import { ERC155_SAFE_TRANSFER_FROM_SELECTOR, ERC721_SAFE_TRANSFER_FROM_SELECTOR, NULL_ADDRESS, TRANSFER_FROM_SELECTOR, WYVERN_EXCHANGE_ADDRESS, WYVERN_EXCHANGE_WITH_BULK_CANCELLATIONS_ADDRESS } from "../../constants";

/**
 * @param side See `calculateFinalPrice` of WyvernExchange
 * @param saleKind See `calculateFinalPrice` of WyvernExchange
 * @param basePrice See `calculateFinalPrice` of WyvernExchange
 * @param extra See `calculateFinalPrice` of WyvernExchange
 * @param linstingTime See `calculateFinalPrice` of WyvernExchange
 * @param exprirationTime See `calculateFinalPrice` of WyvernExchange
 * @returns The final price of the given order params. The price is computed from the contract method
 */
function _calculateFinalPrice(
    osVersion: i32,
    side: i32,
    saleKind: i32,
    basePrice: BigInt,
    extra: BigInt,
    linstingTime: BigInt,
    exprirationTime: BigInt
): BigInt {
    if (osVersion == 1) {
        let wyvernExchange = WyvernExchange.bind(
            changetype<Address>(Address.fromHexString(WYVERN_EXCHANGE_ADDRESS))
        );

        return wyvernExchange.calculateFinalPrice(
            side,
            saleKind,
            basePrice,
            extra,
            linstingTime,
            exprirationTime
        );
    } else {
        let wyvernExchangeWithBulkCancellations = WyvernExchangeWithBulkCancellations.bind(
            changetype<Address>(Address.fromHexString(WYVERN_EXCHANGE_WITH_BULK_CANCELLATIONS_ADDRESS))
        );

        return wyvernExchangeWithBulkCancellations.calculateFinalPrice(
            side,
            saleKind,
            basePrice,
            extra,
            linstingTime,
            exprirationTime
        );
    }

}

/**
 * Necessary function because of graph bugs whe calling `calculateMatchPrice_` of WyvernExchange, see: https://github.com/graphprotocol/graph-ts/issues/211
 * @param buySide See `calculateFinalPrice` of WyvernExchange
 * @param buySaleKind See `calculateFinalPrice` of WyvernExchange
 * @param buyBasePrice See `calculateFinalPrice` of WyvernExchange
 * @param buyExtra See `calculateFinalPrice` of WyvernExchange
 * @param buyLinstingTime See `calculateFinalPrice` of WyvernExchange
 * @param buyExprirationTime See `calculateFinalPrice` of WyvernExchange
 * @param sellSide See `calculateFinalPrice` of WyvernExchange
 * @param sellSaleKind See `calculateFinalPrice` of WyvernExchange
 * @param sellBasePrice See `calculateFinalPrice` of WyvernExchange
 * @param sellExtra See `calculateFinalPrice` of WyvernExchange
 * @param sellLinstingTime See `calculateFinalPrice` of WyvernExchange
 * @param sellExprirationTime See `calculateFinalPrice` of WyvernExchange
 * @param sellFeeRecipient See `calculateFinalPrice` of WyvernExchange
 * @returns The match price of the given buy and sell orders
 */
export function calculateMatchPrice(
    osVersion: i32,
    buySide: i32,
    buySaleKind: i32,
    buyBasePrice: BigInt,
    buyExtra: BigInt,
    buyLinstingTime: BigInt,
    buyExprirationTime: BigInt,
    sellSide: i32,
    sellSaleKind: i32,
    sellBasePrice: BigInt,
    sellExtra: BigInt,
    sellLinstingTime: BigInt,
    sellExprirationTime: BigInt,
    sellFeeRecipient: Address
): BigInt {

    let sellPrice = _calculateFinalPrice(
        osVersion,
        sellSide,
        sellSaleKind,
        sellBasePrice,
        sellExtra,
        sellLinstingTime,
        sellExprirationTime
    );

    let buyPrice = _calculateFinalPrice(
        osVersion,
        buySide,
        buySaleKind,
        buyBasePrice,
        buyExtra,
        buyLinstingTime,
        buyExprirationTime
    );

    return sellFeeRecipient.toHexString() != NULL_ADDRESS ? sellPrice : buyPrice;
}

/**
 * Replace bytes in an array with bytes in another array, guarded by a bitmask
 *
 * @param array The original array
 * @param replacement The replacement array
 * @param mask The mask specifying which bits can be changed in the original array
 * @returns The updated byte array
 */
export function guardedArrayReplace(
    array: Bytes,
    replacement: Bytes,
    mask: Bytes
): Bytes {
    // Sometime the replacementPattern is empty, meaning that both arrays (buyCallData and sellCallData) are identicall and
    // no merging is necessary. In such a case randomly return the first array (buyCallData)
    if (mask.length == 0) {
        return array;
    }

    let array_copy = array;

    for (let i = 0; i < array.length; i++) {
        if(mask[i] == 0xff) {
            array_copy[i] = replacement[i];
        }
    }

    return array_copy;
}


/**
 * Return true if the associated sale was private.
 *
 * @param callInputAddrs The original call input addrs array
 * @returns true if the sale was private else false
 */
export function isPrivateSale(msgSender: Address, callInputAddrs: Address[]): boolean {
    /**
     * For a sale to be private 2 conditions must be met:
     *  1. The sell order taker must be hardcoded in the sell order (not NULL_ADDRESS)
     *  2. The msg.sender must be the sell order taker
     */
    let takerOfSellOrder = callInputAddrs[9];
    return takerOfSellOrder.toHexString() != NULL_ADDRESS && msgSender == takerOfSellOrder;
}

/**
 * Parse the call data of a TRANSFER_FROM and return the token ID transfered
 * For ERC1155 TRANSFER_FROM, this method is still compatible since the token_id stays the 3rd parameter in the call data
 * 
 * @param transferFromData The ABI encoded transferFrom method call used by OpenSea Smart contract
 *                 to trigger the Nft transfer between the seller and the buyer
 * @returns The tokenId (string) of the transfer
 */

export function getSingleTokenIdFromTransferFromCallData(
    transferFromData: Bytes
): string {
    let dataWithoutFunctionSelector = changetype<Bytes>(
        transferFromData.subarray(4)
    );

    //Also compatible with erc1155 but not checking last params of it (value, data)
    //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/IERC1155.sol#L99
    //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721.sol#L55
    let decoded = ethereum
        .decode("(address,address,uint256)", dataWithoutFunctionSelector)!
        .toTuple();

    return decoded[2].toBigInt().toString();
}

class DecodeAtomicizerCallDataReturn {
    contractAddresses: Address[];
    callsDataIndividualLengths: i32[];
    callsData: Bytes;

    constructor(contractAddresses: Address[], callsDataIndividualLengths: i32[], callsData: Bytes) {
        this.contractAddresses = contractAddresses;
        this.callsDataIndividualLengths = callsDataIndividualLengths;
        this.callsData = callsData;
    }
}

/**
 * Decode the atomicizer call data and return the list of contract addresses targeted and their call data
 * 
 * @param atomicizerCallData The ABI encoded atomicize method call used by OpenSea Smart library (WyvernAtomicizer)
 *                          to trigger bundle sales (looping over NFT and calling transferFrom for each)
 * @returns a DecodeAtomicizerCallDataReturn object
 */
export function decodeAtomicizerCallData(
    atomicizerCallData: Bytes
): DecodeAtomicizerCallDataReturn {
    let dataWithoutFunctionSelector: Bytes = changetype<Bytes>(
        atomicizerCallData.subarray(4)
    );

    // As function encoding is not handled yet by the lib, we first need to reach the offset of where the
    // actual params are located. As they are all dynamic we can just fetch the offset of the first param
    // and then start decoding params from there as known sized types
    let offset: i32 = ethereum
        .decode("uint256", changetype<Bytes>(dataWithoutFunctionSelector))!
        .toBigInt()
        .toI32();

    // Get the length of the first array. All arrays must have same length so fetching only this one is enough
    let addressesArrayLength: i32 = ethereum
        .decode(
            "uint256",
            changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
        )!
        .toBigInt()
        .toI32();
    offset += 1 * 32;

    // Now that we know the size of each params we can decode them one by one as know sized types
    // function atomicize(address[] addrs,uint256[] values,uint256[] calldataLengths,bytes calldatas)
    let contractAddresses: Address[] = ethereum
        .decode(
            `address[${addressesArrayLength}]`,
            changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
        )!
        .toAddressArray();
    offset += addressesArrayLength * 32;

    offset += 1 * 32;
    // We don't need those values, just move the offset forward
    // let decodedValues: BigInt[] = ethereum.decode(
    //   `uint256[${addressesArrayLength}]`,
    //   changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
    // )!.toBigIntArray();
    offset += addressesArrayLength * 32;

    offset += 1 * 32;
    let callsDataIndividualLengths = ethereum
        .decode(
            `uint256[${addressesArrayLength}]`,
            changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
        )!
        .toBigIntArray()
        .map<i32>(e => e.toI32());
    offset += addressesArrayLength * 32;

    let callsDataLength = ethereum
        .decode(
            "uint256",
            changetype<Bytes>(dataWithoutFunctionSelector.subarray(offset))
        )!
        .toBigInt()
        .toI32();
    offset += 1 * 32;

    let callsData: Bytes = changetype<Bytes>(
        dataWithoutFunctionSelector.subarray(
            offset,
            offset + callsDataLength
        )
    );

    return new DecodeAtomicizerCallDataReturn(
        contractAddresses,
        callsDataIndividualLengths,
        callsData
    );
}


/**
 * @param osVersion: The OpenSea version (used for logging only)
 * @param atomicizerCallData The ABI encoded atomicize method call used by OpenSea Smart library (WyvernAtomicizer)
 *                          to trigger bundle sales (looping over NFT and calling transferFrom for each)
 * @returns An array of 2 cells: [nftContractsAddrs, tokenIds]
 */
export function getNftContractAddressAndTokenIdFromAtomicizerCallData(
    osVersion: i32,
    atomicizerCallData: Bytes
): string[][] {

    let res = decodeAtomicizerCallData(atomicizerCallData);
    let contractAddresses = res.contractAddresses;
    let callsDataIndividualLengths = res.callsDataIndividualLengths;
    let callsData = res.callsData;

    let nftContractsAddrs: string[] = [];
    let tokenIds: string[] = [];

    let calldataOffset = 0;
    for (let i = 0; i < contractAddresses.length; i++) {
        let callDataLength = callsDataIndividualLengths[i];
        let calldata: Bytes = changetype<Bytes>(
            callsData.subarray(calldataOffset, calldataOffset + callDataLength)
        );

        // For OpenSeaV2, only TRANSFER_FROM and SAFE_TRANSFER_FROM should be taken into account
        // when monitorig bundle sales
        let functionSelector: string = changetype<Bytes>(
            calldata.subarray(0, 4)
        ).toHexString();

        if (
            functionSelector == TRANSFER_FROM_SELECTOR ||
            functionSelector == ERC721_SAFE_TRANSFER_FROM_SELECTOR ||
            functionSelector == ERC155_SAFE_TRANSFER_FROM_SELECTOR
        ) {
            nftContractsAddrs.push(contractAddresses[i].toHexString());

            // Opensea V2 still uses the same Atomicizer contract so we can decode the TRANSFER_FROM data in the same way as
            // on OpenSea V1
            tokenIds.push(getSingleTokenIdFromTransferFromCallData(calldata));
        } else {
            log.warning("[OSV{} handler] Skiped bundle transaction, invalid selector: {}", [osVersion.toString(), functionSelector]);
        }

        calldataOffset += callDataLength;
    }

    return [nftContractsAddrs, tokenIds];
}
