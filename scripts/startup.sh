#!/bin/bash

echo "=== Running database migration (timeout 30s) ==="
# Try migrate deploy first (safe, preserves data)
timeout 30 npx prisma migrate deploy 2>&1 || {
  echo "=== migrate deploy failed, falling back to db push (with data loss warning) ==="
  timeout 15 npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "=== Schema push also failed (non-fatal) ==="
}

echo "=== Starting Next.js ==="
exec npm run start
