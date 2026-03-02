#!/bin/sh
set -e

echo "Running database migrations..."
yarn migration:run

echo "Starting application..."
exec node dist/src/main.js
