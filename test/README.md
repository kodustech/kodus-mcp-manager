# 🧪 Testes End-to-End (E2E)

![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-73%25-yellow)
![Node](https://img.shields.io/badge/Node.js-v18+-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

> Sistema de testes automatizados para o **Kodus MCP Manager** com PostgreSQL e mocks inteligentes.

---

## 📁 Estrutura do Projeto

```
test/
├── 📂 e2e/
│   └── mcp.e2e.spec.ts          # 🎯 Testes de integração do controller MCP
├── 📂 provider/
│   └── composio.spec.ts         # 🔌 Testes unitários do provider Composio
├── 📂 __mocks__/
│   └── ...                     # 🎭 Mocks para testes
├── 🚀 run-e2e.sh               # 📜 Script de execução dos testes
└── 📚 README.md                # 📖 Esta documentação
```

---

## 🚀 Execução Rápida

```bash
# Executar todos os testes
yarn test

# Executar apenas testes unitários
npx jest test/provider/

# Executar apenas testes E2E
npx jest test/e2e/
```

---

## 🔄 Fluxo de Execução

O comando `yarn test` executa automaticamente:

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 🐳 | Verificar/subir container PostgreSQL | ✅ |
| ⏳ | Aguardar banco ficar disponível | ✅ |
| 🗄️ | Criar banco de teste (`kodus_mcp_test`) | ✅ |
| 🔄 | Executar migrations no banco de teste | ✅ |
| 🧪 | Executar suite completa de testes | ✅ |
| 🧹 | Limpar banco de teste | ✅ |

---

## ⚙️ Configuração dos Testes

### 🎭 Mocks Utilizados
- **ProviderFactory**: Mock para gerenciamento de providers
- **AuthMiddleware**: Mock para autenticação JWT
- **ComposioClient**: Mock para API externa do Composio

### 🗃️ Banco de Dados
- **Container**: Mesmo PostgreSQL do desenvolvimento
- **Banco**: `kodus_mcp_test` (isolado e temporário)
- **Migrations**: Executadas automaticamente
- **Limpeza**: Banco removido após os testes

---

## 🌍 Variáveis de Ambiente

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `NODE_ENV` | `test` | Ambiente de execução |
| `JWT_SECRET` | `test-secret-key` | Chave para JWT nos testes |
| `MCP_PROVIDERS` | `composio` | Providers habilitados |
| `DB_HOST` | `localhost` | Host do PostgreSQL |
| `DB_PORT` | `5432` | Porta do PostgreSQL |
| `DB_USERNAME` | `kodus` | Usuário do banco |
| `DB_PASSWORD` | `kodus123` | Senha do banco |
| `DB_DATABASE` | `kodus_mcp_test` | Nome do banco de teste |

---

## 📊 Cobertura de Testes

### 🎯 Testes E2E (`mcp.e2e.spec.ts`)
- ✅ **11 testes** - Endpoints do controller MCP
- 🔗 Conexões: listagem, busca, atualização
- 🔌 Integrações: listagem, detalhes, parâmetros, ferramentas
- ⚠️ Tratamento de erros e validações

### 🔌 Testes Unitários (`composio.spec.ts`)
- ✅ **20 testes** - Provider Composio
- 🏗️ Construtor e configuração
- 📝 Mapeamento de status
- 🔄 Métodos de integração
- 🛠️ Ferramentas e conexões
- 🖥️ Servidores MCP

---

## 🛠️ Pré-requisitos

| Ferramenta | Versão | Status |
|------------|--------|--------|
| 🐳 Docker | Latest | ✅ Obrigatório |
| 🐳 Docker Compose | Latest | ✅ Obrigatório |
| 📟 Node.js | v18+ | ✅ Obrigatório |
| 📦 Yarn | Latest | ✅ Obrigatório |

### 📥 Instalação
```bash
# Instalar dependências
yarn install

# Verificar se Docker está rodando
docker --version
docker-compose --version
```

---

## 🏆 Vantagens da Abordagem

| Vantagem | Descrição |
|----------|-----------|
| 🎯 **Simplicidade** | Usa o mesmo container PostgreSQL do desenvolvimento |
| ⚡ **Eficiência** | Não precisa subir containers adicionais |
| 🔒 **Isolamento** | Banco de teste separado (`kodus_mcp_test`) |
| 🧹 **Limpeza** | Banco criado e removido automaticamente |
| 🔄 **Flexibilidade** | Pode rodar junto com o desenvolvimento |
| 📊 **Cobertura** | Testes unitários + integração |

---

## 🐛 Troubleshooting

### ❌ Problemas Comuns

**🔴 "Banco de dados não disponível"**
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Subir o banco se necessário
docker-compose up -d postgres
```

**🔴 "Porta 5432 em uso"**
```bash
# Verificar processos na porta
lsof -i :5432

# Parar PostgreSQL local se necessário
sudo systemctl stop postgresql
```

**🔴 "Migrations falharam"**
```bash
# Limpar banco de teste manualmente
docker-compose exec postgres psql -U kodus -c "DROP DATABASE IF EXISTS kodus_mcp_test;"
```

---

## 📈 Estatísticas

```
📊 Resumo dos Testes
├── 🎯 Total de Testes: 33
├── ✅ Passando: 33
├── ❌ Falhando: 0
├── ⏱️ Tempo Médio: ~9s
└── 📈 Cobertura: 73.24%
```

---

## 🚀 Próximos Passos

- [ ] 📈 Aumentar cobertura para 90%+
- [ ] 🧪 Adicionar testes de performance
- [ ] 🔄 Testes de integração com APIs externas
- [ ] 📱 Testes de API com diferentes payloads
- [ ] 🛡️ Testes de segurança e validação

---

<div align="center">

**🎉 Testes sempre atualizados e funcionando!**

[![Run Tests](https://img.shields.io/badge/▶️-Run%20Tests-success?style=for-the-badge)](yarn test)

</div>
