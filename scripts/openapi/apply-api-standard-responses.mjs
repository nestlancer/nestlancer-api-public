#!/usr/bin/env node
/**
 * Adds @ApiStandardResponses() to microservice controllers missing it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const servicesDir = path.join(root, 'services');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

function ensureImport(source) {
  if (source.includes('ApiStandardResponses')) return source;

  const commonImport =
    /import\s*\{([^}]+)\}\s*from\s*['"]@nestlancer\/common['"];/;
  const match = source.match(commonImport);
  if (match) {
    const names = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.includes('ApiStandardResponses')) {
      names.push('ApiStandardResponses');
      names.sort((a, b) => a.localeCompare(b));
      return source.replace(
        commonImport,
        `import { ${names.join(', ')} } from '@nestlancer/common';`,
      );
    }
    return source;
  }

  const firstImport = source.match(/^import .+;\n/m);
  const line = "import { ApiStandardResponses } from '@nestlancer/common';\n";
  if (firstImport) {
    return source.replace(firstImport[0], firstImport[0] + line);
  }
  return line + source;
}

function addClassDecorator(source) {
  const lines = source.split('\n');
  const out = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('export class ') && lines[i - 1] !== '@ApiStandardResponses()') {
      out.push('@ApiStandardResponses()');
      changed = true;
    }
    out.push(line);
  }

  return changed ? out.join('\n') : source;
}

let updated = 0;
for (const file of walk(servicesDir)) {
  if (file.includes('admin-legacy')) continue;

  let source = fs.readFileSync(file, 'utf8');
  const next = addClassDecorator(ensureImport(source));
  if (next !== source) {
    fs.writeFileSync(file, next);
    updated++;
    console.log('updated', path.relative(root, file));
  }
}

console.log(`Done. Updated ${updated} controller(s).`);
