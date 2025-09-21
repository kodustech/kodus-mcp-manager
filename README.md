# 🚀 Kodus MCP Manager

![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1+-blue)
![NestJS](https://img.shields.io/badge/NestJS-10.0+-red)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

> 🔌 **Multi-Cloud Platform Manager** - A robust system for managing MCP integrations with providers like Composio.

---

## 📋 Table of Contents

- [🏗️ Prerequisites](#️-prerequisites)
- [🔌 Providers](#-providers)
- [⚙️ Configuration](#️-configuration)
- [🚀 Installation](#-installation)
- [🔥 Running the Application](#-running-the-application)
- [🆕 Adding a New Provider](#-adding-a-new-provider)
- [🧪 Testing](#-testing)
- [📫 Postman](#-postman)
- [🐛 Troubleshooting](#-troubleshooting)

---

## 🏗️ Prerequisites

| Tool                    | Minimum Version | Status      | Description              |
| ----------------------- | --------------- | ----------- | ------------------------ |
| 📟 **Node.js**          | v18+            | ✅ Required | JavaScript runtime       |
| 🐳 **Docker**           | Latest          | ✅ Required | For PostgreSQL           |
| 🐳 **Docker Compose**   | Latest          | ✅ Required | Container orchestration  |
| 🔑 **Composio API Key** | -               | ✅ Required | For Composio integration |

---

## 🔌 Providers

### 📊 Available Providers

| Provider            | Status            | Description                         | Documentation                     |
| ------------------- | ----------------- | ----------------------------------- | --------------------------------- |
| 🎯 **Composio**     | ✅ Active         | Automation and integration platform | [Docs](https://docs.composio.dev) |
| ➕ **New Provider** | 🔄 In Development | Add your own provider               | [Guide](#-adding-a-new-provider)  |

### 🔧 Composio Setup

To use the Composio provider, you need to:

1. **🔑 Create an integration** for any app on the Composio platform
2. **🖥️ Set up an MCP Server** for this integration
3. **📋 Configure the required** environment variables

---

## ⚙️ Configuration

### 🌍 Environment Variables

In the `.env.test` file at the project root:

```bash
# 🚀 Application
NODE_ENV=development
PORT=3000

# 🔐 JWT
JWT_SECRET=your-super-secret-jwt-key

# 🔌 Providers
MCP_PROVIDERS=composio

# 🎯 Composio
COMPOSIO_API_KEY=your-composio-api-key
COMPOSIO_BASE_URL=https://backend.composio.dev

# 🗄️ Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kodus
DB_PASSWORD=kodus123
DB_DATABASE=kodus_mcp

# 🔗 URLs
# Used as redirect after OAuth2 login
REDIRECT_URI=http://localhost:3000/callback
```

---

## 🗄️ Database Structure

### 📊 Schema: `mcp-manager`

The project uses a dedicated schema to organize all application tables:

```sql
-- Main schema
CREATE SCHEMA IF NOT EXISTS "mcp-manager";
```

### 📋 Tables

#### 🔗 `mcp_connections`

Main table for storing MCP connections:

| Column           | Type      | Description                    |
| ---------------- | --------- | ------------------------------ |
| `id`             | UUID      | Primary key (uuid_generate_v4) |
| `organizationId` | VARCHAR   | Organization ID                |
| `integrationId`  | VARCHAR   | Integration ID                 |
| `provider`       | VARCHAR   | Provider name (e.g., composio) |
| `status`         | VARCHAR   | Connection status              |
| `appName`        | VARCHAR   | Application name               |
| `mcpUrl`         | VARCHAR   | MCP server URL                 |
| `allowedTools`   | JSONB     | List of allowed tools          |
| `metadata`       | JSONB     | Additional connection data     |
| `createdAt`      | TIMESTAMP | Creation date                  |
| `updatedAt`      | TIMESTAMP | Last update date               |
| `deletedAt`      | TIMESTAMP | Deletion date (soft delete)    |

#### 📝 `migrations`

TypeORM migration control table:

| Column      | Type    | Description         |
| ----------- | ------- | ------------------- |
| `id`        | SERIAL  | Primary key         |
| `timestamp` | BIGINT  | Migration timestamp |
| `name`      | VARCHAR | Migration name      |

### 🔧 Useful Commands

```bash
# Check database structure
docker-compose exec kodus-mcp-manager psql -h db_postgres -U $API_PG_DB_USERNAME -d $API_PG_DB_DATABASE -c "\dt mcp-manager.*"

# Check connection data
docker-compose exec kodus-mcp-manager psql -h db_postgres -U $API_PG_DB_USERNAME -d $API_PG_DB_DATABASE -c "SELECT * FROM \"mcp-manager\".mcp_connections;"

# Check executed migrations
docker-compose exec kodus-mcp-manager psql -h db_postgres -U $API_PG_DB_USERNAME -d $API_PG_DB_DATABASE -c "SELECT * FROM \"mcp-manager\".migrations;"
```

---

## 🚀 Installation

### 📥 1. Clone the Repository

```bash
git clone https://github.com/kodustech/kodus-mcp-manager.git
cd kodus-mcp-manager
```

### 📦 2. Install Dependencies

```bash
yarn install
```

---

## 🔥 Running the Application

### 🛠️ Local Development

#### 📋 Prerequisites

```bash
# 🐳 Start PostgreSQL database
docker-compose up -d

# 📊 Check if database is running
docker-compose ps
```

#### 🗄️ Database Setup

```bash
# 🔄 Run migrations (creates schema and tables automatically)
yarn migrate

# Or run steps separately:
# 1. Create schema (if needed)
yarn pre:migrate

# 2. Run migrations
yarn migration:run
```

#### 🚀 Start Application

```bash
# 🚀 Start in development mode
yarn start:dev

# Or use Docker
docker-compose exec kodus-mcp-manager yarn start:dev
```

The application will be available at: **http://localhost:3101**

### 🏭 Production

```bash
# 🏗️ Build the application
yarn build

# 🚀 Run in production
yarn start:prod
```

### 🐳 Docker (Alternative)

```bash
# 🚀 Start everything with Docker
docker-compose up -d

# 📊 Check status
docker-compose ps

# 🔄 Run migrations in container
docker-compose exec kodus-mcp-manager yarn migrate
```

### 📋 Available Scripts

| Command                   | Description                               |
| ------------------------- | ----------------------------------------- |
| `yarn migrate`            | Run complete migrations (schema + tables) |
| `yarn pre:migrate`        | Create schema if it doesn't exist         |
| `yarn migration:run`      | Run TypeORM migrations                    |
| `yarn migration:generate` | Generate new migration                    |
| `yarn start:dev`          | Start application in development mode     |
| `yarn docker:up`          | Start Docker containers                   |
| `yarn docker:down`        | Stop Docker containers                    |

---

## 🆕 Adding a New Provider

### 📋 Step by Step

#### 1️⃣ **Configure Provider**

```bash
# Add to .env file
MCP_PROVIDERS=composio,new_provider
```

#### 2️⃣ **Create Provider Class**

```typescript
// src/modules/providers/new_provider/new_provider.provider.ts

import { BaseProvider } from '../base.provider';

export class NewProviderProvider extends BaseProvider {
  // 🔧 Provider implementation

  async getIntegrations() {
    // Your logic here
  }

  async initiateConnection() {
    // Your logic here
  }

  // ... other required methods
}
```

#### 3️⃣ **Create Client (If Needed)**

```typescript
// src/clients/new_provider/index.ts

export class NewProviderClient {
  constructor(private config: any) {}

  async makeApiCall() {
    // External API calls
  }
}
```

#### 4️⃣ **Create Tests**

```typescript
// test/provider/new_provider.spec.ts

describe('NewProviderProvider', () => {
  // Your tests here
});
```

---

## 🧪 Testing

```bash
# 🧪 Run all tests
yarn test
```

📖 **[View complete testing documentation](./test/README.md)**

---

## 📫 Postman

### 📥 Import Collection

1. **Open Postman**
2. **Import → File**
3. **Select:** `postman/kodus-mcp-manager.postman_collection.json`

### 🔧 Configure Variables

| Variable   | Value                   | Description          |
| ---------- | ----------------------- | -------------------- |
| `baseUrl`  | `http://localhost:3000` | API base URL         |
| `provider` | `composio`              | Default provider     |
| `token`    | `your-jwt-token`        | Authentication token |

### 🎯 Available Endpoints

- **🔗 Connections**: List, search, update
- **🔌 Integrations**: List, details, parameters, tools, create
- **🛠️ Tool Selection**: Get available tools, get selected tools, update selected tools
- **🚀 Connect**: Initiate connection with provider

### 🛠️ Tool Selection

The system now supports dynamic tool selection and management:

#### **Available Tools**

```bash
GET /mcp/{provider}/integrations/{integrationId}/available-tools
```

Returns all available tools for a specific integration.

#### **Selected Tools**

```bash
GET /mcp/{provider}/integrations/{integrationId}/selected-tools
```

Returns currently selected tools for an integration.

#### **Update Selected Tools**

```bash
PUT /mcp/{provider}/integrations/{integrationId}/selected-tools
Content-Type: application/json

{
  "allowedTools": ["KODUS_LIST_REPOSITORIES", "KODUS_GET_KODY_RULES"]
}
```

Updates the selected tools for an integration.

### 🔌 Integration Management

The system supports creating integrations directly in the database:

#### **Create Integration**

```bash
POST /mcp/integration/{provider}
Authorization: Bearer {token}
Content-Type: application/json

{
  "integrationId": "kd_mcp_oTUrzqsaxTg",
  "mcpUrl": "https://mcp.kodus.io"
}
```

Creates an integration for the organization with the specified provider. The integrationId is passed in the request body. If the integration already exists, returns the existing one. Allows custom configuration of MCP URL.

**Example:**

```bash
POST /mcp/integration/kodusmcp
```

---

## 🐛 Troubleshooting

### ❌ Common Issues

**🔴 "Port 3101 already in use"**

```bash
# Find process on port 3101
lsof -i :3101

# Kill process
kill -9 <PID>

# Or use different port
PORT=3102 yarn start:dev
```

**🔴 "Database connection failed"**

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart db_postgres

# Check logs
docker-compose logs db_postgres
```

**🔴 "Migration failed - schema does not exist"**

```bash
# Create schema manually
yarn pre:migrate

# Or run complete migrations
yarn migrate
```

**🔴 "Migration failed - table already exists"**

```bash
# Check executed migrations
docker-compose exec kodus-mcp-manager npm run typeorm -- migration:show

# Revert last migration if needed
yarn migration:revert

# Or reset database completely
docker-compose down -v
docker-compose up -d
yarn migrate
```

**🔴 "Composio API Key invalid"**

```bash
# Check environment variable
echo $COMPOSIO_API_KEY

# Test API key
curl -H "x-api-key: $COMPOSIO_API_KEY" https://backend.composio.dev/api/v1/auth_configs
```

**🔴 "Script create-schema.sh failed"**

```bash
# Check if database container is running
docker ps | grep db_postgres

# Check environment variables
cat .env | grep API_PG_DB

# Run script manually
./scripts/create-schema.sh
```

---

## 📚 Useful Resources

| Resource                    | Link                                           | Description      |
| --------------------------- | ---------------------------------------------- | ---------------- |
| 📖 **NestJS Documentation** | [nestjs.com](https://nestjs.com)               | Base framework   |
| 🎯 **Composio Docs**        | [docs.composio.dev](https://docs.composio.dev) | Main provider    |
| 🐳 **Docker Docs**          | [docs.docker.com](https://docs.docker.com)     | Containerization |
| 📫 **Postman**              | [postman.com](https://postman.com)             | API testing      |

---

## 🤝 Contributing

1. **Fork** the project
2. **Create** a feature branch (`git checkout -b feature/new-feature`)
3. **Commit** your changes (`git commit -m 'Add new feature'`)
4. **Push** to the branch (`git push origin feature/new-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is under the **MIT** license. See the [LICENSE](LICENSE) file for more details.

---

<div align="center">

**🎉 Kodus MCP Manager Project**

[![🚀 Deploy](https://img.shields.io/badge/🚀-Deploy-success?style=for-the-badge)](yarn start:prod)
[![🧪 Tests](https://img.shields.io/badge/🧪-Run%20Tests-blue?style=for-the-badge)](yarn test)
[![📫 Postman](https://img.shields.io/badge/📫-Postman-orange?style=for-the-badge)](postman/kodus-mcp-manager.postman_collection.json)

**Made with ❤️ by the Kodus team**

</div>
