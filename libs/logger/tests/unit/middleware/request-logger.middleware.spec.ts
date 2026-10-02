import { Test, TestingModule } from '@nestjs/testing';
import { RequestLoggerMiddleware } from '../../../src/middleware/request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestLoggerMiddleware],
    }).compile();

    middleware = module.get<RequestLoggerMiddleware>(RequestLoggerMiddleware);
    loggerSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should skip logging for health probe paths', () => {
    const req = { path: '/api/v1/health' } as any;
    const res = {} as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  it('should skip logging for live/ready and per-service health probes', () => {
    for (const path of [
      '/api/v1/health/live',
      '/api/v1/health/ready',
      '/api/v1/health/ping',
      '/api/v1/auth/health',
      '/api/v1/posts/health',
      '/metrics',
    ]) {
      const next = jest.fn();
      middleware.use({ path } as any, {} as any, next);
      expect(next).toHaveBeenCalled();
    }
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  it('should read userId from x-user-id when req.user is unset', () => {
    const req = {
      method: 'GET',
      path: '/api/v1/portfolio/featured',
      originalUrl: '/api/v1/portfolio/featured',
      headers: {
        'x-correlation-id': 'cor-xuser',
        'x-user-id': 'user-from-header',
      },
    } as any;
    const res = {
      statusCode: 200,
      on: jest.fn((event, cb) => {
        if (event === 'finish') cb();
      }),
    } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('"userId":"user-from-header"'));
  });

  it('should log non-probe health diagnostic routes', () => {
    const req = {
      method: 'GET',
      path: '/api/v1/health/detailed',
      originalUrl: '/api/v1/health/detailed',
      headers: { 'x-correlation-id': 'cor-health' },
    } as any;
    const res = {
      statusCode: 200,
      on: jest.fn((event, cb) => {
        if (event === 'finish') cb();
      }),
    } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"http.request"'));
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('/api/v1/health/detailed'));
  });

  it('should read userId on finish after auth attaches req.user', () => {
    const req = {
      method: 'GET',
      path: '/api/v1/users/me',
      originalUrl: '/api/v1/users/me',
      headers: { 'x-correlation-id': 'cor-user' },
      user: undefined as { id?: string } | undefined,
    } as any;
    const res = {
      statusCode: 200,
      on: jest.fn((event, cb) => {
        if (event === 'finish') {
          req.user = { id: 'user-42' };
          cb();
        }
      }),
    } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('"userId":"user-42"'));
  });

  it('should log request details on finish', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/users',
      headers: { 'x-correlation-id': 'cor-123' },
    } as any;
    const res = {
      statusCode: 200,
      on: jest.fn((event, cb) => {
        if (event === 'finish') cb();
      }),
    } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('GET /api/v1/users 200'));
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[cor-123]'));
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('"correlationId":"cor-123"'));
  });
});
