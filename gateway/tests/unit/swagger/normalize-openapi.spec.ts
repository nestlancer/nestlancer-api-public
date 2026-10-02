import { normalizeOpenApiDocument } from '../../../src/swagger/normalize-openapi';
import type { OpenApiDocument } from '../../../src/swagger/merge-openapi';

describe('normalizeOpenApiDocument', () => {
  it('strips regex delimiters from pattern strings', () => {
    const doc: OpenApiDocument = {
      components: {
        schemas: {
          RegisterDto: {
            type: 'object',
            properties: {
              password: {
                type: 'string',
                pattern: '/((?=.*\\d)|(?=.*\\W+))(?![.\\n])(?=.*[A-Z])(?=.*[a-z]).*$/',
                example: 'SecureP@ss123',
              },
            },
          },
        },
      },
    };

    normalizeOpenApiDocument(doc);
    expect(doc.components!.schemas!.RegisterDto).toMatchObject({
      properties: {
        password: {
          pattern: '((?=.*\\d)|(?=.*\\W+))(?![.\\n])(?=.*[A-Z])(?=.*[a-z]).*$',
        },
      },
    });
  });

  it('canonicalizes microservice tags to gateway tag names', () => {
    const doc: OpenApiDocument = {
      paths: {
        '/api/v1/auth/login': {
          post: { operationId: 'login', tags: ['Authentication'], responses: { '200': {} } },
        },
        '/api/v1/admin/users': {
          get: { operationId: 'list', tags: ['Admin/Users'], responses: { '200': {} } },
        },
      },
    };

    normalizeOpenApiDocument(doc);
    expect(doc.paths!['/api/v1/auth/login'].post?.tags).toEqual(['auth']);
    expect(doc.paths!['/api/v1/admin/users'].get?.tags).toEqual(['admin']);
  });

  it('removes invalid boolean required on nested properties', () => {
    const doc: OpenApiDocument = {
      components: {
        schemas: {
          SegmentCriteriaDto: {
            type: 'object',
            properties: {
              dateRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', required: false },
                  end: { type: 'string', required: false },
                },
              },
            },
          },
        },
      },
    };

    normalizeOpenApiDocument(doc);
    const start = (doc.components!.schemas!.SegmentCriteriaDto as Record<string, unknown>)
      .properties as Record<string, unknown>;
    const dateRange = (start.dateRange as Record<string, unknown>).properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(dateRange.start.required).toBeUndefined();
    expect(dateRange.end.required).toBeUndefined();
  });

  it('copies summary to description when description is missing', () => {
    const doc: OpenApiDocument = {
      paths: {
        '/api/v1/health': {
          get: { summary: 'Health check', responses: { '200': {} } },
        },
      },
    };

    normalizeOpenApiDocument(doc);
    expect(doc.paths!['/api/v1/health'].get?.description).toBe('Health check');
  });
});
