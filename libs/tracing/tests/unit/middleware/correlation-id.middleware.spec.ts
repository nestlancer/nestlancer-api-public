import { CorrelationIdMiddleware } from '../../../src/middleware/correlation-id.middleware';
import { Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
  });

  it('should use existing correlation id if provided', () => {
    const req = { headers: { 'x-correlation-id': 'existing-id' } } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-correlation-id']).toBe('existing-id');
    expect(req.headers['x-request-id']).toBe('existing-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'existing-id');
    expect(next).toHaveBeenCalled();
  });

  it('should generate new correlation id if none provided', () => {
    const req = { headers: {} } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const id = req.headers['x-correlation-id'];
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(String(id)).not.toContain(',');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', id);
    expect(next).toHaveBeenCalled();
  });

  it('should echo a client correlation id when a server uuid was comma-appended', () => {
    const req = {
      headers: {
        'x-correlation-id': 'AUDIT-TRACE-20260917-77, 1d3d750a-85a3-43b3-9874-e62d7f5a217d',
      },
    } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-correlation-id']).toBe('AUDIT-TRACE-20260917-77');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'AUDIT-TRACE-20260917-77');
    expect(String(req.headers['x-correlation-id'])).not.toContain(',');
  });

  it('should collapse comma-joined and array header values to one uuid', () => {
    const first = '8362dac6-9fca-493c-a651-63f156d1a4b7';
    const second = 'a752eb27-9aa5-40f1-8373-dd69988848ed';
    const req = {
      headers: {
        'x-correlation-id': [`${first}, ${first}`, second],
        'x-request-id': `${first},${second}`,
      },
    } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-correlation-id']).toBe(first);
    expect(req.headers['x-request-id']).toBe(first);
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', first);
  });

  it('should mint a server id when the client correlation id is overlong or HTML-ish', () => {
    const req = {
      headers: { 'x-correlation-id': 'A'.repeat(600) },
    } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const id = String(req.headers['x-correlation-id']);
    expect(id).not.toBe('A'.repeat(600));
    expect(id.length).toBeLessThanOrEqual(128);
    expect(/^[A-Za-z0-9._:-]{1,128}$/.test(id)).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', id);
  });

  it('should reject HTML-ish correlation ids', () => {
    const req = {
      headers: { 'x-correlation-id': 'ok-id <script>x</script>' },
    } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-correlation-id']).not.toBe('ok-id <script>x</script>');
    expect(String(req.headers['x-correlation-id'])).not.toContain('<');
  });
});
