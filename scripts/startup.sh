#!/bin/bash

echo "=== Running database schema push (timeout 15s) ==="
timeout 15 npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "=== Schema push failed or timed out (non-fatal) ==="

echo "=== Starting Next.js ==="
exec npm run start
