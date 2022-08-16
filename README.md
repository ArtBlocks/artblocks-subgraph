# Art Blocks Subgraph

The Art Blocks subgraph definitions for The Graph.

## Initial Setup

If you haven't already connected your Github account to The Graph's account system, please do so by following the [instructions here](https://thegraph.com/docs/en/hosted-service/deploy-subgraph-hosted/). You should ensure that you connect your account _and_ set the appropriate auth-token for Art Blocks using the `graph auth --product hosted-service <ACCESS_TOKEN>` command.

<img width="1433" alt="Screen Shot 2022-02-22 at 1 01 20 PM" src="https://user-images.githubusercontent.com/8602661/155210396-e211b2a8-d386-4a49-96ce-8bb66c2ac07f.png">

Please take care to ensure that you are copy-pasting the auth-token for *Art Blocks* and not for your personal account.

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
6. Deploy subgraph to subgraph studio `yarn deploy:studio`
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

## Testing

To run unit tests using [Matchstick](https://thegraph.com/docs/en/developer/matchstick) (Graph protocol's recommended testing framework), simply run `yarn test`.

**Testing pattern:** unit tests in a `.test.ts` file will mock a Solidity call or event using newMockCal(). Additional mocks are needed for any Solidity function calls (say, contract.projectDetails()). Next, make a call to a handler in a `mapping.ts` file to create/edit/delete a GraphQL entity in a local in-memory store. Finally, `assert()` against the entity to confirm your logic ran as expected.

Logging utils can be imported from matchstick-as and used to:
1. Print all GraphQL entities currently saved in the local store (`logStore()`)
2. Print from a given line and print a stored val (`log.info("user_message"{}’, [user_val.toString()])`)
    Note: 
        - the array is required as a second argument with or without a value to print.
        - Curly braces after the logged messages are only required to interpolate a printed var.
        - Multiple vars can be printed like so: (`log.info("testing..."{}{}{}’, [val1.toString(), val2.toString(), val3.toString()])`)

To write to & read from the in-memory data store, use .save() and .load(). You can delete and re-build the store between tests using clearStore().

`derivedFrom` GraphQL entity fields cannot be tested by Matchstick (v0.2.2). These are added at query time.

**Matchstick error handling "gotcha's" -**
    - Test assertions can still "pass" with a green checkmark... with broken logic in your code (without creating & asserting against a GraphQL entity, for example). To fix, write assertions that will fail first with an incorrect value --> then once your mocks & setup are correct, update your assert. value to pass to confirm your call handler is covered. You can also use logStore() to confirm your entity was created/modified successfuly
    - Type conversion is a MUST, especially when mocking the Solidity call inputValues. Matchstick won't always flag a type mismatch. Instead, the test might pass, or break with no verbose error message. You may want to set logging breakpoints throughout your test to see which are missed by the unit test breaking. Try logging your inputValues in your mapping file to confirm the type conversion was successful- if not, your log message will print but your val will be missing.
## Hosted Subgraph Publish Checklist
>slightly less involved than publishing to the decentralized graph network

1. Deploy any contracts to be indexed
    - Please see [ArtBlocks/artblocks-contracts](https://github.com/ArtBlocks/artblocks-contracts) for more info on contract deployment.
2. Update the corresponding `config/` file for the desired network (e.g. `mainnet.json` for mainnet EVM) to include the newly deployed contracts
    - Verify that contract addresses added are for the correct contracts by checking Etherscan at the contract address
3. Run `yarn prepare:{NETWORK}`, (e.g. `yarn prepare:mainnet` for mainnet) to generate subgraph manifest (subgraph.yaml)
4. Manually look over the generated subgraph manifest to make sure it is correct
  - [Grafting](https://thegraph.com/docs/en/developer/create-subgraph-hosted/#grafting-onto-existing-subgraphs_) is possible on hosted subgraphs. If using this functionality, the following information must be manually added near the top of the generated `subgraph.yaml` file:
    - ```
      features:
        - grafting
      graft:
        base: Qm... # Subgraph ID of base subgraph
        block: 7345624 # Block number
      ```
      > :warning: Any manually added grafting information will be overwritten if scripts re-call `yarn prepare:{network}`, so be aware of any scripts being used in `package.json`
    - Grafting on the decentralized network is not recommended at this time because it requires that the Indexer has indexed the base subgraph.
5. Run `yarn codegen` to generate contract mappings
6. Deploy subgraph to The Graph's hosted service `yarn deploy:{NETWORK}-hosted` (e.g. `yarn deploy:mainnet-hosted`)
  - 6A. If you are deploying `mainnet-hosted`, don't forget to also prepare and deploy `mainnet-with-secondary-hosted` to keep those subgraphs in sync

## Adding New Minters Checklist
The following typical steps should be followed when adding new minters to Art Blocks flagship MinterSuite.
> In general, the process should be completed on testnet entirely before deploying on mainnet
1. Deploy new minter contracts (testnet, mainnet, etc).
2. (any order, with the caveat that if the existing subgraph deployment cannot handle the new minters, blockchain transactions should be performed AFTER the new subgraph syncs)
   - Deploy subgraph that indexes and handles the new minters, and wait for new subgraph to sync
   - Admin submits transactions to allowlist the new minter contracts on MinterFilter
3. Observe the new minter options on the frontend, ensure no subgraph errors
