## Supplemental ABIs

These ABIs are intended to represent two types of ABIs not included in the latest @artblocks/artblocks-contracts release:

- legacy ABIs for contracts that are included in the subgraph, but are no longer in the @artblocks/artblocks-contracts repo
- ABIs for new contracts that are not yet included in the @artblocks/artblocks-contracts package

The ABIs in this directory will overwrite the ABIs in the @artblocks/artblocks-contracts repo when the subgraph is built.

Once ABIs for new contracts are included in the @artblocks/artblocks-contracts package, they should be removed from this directory, and the ABI should instead be included in the `../abis/_include-artblocks-abis.txt` file.
