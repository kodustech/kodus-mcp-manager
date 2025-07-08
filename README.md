# 🚀 Kodus MCP Manager

![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1+-blue)
![NestJS](https://img.shields.io/badge/NestJS-10.0+-red)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

> 🔌 **Multi-Cloud Platform Manager** - Sistema robusto para gerenciamento de integrações MCP com providers como Composio.

---

## 📋 Índice

- [🏗️ Pré-requisitos](#️-pré-requisitos)
- [🔌 Providers](#-providers)
- [⚙️ Configuração](#️-configuração)
- [🚀 Instalação](#-instalação)
- [🔥 Executando a Aplicação](#-executando-a-aplicação)
- [🆕 Adicionando um Novo Provider](#-adicionando-um-novo-provider)
- [🧪 Testes](#-testes)
- [📫 Postman](#-postman)
- [🐛 Troubleshooting](#-troubleshooting)

---

## 🏗️ Pré-requisitos

| Ferramenta              | Versão Mínima | Status         | Descrição                  |
| ----------------------- | ------------- | -------------- | -------------------------- |
| 📟 **Node.js**          | v18+          | ✅ Obrigatório | Runtime JavaScript         |
| 🐳 **Docker**           | Latest        | ✅ Obrigatório | Para PostgreSQL            |
| 🐳 **Docker Compose**   | Latest        | ✅ Obrigatório | Orquestração de containers |
| 🔑 **Composio API Key** | -             | ✅ Obrigatório | Para integração Composio   |

---

## 🔌 Providers

### 📊 Providers Disponíveis

| Provider             | Status                | Descrição                             | Documentação                           |
| -------------------- | --------------------- | ------------------------------------- | -------------------------------------- |
| 🎯 **Composio**      | ✅ Ativo              | Plataforma de automação e integrações | [Docs](https://docs.composio.dev)      |
| ➕ **Novo Provider** | 🔄 Em desenvolvimento | Adicione seu próprio provider         | [Guia](#-adicionando-um-novo-provider) |

### 🔧 Configuração do Composio

Para usar o provider Composio, você precisa:

1. **🔑 Criar integração** para qualquer app na plataforma Composio
2. **🖥️ Criar um MCP Server** para esta integração
3. **📋 Configurar as variáveis** de ambiente necessárias

---

## ⚙️ Configuração

### 🌍 Variáveis de Ambiente

No arquivo `.env.test` na raiz do projeto:

```bash
# 🚀 Aplicação
NODE_ENV=development
PORT=3000

# 🔐 JWT
JWT_SECRET=your-super-secret-jwt-key

# 🔌 Providers
MCP_PROVIDERS=composio

# 🎯 Composio
COMPOSIO_API_KEY=your-composio-api-key
COMPOSIO_BASE_URL=https://backend.composio.dev

# 🗄️ Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kodus
DB_PASSWORD=kodus123
DB_DATABASE=kodus_mcp

# 🔗 URLs
# Usado como redirect depois do login com OAUTH2
REDIRECT_URI=http://localhost:3000/callback
```

---

## 🗄️ Estrutura do Banco de Dados

### 📊 Schema: `mcp-manager`

O projeto usa um schema dedicado para organizar todas as tabelas da aplicação:

```sql
-- Schema principal
CREATE SCHEMA IF NOT EXISTS "mcp-manager";
```

### 📋 Tabelas

#### 🔗 `mcp_connections`

Tabela principal para armazenar conexões MCP:

| Coluna           | Tipo      | Descrição                         |
| ---------------- | --------- | --------------------------------- |
| `id`             | UUID      | Chave primária (uuid_generate_v4) |
| `organizationId` | VARCHAR   | ID da organização                 |
| `integrationId`  | VARCHAR   | ID da integração                  |
| `provider`       | VARCHAR   | Nome do provider (ex: composio)   |
| `status`         | VARCHAR   | Status da conexão                 |
| `appName`        | VARCHAR   | Nome da aplicação                 |
| `mcpUrl`         | VARCHAR   | URL do servidor MCP               |
| `allowedTools`   | JSONB     | Lista de ferramentas permitidas   |
| `metadata`       | JSONB     | Dados adicionais da conexão       |
| `createdAt`      | TIMESTAMP | Data de criação                   |
| `updatedAt`      | TIMESTAMP | Data de atualização               |
| `deletedAt`      | TIMESTAMP | Data de exclusão (soft delete)    |

#### 📝 `migrations`

Tabela de controle das migrations do TypeORM:

| Coluna      | Tipo    | Descrição              |
| ----------- | ------- | ---------------------- |
| `id`        | SERIAL  | Chave primária         |
| `timestamp` | BIGINT  | Timestamp da migration |
| `name`      | VARCHAR | Nome da migration      |

### 🔧 Comandos Úteis

```bash
# Verificar estrutura do banco
docker-compose exec kodus-mcp-manager psql -h db_postgres -U $API_PG_DB_USERNAME -d $API_PG_DB_DATABASE -c "\dt mcp-manager.*"

# Verificar dados das conexões
docker-compose exec kodus-mcp-manager psql -h db_postgres -U $API_PG_DB_USERNAME -d $API_PG_DB_DATABASE -c "SELECT * FROM \"mcp-manager\".mcp_connections;"

# Verificar migrations executadas
docker-compose exec kodus-mcp-manager psql -h db_postgres -U $API_PG_DB_USERNAME -d $API_PG_DB_DATABASE -c "SELECT * FROM \"mcp-manager\".migrations;"
```

---

## 🚀 Instalação

### 📥 1. Clone o Repositório

```bash
git clone https://github.com/kodustech/kodus-mcp-manager.git
cd kodus-mcp-manager
```

### 📦 2. Instale as Dependências

```bash
yarn install
```

---

## 🔥 Executando a Aplicação

### 🛠️ Desenvolvimento Local

#### 📋 Pré-requisitos

```bash
# 🐳 Subir banco de dados PostgreSQL
docker-compose up -d

# 📊 Verificar se o banco está rodando
docker-compose ps
```

#### 🗄️ Configuração do Banco de Dados

```bash
# 🔄 Executar migrations (cria schema e tabelas automaticamente)
yarn migrate

# Ou executar passos separadamente:
# 1. Criar schema (se necessário)
yarn pre:migrate

# 2. Executar migrations
yarn migration:run
```

#### 🚀 Iniciar Aplicação

```bash
# 🚀 Iniciar em modo desenvolvimento
yarn start:dev

# Ou usar Docker
docker-compose exec kodus-mcp-manager yarn start:dev
```

A aplicação estará disponível em: **http://localhost:3101**

### 🏭 Produção

```bash
# 🏗️ Build da aplicação
yarn build

# 🚀 Executar em produção
yarn start:prod
```

### 🐳 Docker (Alternativa)

```bash
# 🚀 Subir tudo com Docker
docker-compose up -d

# 📊 Verificar status
docker-compose ps

# 🔄 Executar migrations no container
docker-compose exec kodus-mcp-manager yarn migrate
```

### 📋 Scripts Disponíveis

| Comando                   | Descrição                                       |
| ------------------------- | ----------------------------------------------- |
| `yarn migrate`            | Executa migrations completas (schema + tabelas) |
| `yarn pre:migrate`        | Cria schema se não existir                      |
| `yarn migration:run`      | Executa migrations do TypeORM                   |
| `yarn migration:generate` | Gera nova migration                             |
| `yarn start:dev`          | Inicia aplicação em desenvolvimento             |
| `yarn docker:up`          | Sobe containers Docker                          |
| `yarn docker:down`        | Para containers Docker                          |

---

## 🆕 Adicionando um Novo Provider

### 📋 Passo a Passo

#### 1️⃣ **Configurar Provider**

```bash
# Adicionar no arquivo .env
MCP_PROVIDERS=composio,new_provider
```

#### 2️⃣ **Criar Classe do Provider**

```typescript
// src/modules/providers/new_provider/new_provider.provider.ts

import { BaseProvider } from '../base.provider';

export class NewProviderProvider extends BaseProvider {
  // 🔧 Implementação do provider

  async getIntegrations() {
    // Sua lógica aqui
  }

  async initiateConnection() {
    // Sua lógica aqui
  }

  // ... outros métodos obrigatórios
}
```

#### 3️⃣ **Criar Cliente (Se Necessário)**

```typescript
// src/clients/new_provider/index.ts

export class NewProviderClient {
  constructor(private config: any) {}

  async makeApiCall() {
    // Chamadas para API externa
  }
}
```

#### 4️⃣ **Criar Testes**

```typescript
// test/provider/new_provider.spec.ts

describe('NewProviderProvider', () => {
  // Seus testes aqui
});
```

---

## 🧪 Testes

```bash
# 🧪 Executar todos os testes
yarn test
```

📖 **[Ver documentação completa dos testes](./test/README.md)**

---

## 📫 Postman

### 📥 Importar Collection

1. **Abra o Postman**
2. **Import → File**
3. **Selecione:** `postman/kodus-mcp-manager.postman_collection.json`

### 🔧 Configurar Variáveis

| Variável   | Valor                   | Descrição             |
| ---------- | ----------------------- | --------------------- |
| `baseUrl`  | `http://localhost:3000` | URL base da API       |
| `provider` | `composio`              | Provider padrão       |
| `token`    | `seu-jwt-token`         | Token de autenticação |

### 🎯 Endpoints Disponíveis

- **🔗 Conexões**: Listar, buscar, atualizar
- **🔌 Integrações**: Listar, detalhes, parâmetros, ferramentas
- **🚀 Conectar**: Iniciar conexão com provider

---

## 🐛 Troubleshooting

### ❌ Problemas Comuns

**🔴 "Port 3101 already in use"**

```bash
# Encontrar processo na porta 3101
lsof -i :3101

# Matar processo
kill -9 <PID>

# Ou usar porta diferente
PORT=3102 yarn start:dev
```

**🔴 "Database connection failed"**

```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Reiniciar banco
docker-compose restart db_postgres

# Verificar logs
docker-compose logs db_postgres
```

**🔴 "Migration failed - schema does not exist"**

```bash
# Criar schema manualmente
yarn pre:migrate

# Ou executar migrations completas
yarn migrate
```

**🔴 "Migration failed - table already exists"**

```bash
# Verificar migrations executadas
docker-compose exec kodus-mcp-manager npm run typeorm -- migration:show

# Reverter última migration se necessário
yarn migration:revert

# Ou resetar banco completamente
docker-compose down -v
docker-compose up -d
yarn migrate
```

**🔴 "Composio API Key invalid"**

```bash
# Verificar variável de ambiente
echo $COMPOSIO_API_KEY

# Testar API key
curl -H "x-api-key: $COMPOSIO_API_KEY" https://backend.composio.dev/api/v1/auth_configs
```

**🔴 "Script create-schema.sh failed"**

```bash
# Verificar se o container do banco está rodando
docker ps | grep db_postgres

# Verificar variáveis de ambiente
cat .env | grep API_PG_DB

# Executar script manualmente
./scripts/create-schema.sh
```

---

## 📚 Recursos Úteis

| Recurso                    | Link                                           | Descrição          |
| -------------------------- | ---------------------------------------------- | ------------------ |
| 📖 **Documentação NestJS** | [nestjs.com](https://nestjs.com)               | Framework base     |
| 🎯 **Composio Docs**       | [docs.composio.dev](https://docs.composio.dev) | Provider principal |
| 🐳 **Docker Docs**         | [docs.docker.com](https://docs.docker.com)     | Containerização    |
| 📫 **Postman**             | [postman.com](https://postman.com)             | Testes de API      |

---

## 🤝 Contribuição

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. **Commit** suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. **Push** para a branch (`git push origin feature/nova-feature`)
5. **Abra** um Pull Request

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

**🎉 Projeto Kodus MCP Manager**

[![🚀 Deploy](https://img.shields.io/badge/🚀-Deploy-success?style=for-the-badge)](yarn start:prod)
[![🧪 Tests](https://img.shields.io/badge/🧪-Run%20Tests-blue?style=for-the-badge)](yarn test)
[![📫 Postman](https://img.shields.io/badge/📫-Postman-orange?style=for-the-badge)](postman/kodus-mcp-manager.postman_collection.json)

**Feito com ❤️ pela equipe Kodus**

</div>
