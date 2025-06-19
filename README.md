# Kodus MCP Manager

## Prerequisites

- Node.js (v16 or higher)
- Composio API Key

## Providers

- Composio

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
docker-compose up -d
yarn migration:run
yarn start:dev
```

### Production
```bash
yarn build
yarn start:prod
```

### Postman
Use postman/kodus-mcp-manager.postman_collection.json file to import into postman
