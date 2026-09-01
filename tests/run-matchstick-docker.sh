#!/bin/bash
#
# Run the matchstick unit tests in Docker.
#
# `graph test` picks a native matchstick binary based on the host CPU, but
# graph-cli 0.56.0 gates Apple Silicon on /Apple (M1|M2|processor)/ — anything
# newer (M3, M4, ...) falls through to "Unsupported platform: Darwin arm64".
# Running in the container sidesteps host detection entirely.
#
# `graph test -d` would do this too, but it invokes `docker run -it`, which
# fails with "the input device is not a TTY" from any non-interactive shell
# (CI, a script, an agent). This runs the same image without the TTY flag.
#
# Pass matchstick args through ARGS, e.g.:
#   ARGS="-r" yarn test:docker
set -euo pipefail

DOCKERFILE="tests/subgraph/.docker/Dockerfile"
IMAGE="matchstick"

if [ ! -f "$DOCKERFILE" ]; then
  echo "ERROR: $DOCKERFILE not found (run from the repo root)." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: the Docker daemon is not running." >&2
  exit 1
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "[INFO] Building the $IMAGE image (first run only)..."
  docker build -f "$DOCKERFILE" -t "$IMAGE" .
fi

# @dev the image is linux/x86_64 and runs under emulation on Apple Silicon. A
# cold run takes ~15 minutes; once the AssemblyScript build cache is warm it is
# about a minute.
exec docker run --rm \
  --mount "type=bind,source=$(pwd),target=/matchstick" \
  ${ARGS:+-e ARGS="$ARGS"} \
  "$IMAGE"
