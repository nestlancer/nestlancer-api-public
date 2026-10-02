import type { NextFunction, Request, Response } from 'express';

import {
  publicCacheControlFor,
  publicHttpCacheMiddleware,
  requestPathForCache,
} from '../../../src/middleware/public-http-cache.middleware';

describe('publicCacheControlFor', () => {
  it('marks public catalog GETs as cacheable', () => {
    expect(publicCacheControlFor('/api/v1/portfolio')).toMatch(/s-maxage=300/);
    expect(publicCacheControlFor('/api/v1/portfolio/featured')).toBeDefined();
    expect(publicCacheControlFor('/api/v1/portfolio/acme-case')).toBeDefined();
    expect(publicCacheControlFor('/api/v1/portfolio/tags')).toBeDefined();
    expect(publicCacheControlFor('/api/v1/services')).toBeDefined();
    expect(publicCacheControlFor('/api/v1/blog/posts')).toBeDefined();
    expect(publicCacheControlFor('/api/v1/blog/posts/hello-world')).toBeDefined();
    expect(publicCacheControlFor('/api/v1/blog/feed/rss')).toBeDefined();
    expect(publicCacheControlFor('/api/v1/projects/public')).toBeDefined();
  });

  it('does not cache authenticated or mutating surfaces', () => {
    expect(publicCacheControlFor('/api/v1/auth/login')).toBeUndefined();
    expect(publicCacheControlFor('/api/v1/documents/verify/NL-INV-2026-000001')).toBeUndefined();
    expect(publicCacheControlFor('/api/v1/blog/posts/hello/view')).toBeUndefined();
    expect(publicCacheControlFor('/api/v1/portfolio/acme-case/like')).toBeUndefined();
    expect(publicCacheControlFor('/api/v1/admin/users')).toBeUndefined();
  });
});

describe('requestPathForCache', () => {
  it('prefers originalUrl so Nest global-prefix stripping still matches', () => {
    expect(
      requestPathForCache({
        originalUrl: '/api/v1/portfolio?page=1',
        baseUrl: '/api/v1',
        path: '/portfolio',
        url: '/portfolio?page=1',
      }),
    ).toBe('/api/v1/portfolio');
  });
});

describe('publicHttpCacheMiddleware', () => {
  function mockRes() {
    const headers: Record<string, string> = {};
    let headersSent = false;
    const res = {
      statusCode: 200,
      get headersSent() {
        return headersSent;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      setHeader(name: string, value: string) {
        if (headersSent) {
          throw new Error(`Cannot setHeader(${name}) after headersSent`);
        }
        headers[name.toLowerCase()] = value;
      },
      writeHead(statusCode: number) {
        headersSent = true;
        this.statusCode = statusCode;
        return this;
      },
      end() {
        headersSent = true;
        return this;
      },
    };
    return { res: res as unknown as Response, headers };
  }

  it('sets Cache-Control on writeHead before headers are sent (Nest res.json path)', () => {
    const { res, headers } = mockRes();
    const req = {
      method: 'GET',
      path: '/portfolio',
      originalUrl: '/api/v1/portfolio',
      baseUrl: '/api/v1',
      headers: {},
    } as unknown as Request;
    const next = jest.fn() as NextFunction;

    publicHttpCacheMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    (res.writeHead as (status: number) => Response)(200);
    expect(headers['cache-control']).toMatch(/s-maxage=300/);
    expect(headers['vary']).toBe('Accept-Encoding');
  });

  it('does not set public cache when Authorization is present', () => {
    const { res, headers } = mockRes();
    const req = {
      method: 'GET',
      path: '/api/v1/portfolio',
      headers: { authorization: 'Bearer x' },
    } as unknown as Request;

    publicHttpCacheMiddleware(req, res, jest.fn() as NextFunction);
    (res.writeHead as (status: number) => Response)(200);
    expect(headers['cache-control']).toBeUndefined();
  });
});
