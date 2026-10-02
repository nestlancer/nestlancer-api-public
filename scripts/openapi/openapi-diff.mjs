#!/usr/bin/env node
/**
 * Compare two OpenAPI 3 JSON files for breaking changes (local pre-push helper).
 *
 * Usage:
 *   node scripts/openapi/openapi-diff.mjs [baseline] [current]
 *
 * Defaults:
 *   baseline — docs/api/openapi-merged.json.baseline (if present) else skip with message
 *   current  — docs/api/openapi-merged.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const defaultCurrent = path.join(root, 'docs/api/openapi-merged.json');
const defaultBaseline = path.join(root, 'docs/api/openapi-merged.json.baseline');

const currentPath = path.resolve(process.argv[2] ?? defaultCurrent);
const baselinePath = path.resolve(process.argv[3] ?? defaultBaseline);

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pathMethods(doc) {
  const entries = new Map();
  for (const [pathKey, pathItem] of Object.entries(doc.paths ?? {})) {
    for (const method of Object.keys(pathItem)) {
      if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method)) {
        entries.set(`${method.toUpperCase()} ${pathKey}`, pathItem[method]);
      }
    }
  }
  return entries;
}

function main() {
  if (!fs.existsSync(currentPath)) {
    console.error(`Current spec not found: ${currentPath}`);
    console.error('Run: pnpm contract:refresh');
    process.exit(1);
  }

  if (!fs.existsSync(baselinePath)) {
    console.log(`No baseline at ${baselinePath}`);
    console.log('Create one after a known-good export:');
    console.log(`  cp ${currentPath} ${baselinePath}`);
    process.exit(0);
  }

  const baseline = loadJson(baselinePath);
  const current = loadJson(currentPath);
  const baseOps = pathMethods(baseline);
  const currOps = pathMethods(current);

  const removed = [];
  for (const key of baseOps.keys()) {
    if (!currOps.has(key)) removed.push(key);
  }

  const added = [];
  for (const key of currOps.keys()) {
    if (!baseOps.has(key)) added.push(key);
  }

  console.log(`Baseline: ${baselinePath}`);
  console.log(`Current:  ${currentPath}`);
  console.log(`Operations: ${baseOps.size} → ${currOps.size}`);

  if (removed.length) {
    console.log('\nRemoved operations (breaking for clients):');
    for (const op of removed.sort()) console.log(`  - ${op}`);
  }

  if (added.length) {
    console.log('\nAdded operations:');
    for (const op of added.sort()) console.log(`  + ${op}`);
  }

  if (removed.length > 0) {
    process.exit(1);
  }

  console.log('\nNo removed operations detected.');
}

main();
