#!/usr/bin/env node
/**
 * Export live merged OpenAPI from the gateway and optionally lint with Spectral.
 *
 * Usage:
 *   OPENAPI_URL=http://127.0.0.1:3000/docs-all-json node scripts/openapi/export-merged-openapi.mjs
 *   pnpm openapi:export
 *   pnpm openapi:lint:merged   # export + spectral
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outPath = path.join(root, 'docs/api/openapi-merged.json');
const url = process.env.OPENAPI_URL ?? 'http://127.0.0.1:3000/docs-all-json';
const runSpectral = process.argv.includes('--lint');

fs.mkdirSync(path.dirname(outPath), { recursive: true });

console.log(`Fetching ${url}`);
execSync(`curl -fsSL "${url}" -o "${outPath}"`, { stdio: 'inherit' });

execSync(`node "${path.join(root, 'scripts/openapi/normalize-openapi-document.mjs')}" "${outPath}"`, {
  stdio: 'inherit',
});

const spec = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const pathCount = Object.keys(spec.paths ?? {}).length;
console.log(`Wrote ${outPath} (${pathCount} paths)`);

if (runSpectral) {
  console.log('Running Spectral…');
  execSync(`npx @stoplight/spectral-cli lint "${outPath}"`, {
    cwd: root,
    stdio: 'inherit',
  });
}
