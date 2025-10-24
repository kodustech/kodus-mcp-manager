#!/bin/bash

# Lista de todas as chaves que você precisa
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

# Lista de todas as chaves que você precisa

ENV_FILE=".env.qa"

# Limpe o arquivo .env existente ou crie um novo
>$ENV_FILE

# Busque cada chave e adicione-a ao arquivo .env
for KEY in "${KEYS[@]}"; do
    VALUE=$(aws ssm get-parameter --name "$KEY" --with-decryption --query "Parameter.Value" --output text)
    echo "${KEY##*/}=$VALUE" >>$ENV_FILE
done
