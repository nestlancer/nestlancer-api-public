#!/usr/bin/env node
/**
 * Gateway proxies forward via @Req() without @Param(), so NestJS Swagger omits path parameters.
 * Adds @ApiParam for each :segment in route decorators when missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const gatewayModules = path.join(root, 'gateway/src/modules');

const ROUTE_DECORATOR =
  /@(Get|Post|Put|Patch|Delete|Head|Options)\(\s*['"`]([^'"`]+)['"`]\s*\)/;

const PARAM_DESCRIPTIONS = {
  id: 'Resource UUID',
  slug: 'URL slug',
  userId: 'User UUID',
  projectId: 'Project UUID',
  sessionId: 'Session UUID',
  threadId: 'Thread UUID',
  messageId: 'Message UUID',
  attachmentId: 'Attachment UUID',
  milestoneId: 'Milestone UUID',
  deliverableId: 'Deliverable UUID',
  entryId: 'Progress entry UUID',
  revisionId: 'Revision UUID',
  commentId: 'Comment UUID',
  quoteId: 'Quote UUID',
  publicId: 'Public identifier or slug',
  uploadId: 'Chunked upload UUID',
  deviceId: 'Device UUID',
  provider: 'Webhook provider key',
  token: 'Share token',
  name: 'Service name',
  flag: 'Feature flag key',
  idOrSlug: 'Resource id or slug',
};

function describeParam(name) {
  return PARAM_DESCRIPTIONS[name] ?? `${name} path parameter`;
}

function extractPathParams(routePath) {
  return [...routePath.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);
}

function ensureSwaggerImport(source) {
  if (!source.includes('@ApiParam')) return source;

  const swaggerImport =
    /import\s*\{([^}]+)\}\s*from\s*['"]@nestjs\/swagger['"];/;
  const match = source.match(swaggerImport);
  if (match) {
    const names = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.includes('ApiParam')) {
      names.push('ApiParam');
      names.sort((a, b) => a.localeCompare(b));
      return source.replace(
        swaggerImport,
        `import { ${names.join(', ')} } from '@nestjs/swagger';`,
      );
    }
    return source;
  }

  const nestImport = source.match(/^import .+ from '@nestjs\/common';/m);
  if (nestImport) {
    return source.replace(
      nestImport[0],
      `${nestImport[0]}\nimport { ApiParam } from '@nestjs/swagger';`,
    );
  }
  return `import { ApiParam } from '@nestjs/swagger';\n${source}`;
}

function hasApiParam(block, name) {
  return new RegExp(`@ApiParam\\(\\s*\\{\\s*name:\\s*['"]${name}['"]`).test(block);
}

function processFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const out = [];
  let changed = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const routeMatch = line.match(ROUTE_DECORATOR);

    if (!routeMatch) {
      out.push(line);
      i++;
      continue;
    }

    const routePath = routeMatch[2];
    const paramNames = extractPathParams(routePath);
    out.push(line);
    i++;

    if (paramNames.length === 0) continue;

    const blockStart = out.length;
    while (
      i < lines.length &&
      !/^\s+(async\s+)?[a-zA-Z_][\w]*\s*\(/.test(lines[i])
    ) {
      out.push(lines[i]);
      i++;
    }

    const block = out.slice(blockStart).join('\n');
    const missing = paramNames.filter((name) => !hasApiParam(block, name));

    if (missing.length > 0) {
      for (const name of missing) {
        out.push(
          `  @ApiParam({ name: '${name}', description: '${describeParam(name)}' })`,
        );
        changed = true;
      }
    }

    if (i < lines.length) {
      out.push(lines[i]);
      i++;
    }
  }

  if (!changed) return false;

  let source = out.join('\n');
  source = ensureSwaggerImport(source);
  fs.writeFileSync(filePath, source);
  return true;
}

function walkControllers(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkControllers(full));
    else if (entry.name.endsWith('.controller.ts')) files.push(full);
  }
  return files;
}

let updated = 0;
for (const file of walkControllers(gatewayModules)) {
  if (processFile(file)) {
    updated++;
    console.log('updated', path.relative(root, file));
  }
}

console.log(`Done. Updated ${updated} gateway controller(s).`);
