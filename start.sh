#!/bin/sh
# Use the bundled database (copied from repo during Docker build)
# Run migrations to ensure schema is up to date
npx prisma migrate deploy 2>/dev/null || true
npm run start
