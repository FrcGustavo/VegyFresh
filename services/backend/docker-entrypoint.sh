#!/bin/sh
set -e

run_migrations() {
  npm run migrations:run:prod -- "$@"
}

if [ "$1" = "migrations:run" ]; then
  shift
  run_migrations "$@"
  exit 0
fi

validate_migrations_flag() {
  case "$RUN_MIGRATIONS_ON_START" in
    true | false | "")
      ;;
    *)
      echo "RUN_MIGRATIONS_ON_START must be either 'true' or 'false'."
      exit 1
      ;;
  esac
}

validate_migrations_flag

if [ "$RUN_MIGRATIONS_ON_START" = "true" ]; then
  run_migrations
fi

exec "$@"
