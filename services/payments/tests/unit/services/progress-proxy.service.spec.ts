import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ProgressProxyService } from '../../../src/services/progress-proxy.service';

describe('ProgressProxyService', () => {
  let service: ProgressProxyService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgressProxyService],
    }).compile();

    service = module.get(ProgressProxyService);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('POSTs to progress admin complete endpoint with auth header', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          status: 'success',
          data: { id: 'ms-1', status: 'COMPLETED' },
        }),
    });

    const result = await service.completeMilestone('Bearer token-1', 'ms-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3009/api/v1/admin/milestones/ms-1/complete',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result).toEqual({
      status: 'success',
      data: { id: 'ms-1', status: 'COMPLETED' },
    });
  });

  it('throws HttpException when progress service returns an error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          status: 'error',
          error: { message: 'Project work is blocked while status is SUSPENDED' },
        }),
    });

    await expect(service.completeMilestone('Bearer token-1', 'ms-1')).rejects.toThrow(
      HttpException,
    );
  });
});
