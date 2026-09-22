#!/usr/bin/env bash
set -eu
url="${1:-http://localhost:3000/api/health}"
for i in $(seq 1 60); do
  if curl -fsS "$url" >/dev/null 2>&1; then
    echo "app is up: $url"
    exit 0
  fi
  sleep 2
done
echo "app did not become healthy at $url"
exit 1
