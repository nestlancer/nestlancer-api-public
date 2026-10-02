import { mergeOpenApiSpecs } from '../../../src/swagger/merge-openapi';

describe('mergeOpenApiSpecs', () => {
  it('merges paths and prefixes duplicate operationIds', () => {
    const { document: merged } = mergeOpenApiSpecs([
      {
        name: 'Auth',
        serviceKey: 'auth',
        document: {
          paths: {
            '/api/v1/auth/login': {
              post: { operationId: 'login', tags: ['auth'], responses: { '200': {} } },
            },
          },
          components: { schemas: { LoginDto: { type: 'object' } } },
        },
      },
      {
        name: 'Users',
        serviceKey: 'users',
        document: {
          paths: {
            '/api/v1/users/profile': {
              get: { operationId: 'getProfile', tags: ['users'], responses: { '200': {} } },
            },
          },
          components: { schemas: { UserDto: { type: 'object' } } },
        },
      },
    ]);

    expect(merged.paths).toHaveProperty('/api/v1/auth/login');
    expect(merged.paths).toHaveProperty('/api/v1/users/profile');
    expect(merged.paths!['/api/v1/auth/login'].post?.operationId).toBe('auth_login');
    expect(merged.components?.schemas).toHaveProperty('LoginDto');
    expect(merged.components?.schemas).toHaveProperty('UserDto');
  });

  it('namespaces conflicting component schema keys', () => {
    const { document: merged } = mergeOpenApiSpecs([
      {
        name: 'A',
        serviceKey: 'a',
        document: {
          paths: {},
          components: { schemas: { Item: { type: 'object', title: 'A' } } },
        },
      },
      {
        name: 'B',
        serviceKey: 'b',
        document: {
          paths: {
            '/items': {
              get: {
                operationId: 'list',
                responses: {
                  '200': {
                    content: {
                      'application/json': {
                        schema: { $ref: '#/components/schemas/Item' },
                      },
                    },
                  },
                },
              },
            },
          },
          components: { schemas: { Item: { type: 'object', title: 'B' } } },
        },
      },
    ]);

    expect(merged.components?.schemas?.Item).toEqual({ type: 'object', title: 'A' });
    expect(merged.components?.schemas?.b_Item).toEqual({ type: 'object', title: 'B' });
    const ref =
      merged.paths?.['/items']?.get?.responses?.['200']?.content?.['application/json']?.schema
        ?.$ref;
    expect(ref).toBe('#/components/schemas/b_Item');
  });

  it('records duplicate paths instead of silently dropping without trace', () => {
    const { document: merged, duplicatePaths } = mergeOpenApiSpecs([
      {
        name: 'First',
        serviceKey: 'first',
        document: {
          paths: {
            '/api/v1/shared': { get: { operationId: 'first', responses: { '200': {} } } },
          },
        },
      },
      {
        name: 'Second',
        serviceKey: 'second',
        document: {
          paths: {
            '/api/v1/shared': { get: { operationId: 'second', responses: { '200': {} } } },
          },
        },
      },
    ]);

    expect(merged.paths?.['/api/v1/shared']?.get?.operationId).toBe('first_first');
    expect(duplicatePaths).toEqual([
      {
        path: '/api/v1/shared',
        method: 'get',
        keptFrom: 'First',
        skippedFrom: 'Second',
      },
    ]);
  });

  it('merges different HTTP methods on the same path from multiple services', () => {
    const { document: merged, duplicatePaths } = mergeOpenApiSpecs([
      {
        name: 'Notifications',
        serviceKey: 'notifications',
        document: {
          paths: {
            '/api/v1/health': { get: { operationId: 'health', responses: { '200': {} } } },
          },
        },
      },
      {
        name: 'Health',
        serviceKey: 'health',
        document: {
          paths: {
            '/api/v1/health/live': { get: { operationId: 'live', responses: { '200': {} } } },
          },
        },
      },
    ]);

    expect(merged.paths?.['/api/v1/health']?.get?.operationId).toBe('notifications_health');
    expect(merged.paths?.['/api/v1/health/live']?.get?.operationId).toBe('health_live');
    expect(duplicatePaths).toHaveLength(0);
  });

  it('omits admin microservice internal paths when gateway documents /api/v1/admin/*', () => {
    const { document: merged } = mergeOpenApiSpecs([
      {
        name: 'Gateway',
        serviceKey: 'gateway',
        document: {
          paths: {
            '/api/v1/admin/dashboard/overview': {
              get: { operationId: 'overview', responses: { '200': {} } },
            },
          },
        },
      },
      {
        name: 'Admin',
        serviceKey: 'admin',
        document: {
          paths: {
            '/api/dashboard/overview': {
              get: { operationId: 'internalOverview', responses: { '200': {} } },
            },
            '/api/system/config': {
              get: { operationId: 'config', responses: { '200': {} } },
            },
          },
        },
      },
    ]);

    expect(merged.paths).toHaveProperty('/api/v1/admin/dashboard/overview');
    expect(merged.paths).not.toHaveProperty('/api/dashboard/overview');
    expect(merged.paths).not.toHaveProperty('/api/system/config');
  });

  it('omits microservice blog public paths when gateway documents canonical /blog/* URLs', () => {
    const { document: merged } = mergeOpenApiSpecs([
      {
        name: 'Gateway',
        serviceKey: 'gateway',
        document: {
          paths: {
            '/api/v1/blog/posts': { get: { operationId: 'listPosts', responses: { '200': {} } } },
          },
        },
      },
      {
        name: 'Blog',
        serviceKey: 'blog',
        document: {
          paths: {
            '/api/v1/posts': {
              get: { operationId: 'listPostsInternal', responses: { '200': {} } },
            },
            '/api/v1/admin/posts': {
              get: { operationId: 'adminList', responses: { '200': {} } },
            },
          },
        },
      },
    ]);

    expect(merged.paths).toHaveProperty('/api/v1/blog/posts');
    expect(merged.paths).not.toHaveProperty('/api/v1/posts');
    expect(merged.paths).toHaveProperty('/api/v1/admin/posts');
  });

  it('omits progress microservice admin paths when gateway documents /api/v1/admin/*', () => {
    const { document: merged } = mergeOpenApiSpecs([
      {
        name: 'Gateway',
        serviceKey: 'gateway',
        document: {
          paths: {
            '/api/v1/admin/milestones/{milestoneId}': {
              patch: { operationId: 'updateMilestone', tags: ['admin'], responses: { '200': {} } },
            },
          },
        },
      },
      {
        name: 'Progress',
        serviceKey: 'progress',
        document: {
          paths: {
            '/api/v1/admin/milestones/{id}': {
              patch: { operationId: 'internalUpdate', tags: ['admin'], responses: { '200': {} } },
            },
          },
        },
      },
    ]);

    expect(merged.paths).toHaveProperty('/api/v1/admin/milestones/{milestoneId}');
    expect(merged.paths).not.toHaveProperty('/api/v1/admin/milestones/{id}');
  });

  it('omits portfolio microservice admin paths that clash with gateway param names', () => {
    const { document: merged } = mergeOpenApiSpecs([
      {
        name: 'Gateway',
        serviceKey: 'gateway',
        document: {
          paths: {
            '/api/v1/admin/portfolio/analytics/{itemId}': {
              get: { operationId: 'itemAnalytics', tags: ['admin'], responses: { '200': {} } },
            },
            '/api/v1/admin/portfolio/categories/{categoryId}': {
              patch: { operationId: 'updateCategory', tags: ['admin'], responses: { '200': {} } },
            },
          },
        },
      },
      {
        name: 'Portfolio',
        serviceKey: 'portfolio',
        document: {
          paths: {
            '/api/v1/admin/portfolio/analytics/{id}': {
              get: { operationId: 'svcItemAnalytics', tags: ['admin'], responses: { '200': {} } },
            },
            '/api/v1/admin/portfolio/categories/{id}': {
              patch: { operationId: 'svcUpdateCategory', tags: ['admin'], responses: { '200': {} } },
            },
            '/api/v1/portfolio': {
              get: { operationId: 'listPublic', tags: ['portfolio'], responses: { '200': {} } },
            },
          },
        },
      },
    ]);

    expect(merged.paths).toHaveProperty('/api/v1/admin/portfolio/analytics/{itemId}');
    expect(merged.paths).toHaveProperty('/api/v1/admin/portfolio/categories/{categoryId}');
    expect(merged.paths).not.toHaveProperty('/api/v1/admin/portfolio/analytics/{id}');
    expect(merged.paths).not.toHaveProperty('/api/v1/admin/portfolio/categories/{id}');
    expect(merged.paths).toHaveProperty('/api/v1/portfolio');
  });

  it('prefers microservice operation details when gateway proxy stub duplicates the same path', () => {
    const { document: merged, duplicatePaths } = mergeOpenApiSpecs([
      {
        name: 'Auth',
        serviceKey: 'auth',
        document: {
          paths: {
            '/api/v1/auth/login': {
              post: {
                operationId: 'login',
                tags: ['auth'],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/LoginDto' },
                    },
                  },
                },
                responses: { '200': { description: 'OK' } },
              },
            },
          },
          components: { schemas: { LoginDto: { type: 'object' } } },
        },
      },
      {
        name: 'Gateway',
        serviceKey: 'gateway',
        document: {
          paths: {
            '/api/v1/auth/login': {
              post: {
                operationId: 'gateway_AuthController_login',
                tags: ['auth'],
                responses: { '200': { description: 'Standard success envelope' } },
              },
            },
          },
        },
      },
    ]);

    const login = merged.paths?.['/api/v1/auth/login']?.post as Record<string, unknown>;
    expect(login?.requestBody).toBeDefined();
    expect(login?.operationId).toBe('auth_login');
    expect(duplicatePaths).toEqual([
      {
        path: '/api/v1/auth/login',
        method: 'post',
        keptFrom: 'Auth',
        skippedFrom: 'Gateway',
      },
    ]);
  });

  it('collects global tags from operation tags', () => {
    const { document: merged } = mergeOpenApiSpecs([
      {
        name: 'Auth',
        serviceKey: 'auth',
        document: {
          paths: {
            '/api/v1/auth/login': {
              post: { operationId: 'login', tags: ['auth'], responses: { '200': {} } },
            },
          },
        },
      },
    ]);

    expect(merged.tags).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'auth' })]),
    );
  });
});
