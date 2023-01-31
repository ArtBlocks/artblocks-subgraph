/**
 *
 * @param projectId The projectId id
 * @param tokenId The token id
 * @param saleId The sale id (eth tx hash)
 * @returns The corresponding lookup table id
 */
 export function buildTokenSaleLookupTableId(
    projectId: string,
    tokenId: string,
    saleId: string
): string {
    return projectId + "::" + tokenId + "::" + saleId;
}