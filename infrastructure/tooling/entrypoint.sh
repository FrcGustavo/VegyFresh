#!/bin/sh
set -eu
CI=true pnpm install --frozen-lockfile
pnpm --filter @vegyfresh/ui build
exec "$@"
