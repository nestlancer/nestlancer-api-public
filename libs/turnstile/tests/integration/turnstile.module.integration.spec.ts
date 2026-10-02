import { Test, TestingModule } from '@nestjs/testing';
import { TurnstileModule } from '../../src/turnstile.module';
import { TurnstileService } from '../../src/turnstile.service';
import { ConfigModule } from '@nestjs/config';
import { TurnstileGuard } from '../../src/turnstile.guard';

describe('TurnstileModule (Integration)', () => {
  let module: TestingModule;
  let service: TurnstileService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        TurnstileModule.forRoot({ secretKey: 'test-secret' }),
      ],
    })
      .overrideProvider(TurnstileGuard)
      .useValue({ canActivate: () => true })
      .compile();

    service = module.get<TurnstileService>(TurnstileService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify token (returns success: true in test env)', async () => {
    const result = await service.verify('test-token');
    expect(result.success).toBe(true);
  });

  it('should call fetch when not in test env', async () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      } as any),
    );

    await service.verify('test-token', '127.0.0.1');
    expect(fetchSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
    process.env.NODE_ENV = oldEnv;
  });
});
