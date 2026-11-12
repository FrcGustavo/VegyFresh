#!/bin/sh
# Run from any directory: apps/backend/test/integration/run-external-identity.sh
# Set CHECK_BACKEND=1 to also run backend lint, type checks, unit tests and build.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/../../../.." && pwd)
name="vegyfresh-identity-$(date +%s)-$$"
network="$name-net"
db="$name-db"
network_created=0
db_created=0
cleanup() {
  if [ "$db_created" = 1 ]; then docker rm -f "$db" >/dev/null 2>&1 || true; fi
  if [ "$network_created" = 1 ]; then docker network rm "$network" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT HUP INT TERM

docker network create "$network" >/dev/null
network_created=1
docker run -d --name "$db" --network "$network" --network-alias identity-db \
  -e POSTGRES_USER=identity_test -e POSTGRES_PASSWORD=identity_test \
  -e POSTGRES_DB=identity_test postgres:16-alpine >/dev/null
db_created=1
attempt=0
until docker exec "$db" pg_isready -U identity_test -d identity_test >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo 'PostgreSQL did not become ready' >&2
    exit 1
  fi
  sleep 1
done

docker run --rm --network "$network" -v "$root:/source:ro" \
  -e IDENTITY_TEST_HOST=identity-db -e CHECK_BACKEND="${CHECK_BACKEND:-0}" \
  node:20-bookworm-slim sh -eu -c '
    mkdir /work
    tar -C /source --exclude=.git --exclude=node_modules --exclude=.env --exclude=".env.*" -cf - . | tar -C /work -xf -
    cd /work
    corepack enable
    corepack prepare pnpm@10.11.0 --activate
    pnpm install --frozen-lockfile
    pnpm --filter backend exec jest --config ./test/jest-e2e.json --runInBand --runTestsByPath test/integration/external-identity.e2e-spec.ts
    if [ "$CHECK_BACKEND" = 1 ]; then
      status=0
      pnpm --filter backend exec npm rebuild bcrypt || status=1
      pnpm --filter backend exec eslint "{src,apps,libs,test,__tests__}/**/*.ts" || status=1
      pnpm --filter backend exec tsc --noEmit --incremental false || status=1
      pnpm --filter backend exec tsc --noEmit --incremental false -p tsconfig.build.json || status=1
      pnpm --filter backend exec jest --runInBand || status=1
      pnpm --filter backend build || status=1
      exit "$status"
    fi
  '
