#!/bin/sh
set -e

echo "[docker-entrypoint] Running database migration..."
cd /app
npx prisma db push --skip-generate 2>/dev/null || echo "[docker-entrypoint] db push skipped (DB may already exist)"

echo "[docker-entrypoint] Starting Next.js server..."
exec node server.js
