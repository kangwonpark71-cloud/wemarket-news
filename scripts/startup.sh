#!/bin/bash

echo "=== Running database schema push ==="
npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "=== Schema push failed (non-fatal) ==="

echo "=== Starting Next.js ==="
exec npm run start
