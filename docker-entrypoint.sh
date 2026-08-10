#!/bin/sh
set -eu
npx prisma migrate deploy
node prisma/seed.mjs
exec node server.js
