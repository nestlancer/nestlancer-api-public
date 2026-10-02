#!/usr/bin/env node
/**
 * Post-process a merged OpenAPI JSON file (same rules as gateway normalize-openapi.ts).
 * Used when exporting via curl so committed mirrors match Spectral expectations.
 */
import fs from 'node:fs';
import path from 'node:path';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

const GATEWAY_TAG_ALIASES = {
  Authentication: 'auth',
  Users: 'users',
  Projects: 'projects',
  Requests: 'requests',
  Quotes: 'quotes',
  Payments: 'payments',
  Notifications: 'notifications',
  Messages: 'messages',
  Media: 'media',
  Portfolio: 'portfolio',
  Contact: 'contact',
  Progress: 'progress',
};

function canonicalizeTag(tag) {
  if (GATEWAY_TAG_ALIASES[tag]) return GATEWAY_TAG_ALIASES[tag];
  if (tag.startsWith('Admin/')) return 'admin';
  return tag;
}

function canonicalizeOperationTags(spec) {
  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation?.tags) continue;
      operation.tags = [...new Set(operation.tags.map(canonicalizeTag))];
    }
  }
}

function normalizeRegexPattern(pattern) {
  if (typeof pattern !== 'string' || !pattern.startsWith('/') || pattern.length < 2) {
    return pattern;
  }
  const lastSlash = pattern.lastIndexOf('/');
  if (lastSlash <= 0) return pattern;
  const flags = pattern.slice(lastSlash + 1);
  if (/^[gimsuy]*$/.test(flags)) {
    return pattern.slice(1, lastSlash);
  }
  return pattern;
}

function walkNode(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walkNode(item);
    return;
  }
  if (typeof node.pattern === 'string') {
    node.pattern = normalizeRegexPattern(node.pattern);
  }
  // Orval / OpenAPI 3 require every array schema to declare `items`.
  if (node.type === 'array' && node.items == null) {
    node.items = { type: 'object', additionalProperties: true };
  }
  if (node.properties && typeof node.properties === 'object') {
    for (const prop of Object.values(node.properties)) {
      if (prop && typeof prop === 'object' && 'required' in prop && typeof prop.required === 'boolean') {
        delete prop.required;
      }
    }
  }
  for (const value of Object.values(node)) {
    walkNode(value);
  }
}

function ensureOperationDescriptions(spec) {
  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') continue;
      if (!operation.description && typeof operation.summary === 'string' && operation.summary.length > 0) {
        operation.description = operation.summary;
      }
    }
  }
}

function fixNotificationTemplateChannelExamples(spec) {
  for (const schemaName of ['CreateNotificationTemplateDto', 'UpdateNotificationTemplateDto']) {
    const channels = spec.components?.schemas?.[schemaName]?.properties?.channels;
    if (!channels || channels.type !== 'object') continue;
    if (Array.isArray(channels.example)) {
      channels.example = { IN_APP: true };
    }
  }
}

function collectGlobalTags(spec) {
  const tagDescriptions = new Map();
  for (const tag of spec.tags ?? []) {
    tagDescriptions.set(tag.name, tag.description ?? `${tag.name} API`);
  }
  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation?.tags) continue;
      for (const name of operation.tags) {
        if (!tagDescriptions.has(name)) tagDescriptions.set(name, `${name} API`);
      }
    }
  }
  if (tagDescriptions.size === 0) return;
  spec.tags = [...tagDescriptions.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, description]) => ({ name, description }));
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node normalize-openapi-document.mjs <openapi.json>');
  process.exit(1);
}

const abs = path.resolve(file);
const spec = JSON.parse(fs.readFileSync(abs, 'utf8'));
walkNode(spec);
fixNotificationTemplateChannelExamples(spec);
canonicalizeOperationTags(spec);
ensureOperationDescriptions(spec);
collectGlobalTags(spec);
if (!spec.info?.contact) {
  spec.info = {
    ...spec.info,
    contact: { name: 'Nestlancer API Support', url: 'https://nestlancer.com' },
  };
}
fs.writeFileSync(abs, `${JSON.stringify(spec)}\n`);
console.log(`Normalized ${abs}`);
