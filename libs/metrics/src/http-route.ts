/**
 * Low-cardinality route label. Prefer the matched route template, otherwise
 * collapse UUIDs and numeric ids so Prometheus series do not explode.
 */
export function httpRouteLabel(req: {
  route?: { path?: string };
  path?: string;
  url?: string;
  baseUrl?: string;
}): string {
  const template = req.route?.path;
  const base = typeof req.baseUrl === 'string' ? req.baseUrl : '';
  const raw =
    (template ? `${base}${template}` : '') ||
    (typeof req.path === 'string' ? req.path : '') ||
    (typeof req.url === 'string' ? req.url : '') ||
    'unknown';
  const path = raw.split('?')[0] || 'unknown';
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:n')
    .slice(0, 120);
}
