# Testes End-to-End (E2E)

Este diretório contém os testes para o Kodus MCP Manager.

## Estrutura dos Arquivos

- `e2e/mcp.e2e.spec.ts` - Testes principais do controller MCP
- `provider/composio.spec.ts` - Testes para o provider Composio
- `run-e2e.sh` - Script para executar os testes
- `README.md` - Esta documentação

## Como Executar os Testes

```bash
yarn test
```

Este script irá:
1. 🐳 Verificar/subir o container PostgreSQL principal
2. ⏳ Aguardar o banco ficar disponível
3. 🗄️ Criar um banco de dados de teste (`kodus_mcp_test`)
4. 🔄 Executar as migrations no banco de teste
5. 🧪 Executar os testes
6. 🧹 Limpar o banco de teste


## Configuração dos Testes

Os testes usam:

- **PostgreSQL no mesmo container** do desenvolvimento
- **Banco de dados separado** (`kodus_mcp_test`) criado dinamicamente
- **Migrations** para criar as tabelas (não synchronize)
- **Mocks** para o ProviderFactory e AuthMiddleware
- **Variáveis de ambiente** específicas para teste

## Variáveis de Ambiente Utilizadas

- `NODE_ENV=test`
- `JWT_SECRET=test-secret-key`
- `MCP_PROVIDERS=composio`
- `DB_HOST=localhost`
- `DB_PORT=5432` (mesma porta do desenvolvimento)
- `DB_USERNAME=kodus`
- `DB_PASSWORD=kodus123`
- `DB_DATABASE=kodus_mcp_test` (banco separado para testes)

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js e yarn
- Todas as dependências do projeto instaladas (`yarn install`)

## Vantagens desta Abordagem

✅ **Simplicidade**: Usa o mesmo container PostgreSQL do desenvolvimento
✅ **Eficiência**: Não precisa subir containers adicionais
✅ **Isolamento**: Banco de teste separado (`kodus_mcp_test`)
✅ **Limpeza**: Banco de teste é criado e removido automaticamente
✅ **Flexibilidade**: Pode rodar junto com o desenvolvimento
