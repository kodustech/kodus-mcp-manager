#!/bin/bash
set -e


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

    # Fetch DB settings from orchestrator to avoid duplication
    "/qa/kodus-orchestrator/API_PG_DB_HOST"
    "/qa/kodus-orchestrator/API_PG_DB_PORT"
    "/qa/kodus-orchestrator/API_PG_DB_USERNAME"
    "/qa/kodus-orchestrator/API_PG_DB_PASSWORD"
    "/qa/kodus-orchestrator/API_PG_DB_DATABASE"

    "/qa/kodus-mcp-manager/API_MCP_MANAGER_ENCRYPTION_SECRET"
    "/qa/kodus-orchestrator/API_DOCS_BASIC_USER"
    "/qa/kodus-orchestrator/API_DOCS_BASIC_PASS"
)

# List of all keys you need

ENV_FILE=".env.qa"

# Clear existing .env file or create a new one
>$ENV_FILE

# Fetch each key and add it to the .env file
# Only wrap the DB password in single quotes to preserve special chars.
escape_squotes() {
    printf "%s" "$1" | sed "s/'/'\"'\"'/g"
}

for KEY in "${KEYS[@]}"; do
    VALUE=$(aws ssm get-parameter --name "$KEY" --with-decryption --query "Parameter.Value" --output text)
    if [ "$KEY" = "/qa/kodus-orchestrator/API_PG_DB_PASSWORD" ]; then
        SAFE=$(escape_squotes "$VALUE")
        echo "${KEY##*/}='${SAFE}'" >> "$ENV_FILE"
    else
        echo "${KEY##*/}=$VALUE" >> "$ENV_FILE"
    fi
done

# Fixed overrides for docs
{
    echo "API_DOCS_ENABLED=false"
    echo "API_DOCS_PATH=/docs"
    echo "API_DOCS_SPEC_PATH=/openapi.json"
    echo "API_DOCS_SERVER_URLS="
    echo "API_DOCS_BASE_URL="
} >> "$ENV_FILE"
