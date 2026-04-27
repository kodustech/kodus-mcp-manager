-- Fix Composio MCP URLs: migrate from deprecated mcp.composio.dev to backend.composio.dev
-- The old endpoint (mcp.composio.dev) was removed on March 25, 2026.
--
-- Before running, preview affected rows:
--   SELECT id, "appName", "mcpUrl" FROM "mcp-manager".mcp_connections WHERE "mcpUrl" LIKE '%mcp.composio.dev%';
--
-- Run with:
--   psql -h <host> -U <user> -d <db> -f scripts/fix-composio-mcp-urls.sql

BEGIN;

-- Step 1: Rewrite the base domain and path format
-- Old: https://mcp.composio.dev/composio/server/<SERVER_ID>/mcp?...
-- New: https://backend.composio.dev/v3/mcp/<SERVER_ID>?...
UPDATE "mcp-manager".mcp_connections
SET "mcpUrl" = regexp_replace(
    "mcpUrl",
    'https://mcp\.composio\.dev/composio/server/([^/]+)/mcp',
    'https://backend.composio.dev/v3/mcp/\1'
),
"updatedAt" = NOW()
WHERE "mcpUrl" LIKE '%mcp.composio.dev/composio/server/%/mcp%';

-- Step 2: Catch any other mcp.composio.dev URLs that don't have the /mcp suffix
-- Old: https://mcp.composio.dev/composio/server/<SERVER_ID>?...
-- New: https://backend.composio.dev/v3/mcp/<SERVER_ID>?...
UPDATE "mcp-manager".mcp_connections
SET "mcpUrl" = regexp_replace(
    "mcpUrl",
    'https://mcp\.composio\.dev/composio/server/([^/?]+)',
    'https://backend.composio.dev/v3/mcp/\1'
),
"updatedAt" = NOW()
WHERE "mcpUrl" LIKE '%mcp.composio.dev%';

COMMIT;

-- Verify the results:
SELECT id, "appName", "mcpUrl", "updatedAt"
FROM "mcp-manager".mcp_connections
WHERE provider = 'composio'
ORDER BY "updatedAt" DESC;
