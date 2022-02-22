# Art Blocks Subgraph

The Art Blocks subgraph definitions for The Graph.

## Initial Setup

If you haven't already connected your Github account to The Graph's account system, please do so by following the [instructions here](https://thegraph.com/docs/en/hosted-service/deploy-subgraph-hosted/). You should ensure that you connect your account and set the appropriate auth-token for Art Blocks using the `graph auth --product hosted-service <ACCESS_TOKEN>` command. Please take care to ensure that you are copy-pasting the auth-token for *Art Blocks* and not for your personal account.

## Subgraph Deployments

### Ropsten

Ropsten subgraph deployments can be performed on any day of the working week, other than Friday, in order to avoid causing an outage on https://artist-staging.artblocks.io going into a weekend, when the team will not be readily available to look into it.

For Ropsten subgraph deployments, we deploy directly to a hosted subgraph service provided by The Graph, which takes ~20 minutes to sync.

### Mainnet

Mainnet subgraph deployments should **only** be done on Wednesdays, barring the need to push out a hotfix to resolve an outage or related breaking issue, in order to avoid adding to the risk of creating an outage on a drop-day.

For mainnet subgraph deployments, we deploy first to the hosted subgraph service provided by The Graph, which takes ~36 hours to sync, and then proceed to deploying to the decentralized Graph network if all is confirmed to be working as intended, which takes an additional ~12 hours to sync.

## Decentralized Graph Network Subgraph Publish Checklist
1. Deploy any contracts to be indexed
    - Please see [ArtBlocks/artblocks-contracts](https://github.com/ArtBlocks/artblocks-contracts) for more info on contract deployment.
2. Update the corresponding `config/` file for the desired network (e.g. `mainnet.json` for mainnet EVM) to include the newly deployed contracts
    - Verify that contract addresses added are for the correct contracts by checking Etherscan at the contract address
3. Run `yarn prepare:{NETWORK}`, (e.g. `yarn prepare:mainnet` for mainnet) to generate subgraph manifest (subgraph.yaml)
4. Manually look over the generated subgraph manifest to make sure it is correct
5. Run `yarn codegen` to generate contract mappings
6. Deploy subgraph to subgraph studio `yarn deploy-studio`
7. Wait for subgraph to sync fully in subgraph studio (~36hrs)
8. Verify that entities/fields expected to be unchanged match the previous deployment
    - Run the subgraph-comparison.ts script in the artblocks monorepo.  When prompted input the url of the new subgraph deployment.
    - The new URL will be 'https://gateway.thegraph.com/api/[api key]/deployments/id/[new deployment id]'. The new deployment id can be found on the Graph Explorer overview page for our subgraph (https://thegraph.com/explorer/subgraph?id=0x3c3cab03c83e48e2e773ef5fc86f52ad2b15a5b0-0&view=Overview). Make sure to select the new version.
    - <img width="446" alt="deployment id" src="https://user-images.githubusercontent.com/1716299/144694801-2f9f3708-0b6f-4101-83fa-0997a3d876a0.png">

9. Make sure Hasura `ARTBLOCKS_SUBGRAPH_URL` environment variable is pointing to the previous deployment url. If it is pointed to the subgraph id url, things will break because no indexers will have picked up the updated subgraph but the subgraph id url will point to it anyway
10. Wait for the published subgraph to sync (~12hrs)
11. Update the Hasura `ARTBLOCKS_SUBGRAPH_URL` environment variable to be the new subgraph deployment url (`https://gateway.thegraph.com/api/<API KEY>/deployments/id/<DEPLOYMENT ID>`)
12. Verify that the frontend is working as expected
13. If the newly published changes include indexing any new contracts run the sync-from.ts script in the artblocks repo. When prompted enter the list of added contract addresses separated by spaces and the unix timestamp from which to sync from (use the time the earliest deployed contract was deployed).

## Hosted Subgraph Publish Checklist
>slightly less involved than publishing to the decentralized graph network

1. Deploy any contracts to be indexed
    - Please see [ArtBlocks/artblocks-contracts](https://github.com/ArtBlocks/artblocks-contracts) for more info on contract deployment.
2. Update the corresponding `config/` file for the desired network (e.g. `mainnet.json` for mainnet EVM) to include the newly deployed contracts
    - Verify that contract addresses added are for the correct contracts by checking Etherscan at the contract address
3. Run `yarn prepare:{NETWORK}`, (e.g. `yarn prepare:mainnet` for mainnet) to generate subgraph manifest (subgraph.yaml)
4. Manually look over the generated subgraph manifest to make sure it is correct
5. Run `yarn codegen` to generate contract mappings
6. Deploy subgraph to The Graph's hosted service `yarn deploy:{NETWORK}-hosted` (e.g. `yarn deploy:mainnet-hosted`)
  - 6A. If you are deploying `mainnet-hosted`, don't forget to also prepare and deploy `mainnet-with-secondary-hosted` to keep those subgraphs in sync
