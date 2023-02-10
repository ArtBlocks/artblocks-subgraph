#!/bin/sh
yarn;
yarn generate:generics;
cp ./shared/testConfig.json ./config/local.json;
yarn prepare:local;
yarn graph create --node $GRAPH_NODE artblocks/art-blocks;
yarn graph deploy --node $GRAPH_NODE --ipfs $IPFS artblocks/art-blocks --version-label=latest;