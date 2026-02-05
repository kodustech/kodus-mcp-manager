#!/bin/bash

# List of all keys you need
KEYS=(
    "/prod/kodus-mcp-manager/API_MCP_MANAGER_LOG_LEVEL"
    "/prod/kodus-mcp-manager/API_MCP_MANAGER_PORT"

    "/prod/kodus-mcp-manager/API_MCP_MANAGER_NODE_ENV"
    "/prod/kodus-mcp-manager/API_MCP_MANAGER_DATABASE_ENV"

    "/prod/kodus-mcp-manager/API_MCP_MANAGER_CORS_ORIGINS"
    "/prod/kodus-mcp-manager/API_MCP_MANAGER_JWT_SECRET"

    "/prod/kodus-mcp-manager/API_MCP_MANAGER_COMPOSIO_BASE_URL"
    "/prod/kodus-mcp-manager/API_MCP_MANAGER_COMPOSIO_API_KEY"
    "/prod/kodus-mcp-manager/API_MCP_MANAGER_MCP_PROVIDERS"
    "/prod/kodus-mcp-manager/API_MCP_MANAGER_REDIRECT_URI"

    "/prod/kodus-mcp-manager/API_MCP_MANAGER_PG_DB_SCHEMA"

    "/prod/kodus-mcp-manager/API_MCP_MANAGER_ENCRYPTION_SECRET"
)

# List of all keys you need

ENV_FILE=".env.prod"

# Clear existing .env file or create a new one
>$ENV_FILE

# Fetch each key and add it to the .env file
for KEY in "${KEYS[@]}"; do
    VALUE=$(aws ssm get-parameter --name "$KEY" --with-decryption --query "Parameter.Value" --output text)
    echo "${KEY##*/}=$VALUE" >>$ENV_FILE
done
