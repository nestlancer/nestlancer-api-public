#!/usr/bin/env node
/**
 * Gateway proxy controllers must document the success envelope for Orval typing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const gatewayModules = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../gateway/src/modules',
);

function walkControllers(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkControllers(full));
    else if (entry.name.endsWith('.controller.ts')) files.push(full);
  }
  return files;
}

function ensureImport(source) {
  if (source.includes('ApiStandardResponses')) return source;

  const commonImport = /import\s*\{([^}]+)\}\s*from\s*['"]@nestlancer\/common['"];/;
  const match = source.match(commonImport);
  if (match) {
    const names = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.includes('ApiStandardResponses')) {
      names.push('ApiStandardResponses');
      return source.replace(
        commonImport,
        `import { ${names.join(', ')} } from '@nestlancer/common';`,
      );
    }
    return source;
  }

  const publicImport = source.match(
    /import\s*\{([^}]+)\}\s*from\s*['"]@nestlancer\/common['"];/,
  );
  const nestImport = source.match(/^import .+ from '@nestjs\/common';/m);
  const line = "import { ApiStandardResponses } from '@nestlancer/common';\n";
  if (nestImport) {
    return source.replace(nestImport[0], `${nestImport[0]}${line}`);
  }
  return line + source;
}

function addClassDecorator(source) {
  const lines = source.split('\n');
  const out = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.startsWith('export class ') &&
      lines[i - 1] !== '@ApiStandardResponses()'
    ) {
      out.push('@ApiStandardResponses()');
      changed = true;
    }
    out.push(line);
  }

  return changed ? out.join('\n') : source;
}

let updated = 0;
for (const file of walkControllers(gatewayModules)) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes('@ApiStandardResponses()')) continue;

  const next = addClassDecorator(ensureImport(source));
  if (next !== source) {
    fs.writeFileSync(file, next);
    updated++;
    console.log('updated', path.relative(gatewayModules, file));
  }
}

console.log(`Done. Updated ${updated} gateway controller(s).`);
