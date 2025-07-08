#!/bin/bash

# Lista de todas as chaves que você precisa
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
)

# Lista de todas as chaves que você precisa

ENV_FILE=".env.prod"

# Limpe o arquivo .env existente ou crie um novo
>$ENV_FILE

# Busque cada chave e adicione-a ao arquivo .env
for KEY in "${KEYS[@]}"; do
    VALUE=$(aws ssm get-parameter --name "$KEY" --with-decryption --query "Parameter.Value" --output text)
    echo "${KEY##*/}=$VALUE" >>$ENV_FILE
done
