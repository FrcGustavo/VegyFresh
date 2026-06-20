#!/bin/sh
set -eu

API_URL="${API_URL:-${VITE_API_URL:-}}"

if [ -z "$API_URL" ]; then
  echo "API_URL is required at container runtime" >&2
  exit 1
fi

export API_URL
envsubst '${API_URL}' \
  < /etc/vegyfresh/runtime-config.template.js \
  > /usr/share/nginx/html/config.js
