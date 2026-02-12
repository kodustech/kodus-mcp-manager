import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const specPath = path.resolve(process.cwd(), 'docs/openapi.json');

if (!fs.existsSync(specPath)) {
  console.error('docs/openapi.json not found. Run yarn openapi:export first.');
  process.exit(1);
}

try {
  execFileSync('npx', ['spectral', 'lint', specPath, '-r', '.spectral.yaml'], {
    stdio: 'inherit',
  });
} catch (error) {
  process.exit(1);
}
