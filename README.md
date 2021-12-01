# Art Blocks Subgraph

The Art Blocks subgraph definitions for The Graph.

## Subgraph Deployments

### Ropsten

Ropsten subgraph deployments can be performed on any day of the working week, other than Friday, in order to avoid causing an outage on https://artist-staging.artblocks.io going into a weekend, when the team will not be readily available to look into it.

For Ropsten subgraph deployments, we deploy directly to a hosted subgraph service provided by The Graph, which takes ~20 minutes to sync.

### Mainnet

Mainnet subgraph deployments should **only** be done on Wednesdays, barring the need to push out a hotfix to resolve an outage or related breaking issue, in order to avoid adding to the risk of creating an outage on a drop-day.

For mainnet subgraph deployments, we deploy first to the hosted subgraph service provided by The Graph, which takes ~36 hours to sync, and then proceed to deploying to the decentralized Graph network if all is confirmed to be working as intended, which takes an additional ~4 hours to sync.

## Graph Network Subgraph Publish Checklist
1. Deploy any contracts to be indexed
    - Please see [ArtBlocks/artblocks-contracts](https://github.com/ArtBlocks/artblocks-contracts) for more info on contract deployment.
2. Update the corresponding `config/` file for the desired network (e.g. `mainnet.json` for mainnet EVM) to include the newly deployed contracts
    - Verify that contract addresses added are for the correct contracts by checking Etherscan at the contract address
3. Run `yarn prepare:{NETWORK}`, (e.g. `yarn prepare:mainnet` for mainnet) to generate subgraph manifest (subgraph.yaml)
4. Manually look over the generated subgraph manifest to make sure it is correct
5. Run `yarn codegen` to generate contract mappings
6. Deploy subgraph to subgraph studio `yarn deploy-studio`
7. Wait for subgraph to sync fully in subgraph studio (~48hrs)
8. Verify that entities/fields expected to be unchanged match the previous deployment
    - A script should be written to do this comparison
    - Once we have a mainnet dev pipeline fully in place, we should verify expected behavior on the mainnet dev frontend
9. Make sure Hasura `ARTBLOCKS_SUBGRAPH_URL` environment variable is pointing to the previous deployment url. If it is pointed to the subgraph id url, things will break because no indexers will have picked up the updated subgraph but the subgraph id url will point to it anyway
10. Wait for the published subgraph to sync (~6hrs)
11. Update the Hasura `ARTBLOCKS_SUBGRAPH_URL` environment variable to be the new subgraph deployment url (`https://gateway.thegraph.com/api/<API KEY>/deployments/id/<DEPLOYMENT ID>`)
12. Verify that the frontend is working as expected
