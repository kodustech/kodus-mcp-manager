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

| Ferramenta | Versão Mínima | Status | Descrição |
|------------|---------------|--------|-----------|
| 📟 **Node.js** | v18+ | ✅ Obrigatório | Runtime JavaScript |
| 🐳 **Docker** | Latest | ✅ Obrigatório | Para PostgreSQL |
| 🐳 **Docker Compose** | Latest | ✅ Obrigatório | Orquestração de containers |
| 🔑 **Composio API Key** | - | ✅ Obrigatório | Para integração Composio |

---

## 🔌 Providers

### 📊 Providers Disponíveis

| Provider | Status | Descrição | Documentação |
|----------|--------|-----------|--------------|
| 🎯 **Composio** | ✅ Ativo | Plataforma de automação e integrações | [Docs](https://docs.composio.dev) |
| ➕ **Novo Provider** | 🔄 Em desenvolvimento | Adicione seu próprio provider | [Guia](#-adicionando-um-novo-provider) |

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

### 🛠️ Desenvolvimento

```bash
# 🐳 Subir banco de dados
docker-compose up -d

# 🔄 Executar migrations
yarn migration:run

# 🚀 Iniciar em modo desenvolvimento
yarn start:dev
```

A aplicação estará disponível em: **http://localhost:3000**

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
```

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

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `baseUrl` | `http://localhost:3000` | URL base da API |
| `provider` | `composio` | Provider padrão |
| `token` | `seu-jwt-token` | Token de autenticação |

### 🎯 Endpoints Disponíveis

- **🔗 Conexões**: Listar, buscar, atualizar
- **🔌 Integrações**: Listar, detalhes, parâmetros, ferramentas
- **🚀 Conectar**: Iniciar conexão com provider

---

## 🐛 Troubleshooting

### ❌ Problemas Comuns

**🔴 "Port 3000 already in use"**
```bash
# Encontrar processo na porta 3000
lsof -i :3000

# Matar processo
kill -9 <PID>

# Ou usar porta diferente
PORT=3001 yarn start:dev
```

**🔴 "Database connection failed"**
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Reiniciar banco
docker-compose restart postgres

# Verificar logs
docker-compose logs postgres
```

**🔴 "Migration failed"**
```bash
# Resetar banco
docker-compose down -v
docker-compose up -d
yarn migration:run
```

**🔴 "Composio API Key invalid"**
```bash
# Verificar variável de ambiente
echo $COMPOSIO_API_KEY

# Testar API key
curl -H "x-api-key: $COMPOSIO_API_KEY" https://backend.composio.dev/api/v1/auth_configs
```

---

## 📚 Recursos Úteis

| Recurso | Link | Descrição |
|---------|------|-----------|
| 📖 **Documentação NestJS** | [nestjs.com](https://nestjs.com) | Framework base |
| 🎯 **Composio Docs** | [docs.composio.dev](https://docs.composio.dev) | Provider principal |
| 🐳 **Docker Docs** | [docs.docker.com](https://docs.docker.com) | Containerização |
| 📫 **Postman** | [postman.com](https://postman.com) | Testes de API |

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
