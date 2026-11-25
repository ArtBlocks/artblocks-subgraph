## Supplemental ABIs

These ABIs are intended to represent two types of ABIs not included in the latest @artblocks/artblocks-contracts release:

- legacy ABIs for contracts that are included in the subgraph, but are no longer in the @artblocks/artblocks-contracts repo
- ABIs for new contracts that are not yet included in the @artblocks/artblocks-contracts package

The ABIs in this directory will overwrite the ABIs in the @artblocks/artblocks-contracts repo when the subgraph is built.

Once ABIs for new contracts are included in the @artblocks/artblocks-contracts package, they should be removed from this directory, and the ABI should instead be included in the `../abis/_include-artblocks-abis.txt` file.

### IDependencyRegistryV0.json

This file is the `IDependencyRegistryV0` interface from @artblocks/contracts 1.6.0 with the dependency registry's
`DependencyAbxfsFileCidUpdated(bytes32 indexed, bytes32)` event added. It overwrites the package copy so the subgraph can
index that event while every binding the existing handlers use stays unchanged.

Keep it a superset of every registry event and view the handlers use. A later @artblocks/contracts release drops
`DependencyScriptUpdated` and `getDependencyScriptBytecodeAddress` from the interface, but re-indexing history still
needs them, so do not replace this file with the package's interface; add to it instead.
