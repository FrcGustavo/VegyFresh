#!/bin/sh
set -eu
for unit in clients/api-client services/backend apps/frontend apps/portal jobs/seed-api; do
  (cd "/repo/$unit" && CI=true pnpm install --frozen-lockfile)
done
exec "$@"
