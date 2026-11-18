#!/bin/sh
set -eu
for unit in clients/api-client services/backend services/microsip-sync apps/frontend apps/portal jobs/seed-api; do
  (cd "/repo/$unit" && CI=true pnpm install --frozen-lockfile)
done
exec "$@"
