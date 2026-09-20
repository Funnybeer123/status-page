#!/bin/sh
set -eu
mkdir -p "${MEDIA_ROOT:-/app/data/media}"

i=0
until npx prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 20 ]; then
    echo "Postgres was not reachable after 20 attempts."
    exit 1
  fi
  echo "Waiting for Postgres..."
  sleep 2
done

npx prisma db seed
exec npx next start --hostname 0.0.0.0 --port 3000
