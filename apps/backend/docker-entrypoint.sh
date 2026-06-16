#!/bin/sh
set -e

if [ "$1" = "migrations:run" ]; then
  shift
  exec npm run migrations:run:prod -- "$@"
fi

exec "$@"
