# Graph Network Subgraph Publish Checklist
1. Deploy any contracts to be indexed
2. Update mainnet.json to include contracts
    - Verify that contract addresses added are for the correct contract by checking Etherscan at the contract address
3. Run `yarn prepare:mainnet` to generate subgraph manifest (subgraph.yaml)
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