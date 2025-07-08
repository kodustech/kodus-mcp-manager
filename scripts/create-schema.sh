#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Get database credentials from environment variables
DB_HOST=${API_PG_DB_HOST:-localhost}
DB_PORT=${API_PG_DB_PORT:-5432}
DB_USER=${API_PG_DB_USERNAME:-postgres}
DB_PASS=${API_PG_DB_PASSWORD:-}
DB_NAME=${API_PG_DB_DATABASE:-kodus_mcp_manager}
SCHEMA_NAME=${API_MCP_MANAGER_PG_DB_SCHEMA:-mcp-manager}

echo "Creating schema '$SCHEMA_NAME' in database '$DB_NAME'..."

# Create schema using the database container directly
docker exec -i db_postgres psql -U $DB_USER -d $DB_NAME -c "CREATE SCHEMA IF NOT EXISTS \"$SCHEMA_NAME\";"

if [ $? -eq 0 ]; then
    echo "✅ Schema '$SCHEMA_NAME' created successfully!"
else
    echo "❌ Failed to create schema '$SCHEMA_NAME'"
    exit 1
fi
