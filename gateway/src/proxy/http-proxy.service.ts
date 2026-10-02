import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

import { AxiosError, AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { firstValueFrom, catchError } from 'rxjs';

import { getClientIp } from '@nestlancer/common';

import { getServiceConfig, isServiceRegistered } from './service-registry';

/**
 * HTTP Proxy Service
 * Forwards requests from the Gateway to downstream microservices
 */
@Injectable()
export class HttpProxyService {
  private readonly logger = new Logger(HttpProxyService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Forward a request to a downstream service
   * @param serviceName - Target service name (e.g., 'auth', 'users')
   * @param req - Express request object
   * @param res - Express response object (optional, for streaming)
   * @param pathOverride - Override the request path (optional)
   * @returns Promise with response data
   */
  async forward(
    serviceName: string,
    req: Request,
    res?: Response,
    pathOverride?: string,
  ): Promise<unknown> {
    // Validate service exists
    if (!isServiceRegistered(serviceName)) {
      this.logger.error(`Service '${serviceName}' is not registered`);
      throw new HttpException(
        {
          status: 'error',
          error: {
            code: 'GATEWAY_001',
            message: `Unknown service: ${serviceName}`,
          },
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const serviceConfig = getServiceConfig(serviceName)!;
    const targetPath = pathOverride || this.extractServicePath(serviceName, req.path);
    const targetUrl = `${serviceConfig.url}${targetPath}`;

    this.logger.debug(`Proxying ${req.method} ${req.path} → ${targetUrl}`);

    const timeout = this.resolveProxyTimeout(serviceName, targetPath, serviceConfig.timeout);
    const config = this.buildForwardConfig(
      req,
      targetUrl,
      timeout,
      res ? 'stream' : 'json',
    );

    try {
      const response$ = this.httpService.request(config).pipe(
        catchError((error: AxiosError) => {
          this.handleProxyError(error, serviceName);
          throw error;
        }),
      );

      const response = await firstValueFrom(response$);

      if (response.status >= 400) {
        throw new HttpException(response.data as string | Record<string, unknown>, response.status);
      }

      // If response object provided, stream the response
      if (res) {
        res.status(response.status);

        // Forward response headers
        const headersToForward = [
          'content-type',
          'cache-control',
          'x-request-id',
          'x-correlation-id',
          'x-api-version',
        ];
        headersToForward.forEach((header) => {
          if (response.headers[header]) {
            res.setHeader(header, response.headers[header] as string);
          }
        });

        if (response.data && typeof response.data.pipe === 'function') {
          response.data.pipe(res);
        } else {
          res.json(response.data);
        }
        return;
      }

      // Return data directly
      return response.data;
    } catch (error: any) {
      // If already an HttpException (from catchError above), re-throw directly
      if (error instanceof HttpException) {
        throw error;
      }
      return this.handleProxyError(error as AxiosError, serviceName);
    }
  }

  /**
   * Forward a request and return the raw Axios response
   * Useful when you need full response control
   */
  async forwardRaw(
    serviceName: string,
    req: Request,
    pathOverride?: string,
  ): Promise<{ data: unknown; status: number; headers: Record<string, unknown> }> {
    if (!isServiceRegistered(serviceName)) {
      throw new HttpException(
        {
          status: 'error',
          error: {
            code: 'GATEWAY_001',
            message: `Unknown service: ${serviceName}`,
          },
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const serviceConfig = getServiceConfig(serviceName)!;
    const targetPath = pathOverride || this.extractServicePath(serviceName, req.path);
    const targetUrl = `${serviceConfig.url}${targetPath}`;

    const timeout = this.resolveProxyTimeout(serviceName, targetPath, serviceConfig.timeout);
    const config = this.buildForwardConfig(req, targetUrl, timeout);

    try {
      const response = await firstValueFrom(this.httpService.request(config));
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, unknown>,
      };
    } catch (error: any) {
      this.handleProxyError(error as AxiosError, serviceName);
      throw error;
    }
  }

  /**
   * Make a direct HTTP request to a service (for internal use)
   */
  async request(
    serviceName: string,
    method: string,
    path: string,
    data?: unknown,
    headers?: Record<string, string>,
    timeoutOverrideMs?: number,
  ): Promise<unknown> {
    if (!isServiceRegistered(serviceName)) {
      throw new HttpException(
        {
          status: 'error',
          error: {
            code: 'GATEWAY_001',
            message: `Unknown service: ${serviceName}`,
          },
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const serviceConfig = getServiceConfig(serviceName)!;
    const targetUrl = `${serviceConfig.url}${path}`;
    const timeout = timeoutOverrideMs ?? serviceConfig.timeout;

    const config: AxiosRequestConfig = {
      method: method as string,
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      data,
      timeout,
      validateStatus: () => true,
    };

    try {
      const response = await firstValueFrom(this.httpService.request(config));

      if (response.status >= 400) {
        throw new HttpException(response.data, response.status);
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.handleProxyError(error as AxiosError, serviceName);
      throw error;
    }
  }

  private isMultipartRequest(req: Request): boolean {
    const contentType = req.headers['content-type'];
    return (
      typeof contentType === 'string' && contentType.toLowerCase().includes('multipart/form-data')
    );
  }

  private isWebhookRequest(req: Request): boolean {
    return (req.path ?? '').includes('/webhooks/');
  }

  private buildForwardData(req: Request): AxiosRequestConfig['data'] {
    if (this.isWebhookRequest(req)) {
      const rawBody = (req as RawBodyRequest<Request>).rawBody;
      if (rawBody && Buffer.isBuffer(rawBody) && rawBody.length > 0) {
        return rawBody;
      }
      if (req.body !== undefined && req.body !== null) {
        return Buffer.from(JSON.stringify(req.body));
      }
    }
    if (this.isMultipartRequest(req)) {
      return req;
    }
    // POST/PUT/PATCH with no body must forward {} — otherwise axios omits Content-Type
    // and downstream JSON parsers can reject the proxied request.
    if (
      this.isBodyLessMutation(req) &&
      (req.body === undefined ||
        req.body === null ||
        (typeof req.body === 'object' &&
          !Buffer.isBuffer(req.body) &&
          Object.keys(req.body as object).length === 0))
    ) {
      return {};
    }
    return req.body;
  }

  private isBodyLessMutation(req: Request): boolean {
    return ['POST', 'PUT', 'PATCH'].includes((req.method ?? '').toUpperCase());
  }

  /** PDF/contract generation can exceed default microservice timeouts on cold start. */
  private resolveProxyTimeout(serviceName: string, targetPath: string, defaultTimeout: number): number {
    const path = targetPath.toLowerCase();
    const isDocumentRoute =
      /\/pdf(?:\?|$|\/)/.test(path) ||
      path.endsWith('/pdf') ||
      path.includes('/contract/preview') ||
      path.includes('/contract/download') ||
      path.includes('/invoice') ||
      path.includes('/receipt');
    if (isDocumentRoute) {
      return Number(process.env.PROXY_DOCUMENT_TIMEOUT_MS || 60_000);
    }
    if (serviceName === 'quotes' && path.includes('/contract')) {
      return Number(process.env.PROXY_DOCUMENT_TIMEOUT_MS || 60_000);
    }
    return defaultTimeout;
  }

  private buildForwardConfig(
    req: Request,
    targetUrl: string,
    timeout: number,
    responseType: AxiosRequestConfig['responseType'] = 'json',
  ): AxiosRequestConfig {
    const multipart = this.isMultipartRequest(req);
    const data = this.buildForwardData(req);
    const headers = this.prepareHeaders(req);
    if (
      !multipart &&
      data !== undefined &&
      data !== null &&
      typeof data === 'object' &&
      !Buffer.isBuffer(data) &&
      !headers['content-type']
    ) {
      headers['content-type'] = 'application/json';
    }
    // Let axios compute Content-Length from `data` (avoids 0-length mismatch on body-less POST).
    if (!multipart) {
      delete headers['content-length'];
    }
    return {
      method: req.method as string,
      url: targetUrl,
      headers,
      data,
      params: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
      timeout,
      responseType,
      validateStatus: () => true,
      ...(multipart && {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }),
    };
  }

  /**
   * Extract the service-specific path from the request.
   * Ensures the downstream service receives the path it expects.
   *
   * Service prefix reference (all resolve to /api/v1/... unless noted):
   *  - auth:          prefix api/v1/auth  + @Controller()  → forward as-is
   *  - users:         prefix api/v1       + @Controller('users') → forward as-is
   *  - requests:      prefix api/v1       + @Controller('requests') → forward as-is
   *  - quotes:        prefix api/v1       + @Controller('quotes') → forward as-is
   *  - projects:      prefix api/v1       + @Controller('projects') → forward as-is
   *  - payments:      prefix api + v1 URI + @Controller('payments') → forward as-is
   *  - media:         prefix api/v1       + @Controller('media') → forward as-is
   *  - messaging:     prefix api + v1 URI + @Controller('messages') → forward as-is
   *  - notifications: prefix api/v1       + @Controller('notifications') → forward as-is
   *  - portfolio:     prefix api + v1 URI + @Controller('portfolio') → forward as-is
   *  - blog:          prefix api + v1 URI + @Controller('posts'|'categories'|'tags') → strip 'blog'
   *  - contact:       prefix api/v1       + @Controller('contact') → forward as-is
   *  - progress:      prefix api + v1 URI + @Controller('projects/:projectId/progress') → forward as-is
   *  - admin:         prefix api (no v1)  + various controllers → adjust /api/v1 to /api
   *  - webhooks:      prefix api/v1/webhooks + @Controller(...) → forward as-is
   *  - health:        prefix api/v1/health   + @Controller() → uses pathOverride
   */
  private extractServicePath(serviceName: string, originalPath: string): string {
    const gatewayPrefix = '/api/v1';

    if (!originalPath.startsWith(gatewayPrefix)) {
      return originalPath;
    }

    // Blog service: public routes use /posts, /categories, etc. (no /blog segment).
    // Gateway path /api/v1/blog/posts/hello → service expects /api/v1/posts/hello
    // Admin routes keep /admin/blog/* (e.g. /admin/blog/analytics, /admin/blog/tags).
    if (serviceName === 'blog') {
      const publicBlogPrefix = `${gatewayPrefix}/blog/`;
      if (originalPath.startsWith(publicBlogPrefix)) {
        return originalPath.replace(`${gatewayPrefix}/blog`, gatewayPrefix);
      }
      return originalPath;
    }

    // Progress service: @Controller('projects/:projectId/progress')
    // Gateway path: /api/v1/progress/projects/:projectId/...
    // Service expects: /api/v1/projects/:projectId/progress/...
    //
    // Pattern:  /api/v1/progress/projects/:id[/rest]
    //        → /api/v1/projects/:id/progress[/rest]
    if (serviceName === 'progress') {
      const progressMatch = originalPath.match(/^\/api\/v1\/progress\/projects\/([^/]+)(\/.*)?$/);
      if (progressMatch) {
        const projectId = progressMatch[1];
        const rest = progressMatch[2] ?? '';
        return `/api/v1/projects/${projectId}/progress${rest}`;
      }
      // /api/v1/progress/milestones  → /api/v1/milestones
      // /api/v1/progress/deliverables → /api/v1/deliverables
      return originalPath.replace(/^\/api\/v1\/progress/, '/api/v1');
    }

    // Admin service: global prefix `api`; controllers are /api/dashboard, /api/webhooks, etc.
    // Gateway path /api/v1/admin/dashboard/overview → /api/dashboard/overview
    if (serviceName === 'admin') {
      return originalPath.replace('/api/v1/admin', '/api');
    }

    // All other services: their controller path includes their service name,
    // and they all resolve to /api/v1/[service-name]/...
    // Forward the gateway path exactly as-is.
    return originalPath;
  }

  /**
   * Prepare headers for forwarding to downstream service
   */
  private prepareHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    // Headers to forward from the client (never trust identity claims).
    const headersToForward = [
      'authorization',
      'content-type',
      'content-length',
      'x-request-id',
      'x-correlation-id',
      // Keep W3C trace context across gateway → service so downstream logs share traceId.
      'traceparent',
      'tracestate',
      'idempotency-key',
      'user-agent',
      'accept',
      'accept-language',
      'origin',
      'referer',
      'x-forwarded-host',
      'x-razorpay-signature',
      'x-razorpay-event-id',
    ];

    headersToForward.forEach((header) => {
      const value = req.headers[header];
      if (value) {
        headers[header] = Array.isArray(value) ? value[0] : value;
      }
    });

    // Strip any client-supplied identity headers before injection.
    delete headers['x-user-id'];
    delete headers['x-user-role'];
    delete headers['x-user-email'];

    const clientIp = getClientIp(req);
    if (clientIp) {
      // Prefer gateway-observed client IP; do not blindly trust client XFF chain.
      headers['x-forwarded-for'] = clientIp;
      headers['x-real-ip'] = clientIp;
    }

    // Add gateway identification header
    headers['x-gateway-source'] = 'nestlancer-gateway';

    // Inject verified user claims from the gateway's JWT guard only.
    const user = (req as any).user;
    if (user) {
      headers['x-user-id'] = user.userId || user.sub;
      headers['x-user-role'] = user.role;
      if (user.email) {
        headers['x-user-email'] = user.email;
      }
    }

    // Strip client-supplied routing hints, then publish the public path the client called.
    delete headers['x-public-path'];
    delete headers['x-verify-detail'];
    const publicPath = (req.originalUrl || req.url || '').split('?')[0];
    if (publicPath.startsWith('/') && !publicPath.includes('..') && !/[\r\n]/.test(publicPath)) {
      headers['x-public-path'] = publicPath;
    }
    if (/^\/api\/v1\/documents\/verify\//.test(publicPath)) {
      headers['x-verify-detail'] = 'public';
    } else if (/^\/api\/v1\/admin\/documents\/verify\//.test(publicPath)) {
      headers['x-verify-detail'] = 'admin';
    }

    return headers;
  }

  /**
   * Handle proxy errors and convert to appropriate HTTP exceptions
   */
  private handleProxyError(error: AxiosError, serviceName: string): never {
    this.logger.error(`Proxy error for service '${serviceName}': ${error.message}`, error.stack);

    // Connection refused or timeout
    if (error.code === 'ECONNREFUSED') {
      throw new HttpException(
        {
          status: 'error',
          error: {
            code: 'GATEWAY_002',
            message: `Service '${serviceName}' is unavailable`,
            details: { service: serviceName },
          },
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new HttpException(
        {
          status: 'error',
          error: {
            code: 'GATEWAY_003',
            message: `Request to service '${serviceName}' timed out`,
            details: { service: serviceName },
          },
        },
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    // If we got a response from the service, pass it through
    if (error.response) {
      const { status, data } = error.response;
      throw new HttpException(data as string | Record<string, any>, status);
    }

    // Unknown error
    throw new HttpException(
      {
        status: 'error',
        error: {
          code: 'GATEWAY_004',
          message: `Error communicating with service '${serviceName}'`,
          details: { service: serviceName, error: error.message },
        },
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
