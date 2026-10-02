import type { Request } from 'express';

import { buildViewerKey } from '../../../src/utils/viewer-key.util';

describe('buildViewerKey', () => {
  it('uses the public proxy hop when req.ip is only a private Docker address', () => {
    const req = {
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.50', 'user-agent': 'Mozilla/5.0 Chrome' },
      socket: {},
    } as Pick<Request, 'ip' | 'headers' | 'socket'>;

    const keyA = buildViewerKey(req);
    const keyB = buildViewerKey({
      ...req,
      headers: { 'x-forwarded-for': '203.0.113.51', 'user-agent': 'Mozilla/5.0 Chrome' },
    } as Pick<Request, 'ip' | 'headers' | 'socket'>);

    expect(keyA).not.toEqual(keyB);
  });

  it('ignores x-forwarded-for when Express already resolved a public client IP', () => {
    const req = {
      ip: '198.51.100.10',
      headers: { 'x-forwarded-for': '203.0.113.50', 'user-agent': 'Mozilla/5.0 Chrome' },
      socket: {},
    } as Pick<Request, 'ip' | 'headers' | 'socket'>;

    const keyA = buildViewerKey(req);
    const keyB = buildViewerKey({
      ...req,
      headers: { 'x-forwarded-for': '203.0.113.51', 'user-agent': 'Mozilla/5.0 Chrome' },
    } as Pick<Request, 'ip' | 'headers' | 'socket'>);

    expect(keyA).toEqual(keyB);
  });

  it('uses x-forwarded-for when req.ip is absent', () => {
    const base = {
      headers: { 'user-agent': 'Mozilla/5.0 Chrome' },
      socket: {},
    } as Pick<Request, 'ip' | 'headers' | 'socket'>;

    const keyA = buildViewerKey({
      ...base,
      headers: { ...base.headers, 'x-forwarded-for': '203.0.113.50' },
    } as Pick<Request, 'ip' | 'headers' | 'socket'>);
    const keyB = buildViewerKey({
      ...base,
      headers: { ...base.headers, 'x-forwarded-for': '203.0.113.51' },
    } as Pick<Request, 'ip' | 'headers' | 'socket'>);

    expect(keyA).not.toEqual(keyB);
  });

  it('does not let User-Agent rotation mint a new anonymous viewer key', () => {
    const base = {
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.50' },
      socket: {},
    } as Pick<Request, 'ip' | 'headers' | 'socket'>;

    const chrome = buildViewerKey({
      ...base,
      headers: { ...base.headers, 'user-agent': 'Mozilla/5.0 Chrome' },
    } as Pick<Request, 'ip' | 'headers' | 'socket'>);

    const firefox = buildViewerKey({
      ...base,
      headers: { ...base.headers, 'user-agent': 'Mozilla/5.0 Firefox' },
    } as Pick<Request, 'ip' | 'headers' | 'socket'>);

    expect(chrome).toEqual(firefox);
  });

  it('counts distinct bearer tokens separately even on the same IP', () => {
    const base = {
      ip: '10.0.0.1',
      headers: { 'user-agent': 'curl/8.0' },
      socket: {},
    } as Pick<Request, 'ip' | 'headers' | 'socket'>;

    const client = buildViewerKey({
      ...base,
      headers: { ...base.headers, authorization: 'Bearer client-token' },
    } as Pick<Request, 'ip' | 'headers' | 'socket'>);
    const admin = buildViewerKey({
      ...base,
      headers: { ...base.headers, authorization: 'Bearer admin-token' },
    } as Pick<Request, 'ip' | 'headers' | 'socket'>);
    const anon = buildViewerKey(base);

    expect(client).not.toEqual(admin);
    expect(client).not.toEqual(anon);
  });
});
