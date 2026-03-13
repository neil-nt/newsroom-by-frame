#!/bin/sh
# Run migrations and seed if database doesn't exist
if [ ! -f ./dev.db ]; then
  echo "No database found, running migrations and seed..."
  npx prisma migrate deploy
  npx prisma db seed
fi
npm run start
