import type { OpenApiDocument } from './merge-openapi';

/**
 * Normalizes merged OpenAPI for codegen and Spectral:
 * - Strips `/…/` delimiters from class-validator `@Matches` patterns
 * - Removes invalid boolean `required` on property schemas (inline object bug)
 */
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

/** Map microservice Swagger tags to gateway-canonical tags for Orval `filters.tags`. */
const GATEWAY_TAG_ALIASES: Record<string, string> = {
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

function canonicalizeTag(tag: string): string {
  const mapped = GATEWAY_TAG_ALIASES[tag];
  if (mapped) return mapped;
  if (tag.startsWith('Admin/')) return 'admin';
  return tag;
}

/** Align operation tags with gateway `@ApiTags()` names after microservice-first merge. */
function canonicalizeOperationTags(doc: OpenApiDocument): void {
  for (const pathItem of Object.values(doc.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) continue;

      const op = operation as { tags?: string[] };
      if (!Array.isArray(op.tags)) continue;
      op.tags = [...new Set(op.tags.map(canonicalizeTag))];
    }
  }
}

export function normalizeOpenApiDocument(doc: OpenApiDocument): OpenApiDocument {
  walkNode(doc);
  canonicalizeOperationTags(doc);
  ensureOperationDescriptions(doc);
  return doc;
}

/** Uses `summary` as `description` when missing (clears Spectral `operation-description` warnings). */
function ensureOperationDescriptions(doc: OpenApiDocument): void {
  for (const pathItem of Object.values(doc.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) continue;

      const op = operation as Record<string, unknown>;
      if (!op.description && typeof op.summary === 'string' && op.summary.length > 0) {
        op.description = op.summary;
      }
    }
  }
}

function normalizeRegexPattern(pattern: string): string {
  if (!pattern.startsWith('/') || pattern.length < 2) return pattern;
  const lastSlash = pattern.lastIndexOf('/');
  if (lastSlash <= 0) return pattern;
  const flags = pattern.slice(lastSlash + 1);
  if (/^[gimsuy]*$/.test(flags)) {
    return pattern.slice(1, lastSlash);
  }
  return pattern;
}

function walkNode(node: unknown): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) walkNode(item);
    return;
  }

  const record = node as Record<string, unknown>;

  if (typeof record.pattern === 'string') {
    record.pattern = normalizeRegexPattern(record.pattern);
  }

  if (record.properties && typeof record.properties === 'object') {
    for (const prop of Object.values(record.properties as Record<string, unknown>)) {
      if (
        prop &&
        typeof prop === 'object' &&
        'required' in prop &&
        typeof prop.required === 'boolean'
      ) {
        delete (prop as Record<string, unknown>).required;
      }
    }
  }

  for (const value of Object.values(record)) {
    walkNode(value);
  }
}
