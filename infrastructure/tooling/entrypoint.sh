#!/bin/sh
set -eu
for unit in packages/ui clients/api-client services/backend apps/frontend apps/portal apps/docs jobs/seed-api; do
  (cd "/repo/$unit" && CI=true pnpm install --frozen-lockfile)
done
(cd /repo/packages/ui && pnpm run build)
exec "$@"
