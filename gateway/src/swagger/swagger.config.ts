/**
 * Swagger configuration for Gateway - microservice docs dropdown
 */
export interface SwaggerServiceSpec {
  name: string;
  serviceKey: string;
  docsJsonPath: string;
}

/**
 * Maps each microservice to its OpenAPI docs-json path.
 * Paths are relative to the service base URL.
 */
/**
 * All microservices expose OpenAPI JSON at /docs-json (SwaggerModule.setup('docs', ...)).
 */
export const SWAGGER_SERVICE_SPECS: SwaggerServiceSpec[] = [
  { name: 'Auth', serviceKey: 'auth', docsJsonPath: '/docs-json' },
  { name: 'Users', serviceKey: 'users', docsJsonPath: '/docs-json' },
  { name: 'Payments', serviceKey: 'payments', docsJsonPath: '/docs-json' },
  { name: 'Webhooks', serviceKey: 'webhooks', docsJsonPath: '/docs-json' },
  { name: 'Admin', serviceKey: 'admin', docsJsonPath: '/docs-json' },
  { name: 'Requests', serviceKey: 'requests', docsJsonPath: '/docs-json' },
  { name: 'Quotes', serviceKey: 'quotes', docsJsonPath: '/docs-json' },
  { name: 'Projects', serviceKey: 'projects', docsJsonPath: '/docs-json' },
  { name: 'Progress', serviceKey: 'progress', docsJsonPath: '/docs-json' },
  { name: 'Messaging', serviceKey: 'messaging', docsJsonPath: '/docs-json' },
  { name: 'Notifications', serviceKey: 'notifications', docsJsonPath: '/docs-json' },
  { name: 'Media', serviceKey: 'media', docsJsonPath: '/docs-json' },
  { name: 'Portfolio', serviceKey: 'portfolio', docsJsonPath: '/docs-json' },
  { name: 'Blog', serviceKey: 'blog', docsJsonPath: '/docs-json' },
  { name: 'Contact', serviceKey: 'contact', docsJsonPath: '/docs-json' },
  { name: 'Health', serviceKey: 'health', docsJsonPath: '/docs-json' },
];

export function getSwaggerDocsUrl(serviceKey: string, gatewayBase: string): string {
  return `${gatewayBase}/docs-specs/${serviceKey}`;
}

export function getServiceSpecsForSwaggerUi(
  gatewayBase: string,
): Array<{ url: string; name: string }> {
  const microservices = SWAGGER_SERVICE_SPECS.map((spec) => ({
    name: spec.name,
    url: getSwaggerDocsUrl(spec.serviceKey, gatewayBase),
  }));
  // Gateway-only spec (health, docs-specs) at /docs-gateway-json – excludes proxy routes
  return [{ name: 'Gateway', url: '/docs-gateway-json' }, ...microservices];
}
