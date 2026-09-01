#!/bin/bash
set -euo pipefail

# Source of Art Blocks contract artifacts. Defaults to the published npm
# package. Override to develop against unreleased contracts:
#
#   ARTBLOCKS_CONTRACTS_ARTIFACTS=../../artblocks-contracts/packages/contracts/artifacts/contracts \
#     yarn generate:abis
#
# Generated ABIs are gitignored, so an override never leaks into a commit. What
# does need to change before merging is the `@artblocks/contracts` version in
# package.json: CI and every other developer regenerate from whatever that pins,
# so mappings written against unreleased ABIs will not build until it is bumped.
ARTIFACTS_DIR="${ARTBLOCKS_CONTRACTS_ARTIFACTS:-../node_modules/@artblocks/contracts/artifacts/contracts}"

if [ ! -d "$ARTIFACTS_DIR" ]; then
  echo "ERROR: artifacts directory not found: $ARTIFACTS_DIR" >&2
  echo "       Run \`yarn\` to install @artblocks/contracts, or set" >&2
  echo "       ARTBLOCKS_CONTRACTS_ARTIFACTS to a local build." >&2
  exit 1
fi
if [ -n "${ARTBLOCKS_CONTRACTS_ARTIFACTS:-}" ]; then
  echo "[WARN] Using local artifacts, NOT the published package:"
  echo "[WARN]   $ARTIFACTS_DIR"
  echo "[WARN] Regenerate from the published package before merging."
fi

# clear existing ABIs
rm -f ./*.json
# import ABIs from the artblocks contract artifacts
# @dev some names in the include list are intentionally absent here and are
# satisfied below from abis-supplemental (pre-V3 cores) or from OpenZeppelin
# (Ownable, OwnableUpgradeable), so a miss is not an error on its own
while IFS="" read -r contractName || [ -n "$contractName" ]
do
  [ -z "$contractName" ] && continue
  find "$ARTIFACTS_DIR" -regex ".*/$contractName.json" | xargs -I {} cp {} .
done < _include-artblocks-abis.txt
# import additional abis from supplemental ABIs directory
cp ../abis-supplemental/*.json .
# import required openzeppelin ABIs
cp ../node_modules/@openzeppelin-4.7/contracts/build/contracts/Ownable.json .
cp ../node_modules/@openzeppelin-4.8/contracts-upgradeable/build/contracts/OwnableUpgradeable.json .

# every name in the include list must now be present, whatever supplied it.
# Checking the outcome rather than the source catches a wrong ARTIFACTS_DIR,
# which would otherwise leave the directory quietly missing ABIs and surface as
# a confusing `graph codegen` failure much later.
missing=0
while IFS="" read -r contractName || [ -n "$contractName" ]
do
  [ -z "$contractName" ] && continue
  if [ ! -f "./$contractName.json" ]; then
    echo "ERROR: no ABI generated for '$contractName'" >&2
    missing=1
  fi
done < _include-artblocks-abis.txt
if [ "$missing" -ne 0 ]; then
  echo "ERROR: ABI generation incomplete; check $ARTIFACTS_DIR" >&2
  exit 1
fi
