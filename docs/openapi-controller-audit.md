# OpenAPI Controller Audit

> Use this document to record real request/response samples for each endpoint.

## Conventions
- Record real inputs/outputs from curl/Postman
- If errors occur, capture status code + body
- Keep samples updated after changes

---

## Health

### GET /health

**Request**
```bash
curl -i http://localhost:3101/health
```

**Response (200)**
```json
{
  "status": "ok",
  "timestamp": "2026-02-05T12:00:00.000Z",
  "uptime": "123s",
  "environment": "development",
  "version": "0.0.1",
  "database": "connected",
  "memory": { "used": 42, "total": 128 }
}
```

---

## MCP

### GET /mcp/connections

**Request**
```bash
curl -i -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/connections?page=1&pageSize=50"
```

**Response (200)**
```json
{
  "items": [],
  "total": 0
}
```

### GET /mcp/connections/:connectionId

**Request**
```bash
curl -i -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/connections/<connectionId>"
```

**Response (200)**
```json
null
```

### PATCH /mcp/connections

**Request**
```bash
curl -i -X PATCH -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"integrationId":"int_456","status":"ACTIVE"}' \
  "http://localhost:3101/mcp/connections"
```

**Response (200)**
```json
{ }
```

### DELETE /mcp/connections/:connectionId

**Request**
```bash
curl -i -X DELETE -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/connections/<connectionId>"
```

**Response (200)**
```json
{ "message": "Connection deleted successfully" }
```

### PUT /mcp/connections/:integrationId/allowed-tools

**Request**
```bash
curl -i -X PUT -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"allowedTools":["repo.read"]}' \
  "http://localhost:3101/mcp/connections/<integrationId>/allowed-tools"
```

**Response (200)**
```json
{ "message": "Allowed tools updated successfully" }
```

### GET /mcp/integrations

**Request**
```bash
curl -i -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/integrations?page=1&pageSize=50"
```

**Response (200)**
```json
[]
```

### GET /mcp/:provider/integrations/:integrationId

**Request**
```bash
curl -i -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/composio/integrations/<integrationId>"
```

**Response (200)**
```json
{ }
```

### GET /mcp/:provider/integrations/:integrationId/required-params

**Request**
```bash
curl -i -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/composio/integrations/<integrationId>/required-params"
```

**Response (200)**
```json
[]
```

### GET /mcp/:provider/integrations/:integrationId/tools

**Request**
```bash
curl -i -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/composio/integrations/<integrationId>/tools"
```

**Response (200)**
```json
[]
```

### POST /mcp/:provider/connect

**Request**
```bash
curl -i -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"integrationId":"int_456"}' \
  "http://localhost:3101/mcp/composio/connect"
```

**Response (201)**
```json
{ }
```

### GET /mcp/integration/custom

**Request**
```bash
curl -i -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/integration/custom?active=true"
```

**Response (200)**
```json
[]
```

### GET /mcp/integration/custom/:integrationId

**Request**
```bash
curl -i -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/integration/custom/<integrationId>?active=true"
```

**Response (200)**
```json
{ }
```

### POST /mcp/integration/:provider

**Request**
```bash
curl -i -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"https://api.example.com","name":"Custom","authType":"api_key","protocol":"http"}' \
  "http://localhost:3101/mcp/integration/custom"
```

**Response (200)**
```json
{ }
```

### PUT /mcp/integration/:provider/:integrationId

**Request**
```bash
curl -i -X PUT -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"https://api.example.com","name":"Custom","authType":"api_key","protocol":"http"}' \
  "http://localhost:3101/mcp/integration/custom/<integrationId>"
```

**Response (200)**
```json
{ }
```

### DELETE /mcp/integration/:provider/:integrationId

**Request**
```bash
curl -i -X DELETE -H "Authorization: Bearer <token>" \
  "http://localhost:3101/mcp/integration/custom/<integrationId>"
```

**Response (200)**
```json
{ "message": "Integration deleted successfully" }
```

### POST /mcp/integration/:provider/oauth/initialize

**Request**
```bash
curl -i -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"integrationId":"int_456"}' \
  "http://localhost:3101/mcp/integration/custom/oauth/initialize"
```

**Response (200)**
```json
{ "authUrl": "https://provider.example.com/oauth/authorize" }
```

### POST /mcp/integration/:provider/oauth/finalize

**Request**
```bash
curl -i -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"integrationId":"int_456","code":"code","state":"state"}' \
  "http://localhost:3101/mcp/integration/custom/oauth/finalize"
```

**Response (200)**
```json
{ "message": "OAuth integration finalized" }
```

---

## Common Errors

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "timestamp": "2026-02-05T12:00:00.000Z",
  "url": "/mcp/connections",
  "method": "GET",
  "message": "Invalid token",
  "code": "UNAUTHORIZED",
  "details": null
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "timestamp": "2026-02-05T12:00:00.000Z",
  "url": "/mcp/connections/<id>",
  "method": "DELETE",
  "message": "Connection with ID <id> not found",
  "code": "NOT_FOUND",
  "details": null
}
```
