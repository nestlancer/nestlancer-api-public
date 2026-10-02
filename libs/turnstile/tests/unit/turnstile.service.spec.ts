import { Test, TestingModule } from '@nestjs/testing';
import { TurnstileService } from '../../src/turnstile.service';

describe('TurnstileService', () => {
  let service: TurnstileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'TURNSTILE_OPTIONS',
          useValue: { secretKey: 'test-secret' },
        },
        TurnstileService,
      ],
    }).compile();

    service = module.get<TurnstileService>(TurnstileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return success true in test environment', async () => {
    process.env.NODE_ENV = 'test';
    const result = await service.verify('test-token');
    expect(result.success).toBe(true);
  });

  it('should accept configured bypass token without calling Cloudflare', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_BYPASS_TOKEN = 'local-bypass';
    global.fetch = jest.fn();

    const result = await service.verify('local-bypass');
    expect(result.success).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();

    delete process.env.TURNSTILE_BYPASS_TOKEN;
    (global.fetch as jest.Mock).mockRestore();
    process.env.NODE_ENV = 'test';
  });

  it('should succeed without token when secret key is empty (disabled)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TURNSTILE_SECRET_KEY;
    const disabled = await Test.createTestingModule({
      providers: [
        { provide: 'TURNSTILE_OPTIONS', useValue: { secretKey: '' } },
        TurnstileService,
      ],
    }).compile();
    const svc = disabled.get<TurnstileService>(TurnstileService);

    expect(svc.isEnabled()).toBe(false);
    const result = await svc.verify('');
    expect(result.success).toBe(true);
    process.env.NODE_ENV = 'test';
  });

  it('should handle verification failure', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TURNSTILE_BYPASS_TOKEN;
    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({
      json: jest
        .fn()
        .mockResolvedValue({ success: false, 'error-codes': ['invalid-input-response'] }),
    });

    const result = await service.verify('invalid-token');
    expect(result.success).toBe(false);

    (global.fetch as jest.Mock).mockRestore();
    process.env.NODE_ENV = 'test';
  });
});
