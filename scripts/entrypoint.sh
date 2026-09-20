#!/bin/sh
set -eu
mkdir -p "${MEDIA_ROOT:-/app/data/media}"
npx prisma migrate deploy
npx prisma db seed
exec npx next start --hostname 0.0.0.0 --port 3000
