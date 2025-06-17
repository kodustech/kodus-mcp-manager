# Kodus MCP Manager

A NestJS application that manages MCP (Multi-Cloud Platform) servers and integrations with Composio.

## Features

- Integration management with Composio
- MCP server creation and management
- Connection handling between services
- RESTful API endpoints for all operations

## Prerequisites

- Node.js (v16 or higher)
- Composio API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/kodustech/kodus-mcp-manager.git
cd kodus-mcp-manager
```

2. Install dependencies:
```bash
yarn install
```

## Running the Application

### Development
```bash
yarn start:dev
```

### Production
```bash
yarn build
yarn start:prod
```

## API Endpoints

### Integrations

- `GET /composio/integrations` - List all integrations
  - Query parameters:
    - `page`: Page number (default: 1)
    - `pageSize`: Items per page (default: 10)
    - `integrationName`: Filter by integration name

- `GET /composio/integrations/:integrationId` - Get integration details
- `GET /composio/integrations/:integrationId/required-params` - Get required parameters for integration

### MCP Servers

- `POST /composio/mcp-servers` - Create a new MCP server
  ```json
  {
    "entityId": "string",
    "appName": "string",
    "authConfigId": "string"
  }
  ```

- `GET /composio/mcp-servers/:authConfigId` - Get MCP server details

### Connections

- `GET /composio/connections` - List all connections
  - Query parameters:
    - `page`: Page number
    - `pageSize`: Items per page
    - `integrationId`: Filter by integration ID
    - `entityId`: Filter by entity ID
    - `integrationName`: Filter by integration name

- `POST /composio/initiate-connection` - Initiate a new connection
  ```json
  {
    "integrationId": "string",
    "entityId": "string"
  }
  ```

## Testing

### Tests
```bash
yarn run test
```

## Project Structure

```
src/
├── modules/
│   └── composio/
│       ├── composio.controller.ts
│       ├── composio.service.ts
│       └── dto/
├── clients/
│   └── composio.ts
└── app.module.ts
```
