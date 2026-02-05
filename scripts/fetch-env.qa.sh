#!/bin/bash

# List of all keys you need
KEYS=(
    "/qa/kodus-mcp-manager/API_MCP_MANAGER_LOG_LEVEL"
    "/qa/kodus-mcp-manager/API_MCP_MANAGER_PORT"

    "/qa/kodus-mcp-manager/API_MCP_MANAGER_NODE_ENV"
    "/qa/kodus-mcp-manager/API_MCP_MANAGER_DATABASE_ENV"

    "/qa/kodus-mcp-manager/API_MCP_MANAGER_CORS_ORIGINS"
    "/qa/kodus-mcp-manager/API_MCP_MANAGER_JWT_SECRET"

    "/qa/kodus-mcp-manager/API_MCP_MANAGER_COMPOSIO_BASE_URL"
    "/qa/kodus-mcp-manager/API_MCP_MANAGER_COMPOSIO_API_KEY"
    "/qa/kodus-mcp-manager/API_MCP_MANAGER_MCP_PROVIDERS"
    "/qa/kodus-mcp-manager/API_MCP_MANAGER_REDIRECT_URI"

    "/qa/kodus-mcp-manager/API_MCP_MANAGER_PG_DB_SCHEMA"

    "/qa/kodus-mcp-manager/API_MCP_MANAGER_ENCRYPTION_SECRET"
)

# List of all keys you need

ENV_FILE=".env.qa"

# Clear existing .env file or create a new one
>$ENV_FILE

# Fetch each key and add it to the .env file
for KEY in "${KEYS[@]}"; do
    VALUE=$(aws ssm get-parameter --name "$KEY" --with-decryption --query "Parameter.Value" --output text)
    echo "${KEY##*/}=$VALUE" >>$ENV_FILE
done
