#!/bin/bash

# Configurar variáveis de ambiente para teste
export NODE_ENV=test
export JWT_SECRET=test-secret-key
export MCP_PROVIDERS=composio
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=kodus
export DB_PASSWORD=kodus123
export DB_DATABASE=kodus_mcp_test

# Subir o container PostgreSQL (se não estiver rodando)
echo "🐳 Verificando/subindo container PostgreSQL..."
if ! docker ps | grep -q kodus-mcp-postgres; then
  docker compose up -d postgres
fi

# Aguardar o container do banco estar pronto
echo "⏳ Aguardando banco de dados ficar disponível..."
until docker exec kodus-mcp-postgres pg_isready -U kodus > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo ""
echo "✅ Banco de dados está disponível!"

# Criar banco de teste (se não existir)
echo "🗄️ Criando banco de teste..."
docker exec kodus-mcp-postgres psql -U kodus -d kodus_mcp -c "CREATE DATABASE kodus_mcp_test;" 2>/dev/null || echo "Banco de teste já existe ou erro ao criar (continuando...)"

# Aguardar um pouco para garantir que o banco está disponível
sleep 2

# Executar migrations no banco de teste
echo "🔄 Executando migrations no banco de teste..."
yarn run migration:run

if [ $? -eq 0 ]; then
  echo "✅ Migrations executadas com sucesso!"
else
  echo "❌ Erro ao executar migrations"
  exit 1
fi

# Executar os testes e2e
echo "🧪 Executando testes E2E..."
yarn jest --config jest.config.json --verbose --detectOpenHandles --forceExit --coverage --runInBand

# Capturar o código de saída dos testes
TEST_EXIT_CODE=$?

# Limpar banco de teste após os testes
echo "🧹 Limpando banco de teste..."
docker exec kodus-mcp-postgres psql -U kodus -d kodus_mcp -c "DROP DATABASE IF EXISTS kodus_mcp_test;" 2>/dev/null || echo "Erro ao limpar banco de teste (não é crítico)"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ Testes E2E concluídos com sucesso!"
else
  echo "❌ Testes E2E falharam!"
  exit $TEST_EXIT_CODE
fi 