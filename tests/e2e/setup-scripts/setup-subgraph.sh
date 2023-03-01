#!/bin/sh
yarn;
yarn generate:generics;
cp ./shared/test-config.json ./config/local.json;
yarn prepare:local;
yarn graph create --node $GRAPH_NODE artblocks/art-blocks;
yarn graph deploy --node $GRAPH_NODE --ipfs $IPFS artblocks/art-blocks --version-label=latest;
# We check for the presence of this file in a healthcheck that
# is used by a dependent service (runner) to determine when the
# subgraph has been deployed.
touch ./shared/subgraph-complete;
# This is a hack to keep the container running so that the
# the docker compose exit-code-from command can be used to
# exit with the exit code of the test runner container.
tail -f /dev/null;