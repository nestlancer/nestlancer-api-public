import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { of, throwError } from 'rxjs';

import { CloudflareInvalidationService } from '../../../src/services/cloudflare-invalidation.service';

describe('CloudflareInvalidationService', () => {
  let service: CloudflareInvalidationService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudflareInvalidationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'cdn.cloudflare.apiToken') return 'token';
              if (key === 'cdn.cloudflare.zoneId') return 'zone1';
              if (key === 'cdn.skipInvalidation') return false;
              return null;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CloudflareInvalidationService>(CloudflareInvalidationService);
    httpService = module.get(HttpService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('invalidate', () => {
    it('should call cloudflare api to purge cache by files', async () => {
      httpService.post.mockReturnValue(
        of({ data: { success: true, result: { id: 'cf1' } } }) as any,
      );

      const result = await service.invalidate(['/path1']);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/zones/zone1/purge_cache',
        { files: ['/path1'] },
        expect.objectContaining({
          headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        }),
      );
      expect(result.id).toBe('cf1');
      expect(result.status).toBe('completed');
    });

    it('should handle api error', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('API Error')));
      await expect(service.invalidate(['/path1'])).rejects.toThrow('API Error');
    });
  });

  describe('purgeAll', () => {
    it('should call cloudflare api to purge everything', async () => {
      httpService.post.mockReturnValue(of({ data: { success: true } }) as any);

      await service.purgeAll();

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/zones/zone1/purge_cache',
        { purge_everything: true },
        expect.any(Object),
      );
    });

    it('should handle api error', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('API Error')));
      await expect(service.purgeAll()).rejects.toThrow('API Error');
    });
  });
});
