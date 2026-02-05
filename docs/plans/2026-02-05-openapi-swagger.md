# OpenAPI/Swagger Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Swagger/OpenAPI tooling, docs protection, and complete endpoint documentation without changing runtime behavior.

**Architecture:** Configure Swagger in `src/main.ts` for non-prod only, protect `/docs` and `/openapi.json` with Basic Auth, add DTOs/decorators for responses, and add export/lint scripts + audit docs.

**Tech Stack:** NestJS 11, Fastify adapter, @nestjs/swagger, Spectral, ts-node, Jest.

### Task 1: Add docs Basic Auth utilities with tests

**Files:**
- Create: `src/common/utils/docs-auth.ts`
- Create: `test/common/docs-auth.spec.ts`

**Step 1: Write the failing test**
```ts
import { describe, it, expect } from '@jest/globals';
import { parseBasicAuth, validateBasicAuth } from '../../src/common/utils/docs-auth';

describe('docs-auth', () => {
  it('parses valid Basic auth header', () => {
    const header = 'Basic ZGV2OmRldnBhc3M='; // dev:devpass
    expect(parseBasicAuth(header)).toEqual({ user: 'dev', pass: 'devpass' });
  });

  it('rejects invalid header', () => {
    expect(parseBasicAuth('Bearer token')).toBeNull();
  });

  it('validates credentials', () => {
    expect(validateBasicAuth({ user: 'u', pass: 'p' }, { user: 'u', pass: 'p' })).toBe(true);
    expect(validateBasicAuth({ user: 'u', pass: 'x' }, { user: 'u', pass: 'p' })).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npx jest test/common/docs-auth.spec.ts`
Expected: FAIL with module not found or missing functions.

**Step 3: Write minimal implementation**
```ts
export type BasicAuth = { user: string; pass: string };

export function parseBasicAuth(header?: string): BasicAuth | null {
  if (!header) return null;
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return null;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');
  if (!user || pass === undefined) return null;
  return { user, pass };
}

export function validateBasicAuth(actual: BasicAuth | null, expected: BasicAuth): boolean {
  return !!actual && actual.user === expected.user && actual.pass === expected.pass;
}
```

**Step 4: Run test to verify it passes**
Run: `npx jest test/common/docs-auth.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/common/utils/docs-auth.ts test/common/docs-auth.spec.ts
git commit -m "test: add docs basic auth utils"
```

### Task 2: Add Swagger dependencies and scripts

**Files:**
- Modify: `package.json`

**Step 1: Add dependencies**
Add to `dependencies` or `devDependencies`:
- `@nestjs/swagger`
- `@fastify/swagger`
- `@fastify/swagger-ui`
- `@stoplight/spectral-core`
- `@stoplight/spectral-rulesets`

**Step 2: Add scripts**
Add:
- `openapi:export`: `ts-node ./scripts/openapi/export-openapi.ts`
- `openapi:lint`: `ts-node ./scripts/openapi/lint-openapi.ts`

**Step 3: Install**
Run: `yarn install`
Expected: packages installed

**Step 4: Commit**
```bash
git add package.json yarn.lock
git commit -m "chore: add swagger and spectral tooling"
```

### Task 3: Wire Swagger + docs Basic Auth in main.ts

**Files:**
- Modify: `src/main.ts`

**Step 1: Add Swagger config**
- Build `DocumentBuilder` with title, description, version.
- Add tags `Health` and `MCP`.
- Add BearerAuth scheme.

**Step 2: Add Basic Auth hook for /docs and /openapi.json**
- Only enable when `API_MCP_MANAGER_NODE_ENV !== 'production'`.
- Enforce credentials from `DOCS_BASIC_USER`/`DOCS_BASIC_PASS`.

**Step 3: Serve docs and openapi.json**
- `SwaggerModule.setup('docs', app, document)`
- Add Fastify GET `/openapi.json` returning the document.

**Step 4: Manual verification**
Run app, then:
- `curl -i http://localhost:3101/docs` -> 401
- `curl -i -u user:pass http://localhost:3101/openapi.json` -> 200

**Step 5: Commit**
```bash
git add src/main.ts
git commit -m "feat: add swagger docs with basic auth"
```

### Task 4: Add shared ErrorResponseDto

**Files:**
- Create: `src/common/dto/error-response.dto.ts`
- Modify: `src/common/dto/index.ts`

**Step 1: Define error DTO**
Mirror HttpExceptionFilter response:
- statusCode, timestamp, url, method, message, code, details

**Step 2: Export from common dto index**

**Step 3: Commit**
```bash
git add src/common/dto/error-response.dto.ts src/common/dto/index.ts
git commit -m "feat: add shared error response dto"
```

### Task 5: Add Health response DTO + Swagger decorators

**Files:**
- Create: `src/health/dto/health-response.dto.ts`
- Modify: `src/health/health.controller.ts`

**Step 1: Add HealthResponseDto**
Include fields: status, timestamp, uptime, environment, version, database, memory.

**Step 2: Decorate controller**
- `@ApiTags('Health')`
- `@ApiOperation`
- `@ApiOkResponse({ type: HealthResponseDto })`

**Step 3: Commit**
```bash
git add src/health/dto/health-response.dto.ts src/health/health.controller.ts
git commit -m "docs: add health swagger responses"
```

### Task 6: Add MCP response DTOs

**Files:**
- Create: `src/modules/mcp/dto/mcp-responses.dto.ts`

**Step 1: Define DTOs**
Include:
- McpConnectionDto
- McpConnectionsResponseDto
- McpIntegrationDto
- McpIntegrationDetailsDto
- McpRequiredParamDto
- McpToolDto
- McpMessageResponseDto
- McpAllowedToolsResponseDto
- McpOAuthInitResponseDto

**Step 2: Commit**
```bash
git add src/modules/mcp/dto/mcp-responses.dto.ts
git commit -m "docs: add mcp response dtos"
```

### Task 7: Add Swagger decorators to MCP controller

**Files:**
- Modify: `src/modules/mcp/mcp.controller.ts`

**Step 1: Add class-level decorators**
- `@ApiTags('MCP')`
- `@ApiBearerAuth()`

**Step 2: Add per-endpoint decorators**
- `@ApiOperation({ summary, description })`
- `@ApiOkResponse`/`@ApiCreatedResponse`/`@ApiNoContentResponse`
- `@ApiBadRequestResponse`/`@ApiUnauthorizedResponse`/`@ApiForbiddenResponse`/`@ApiNotFoundResponse`/`@ApiInternalServerErrorResponse`
- Add `@ApiQuery` where needed for query params

**Step 3: Commit**
```bash
git add src/modules/mcp/mcp.controller.ts
git commit -m "docs: add swagger metadata for mcp endpoints"
```

### Task 8: Add OpenAPI export and lint tooling

**Files:**
- Create: `scripts/openapi/export-openapi.ts`
- Create: `scripts/openapi/lint-openapi.ts`
- Create: `.spectral.yaml`

**Step 1: Implement export script**
- Read `OPENAPI_SOURCE_URL`
- Apply Basic Auth via `OPENAPI_BASIC_AUTH` or `OPENAPI_BASIC_USER/PASS` or `DOCS_BASIC_USER/PASS`
- Write `docs/openapi.json`

**Step 2: Implement lint script**
- Load `docs/openapi.json`
- Run Spectral with local ruleset
- Exit non-zero on errors

**Step 3: Commit**
```bash
git add scripts/openapi/export-openapi.ts scripts/openapi/lint-openapi.ts .spectral.yaml
git commit -m "chore: add openapi export and lint scripts"
```

### Task 9: Add audit docs

**Files:**
- Create: `docs/openapi-controller-audit.md`

**Step 1: Create template**
Include per-endpoint sections with placeholders for input/output/errors.

**Step 2: Commit**
```bash
git add docs/openapi-controller-audit.md
git commit -m "docs: add openapi audit template"
```

### Task 10: Update environment examples and README

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Step 1: Add DOCS_BASIC_USER/DOCS_BASIC_PASS**
Document required env vars for docs in non-prod.

**Step 2: Document openapi scripts**
Add usage for `openapi:export` and `openapi:lint`.

**Step 3: Commit**
```bash
git add .env.example README.md
git commit -m "docs: document swagger env and scripts"
```

### Task 11: Verification

**Step 1: Run unit tests**
Run: `npx jest test/common/docs-auth.spec.ts`
Expected: PASS

**Step 2: Run OpenAPI export + lint**
Run:
```
OPENAPI_SOURCE_URL=http://localhost:3101/openapi.json \
OPENAPI_BASIC_AUTH=dev:devpass \
yarn openapi:export
```
Expected: `docs/openapi.json` generated

Run: `yarn openapi:lint`
Expected: no errors

**Step 3: Manual endpoint spot-check**
Use curl/Postman to verify representative endpoints and confirm docs match.
