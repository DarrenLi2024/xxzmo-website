#!/bin/sh
set -e

echo "[docker-entrypoint] Running database migration..."
cd /app

DB_PATH="/app/prisma/dev.db"
DB_DIR="/app/prisma"

mkdir -p "$DB_DIR"

# Fix: handle bind-mounted SQLite file owned by host user (uid mismatch)
# The volume is mounted at /app/data/ and we symlink dev.db there
if [ -d "/app/data" ]; then
  if [ -f "/app/data/dev.db" ]; then
    echo "[docker-entrypoint] Using persisted DB from /app/data/dev.db"
    ln -sf /app/data/dev.db "$DB_PATH"
  elif [ -f "$DB_PATH" ] && [ -w "$DB_PATH" ]; then
    echo "[docker-entrypoint] Copying existing DB to /app/data/"
    cp "$DB_PATH" /app/data/dev.db
    ln -sf /app/data/dev.db "$DB_PATH"
  fi
elif [ -f "$DB_PATH" ] && [ ! -w "$DB_PATH" ]; then
  echo "[docker-entrypoint] DB not writable (host uid mismatch), attempting chmod..."
  chmod 666 "$DB_PATH" 2>/dev/null || {
    echo "[docker-entrypoint] chmod failed, copying to tmp..."
    cp "$DB_PATH" /tmp/dev.db
    ln -sf /tmp/dev.db "$DB_PATH"
  }
fi

# Ensure WAL mode
sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" 2>/dev/null || true

npx prisma db push --skip-generate 2>/dev/null || echo "[docker-entrypoint] db push skipped"

echo "[docker-entrypoint] Starting Next.js server..."
exec node server.js
