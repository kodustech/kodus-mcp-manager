import axios from 'axios';
import fs from 'fs';
import path from 'path';

function resolveBasicAuth(): { user: string; pass: string } | null {
  const raw = process.env.OPENAPI_BASIC_AUTH;
  if (raw) {
    const separatorIndex = raw.indexOf(':');
    if (separatorIndex !== -1) {
      return {
        user: raw.slice(0, separatorIndex),
        pass: raw.slice(separatorIndex + 1),
      };
    }
  }

  const user = process.env.OPENAPI_BASIC_USER;
  const pass = process.env.OPENAPI_BASIC_PASS;
  if (user && pass) {
    return { user, pass };
  }

  const apiDocsUser = process.env.API_DOCS_BASIC_USER;
  const apiDocsPass = process.env.API_DOCS_BASIC_PASS;
  if (apiDocsUser && apiDocsPass) {
    return { user: apiDocsUser, pass: apiDocsPass };
  }

  const docsUser = process.env.DOCS_BASIC_USER;
  const docsPass = process.env.DOCS_BASIC_PASS;
  if (docsUser && docsPass) {
    return { user: docsUser, pass: docsPass };
  }

  return null;
}

async function run() {
  const sourceUrl = process.env.OPENAPI_SOURCE_URL;
  if (!sourceUrl) {
    console.error('OPENAPI_SOURCE_URL is required.');
    process.exit(1);
  }

  const headers: Record<string, string> = {};
  const basic = resolveBasicAuth();
  if (basic) {
    const token = Buffer.from(`${basic.user}:${basic.pass}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  const response = await axios.get(sourceUrl, { headers });
  const outputPath = path.resolve(process.cwd(), 'docs/openapi.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));

  console.log(`OpenAPI exported to ${outputPath}`);
}

run().catch((error) => {
  console.error('Failed to export OpenAPI:', error?.message || error);
  process.exit(1);
});
