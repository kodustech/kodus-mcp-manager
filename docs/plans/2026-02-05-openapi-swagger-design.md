# OpenAPI/Swagger Audit Design

## Objective
Document and validate all endpoints with real inputs/outputs, without changing runtime behavior. Make the OpenAPI pentest-ready with complete responses, standardized errors, tags, and descriptions.

## Scope
- Enable Swagger UI and OpenAPI JSON in non-production only.
- Protect /docs and /openapi.json with Basic Auth.
- Export OpenAPI to docs/openapi.json and lint it with Spectral.
- Audit each endpoint and record real request/response data in docs/openapi-controller-audit.md.
- Add response DTOs and Swagger decorators only (no behavioral changes).

## Architecture
- Swagger is configured in src/main.ts using DocumentBuilder + SwaggerModule.
- /docs serves Swagger UI, /openapi.json returns the generated OpenAPI JSON.
- Basic Auth is enforced via a Fastify onRequest hook for docs routes only, guarded by API_MCP_MANAGER_NODE_ENV.
- Errors are documented using the existing HttpExceptionFilter shape.

## Data and Responses
- Success responses document actual payloads for each endpoint.
- Error responses document 400/401/403/404/500 using a shared ErrorResponseDto.
- Query/body DTOs use ApiProperty* metadata for descriptions/examples.

## Tooling
- scripts/openapi/export-openapi.ts downloads the OpenAPI JSON with Basic Auth and saves docs/openapi.json.
- scripts/openapi/lint-openapi.ts runs Spectral with a local ruleset.
- docs/openapi-controller-audit.md records per-endpoint observed IO and errors.

## Testing and Verification
- Unit tests cover docs Basic Auth parsing/validation utilities.
- Manual verification:
  - /docs and /openapi.json require Basic Auth in non-prod.
  - yarn openapi:export generates docs/openapi.json.
  - yarn openapi:lint produces no errors.

## Constraints
- No runtime behavior changes to business endpoints.
- Docs endpoints are disabled in production.
