import { Test, TestingModule } from '@nestjs/testing';
import { TurnstileGuard } from '../../../src/guards/turnstile.guard';
import { TurnstileService } from '../../../src/services/turnstile.service';
import { ExecutionContext } from '@nestjs/common';
import { BusinessLogicException } from '@nestlancer/common';

describe('TurnstileGuard', () => {
  let guard: TurnstileGuard;
  let turnstileService: jest.Mocked<TurnstileService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnstileGuard,
        {
          provide: TurnstileService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(true),
            verifyToken: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<TurnstileGuard>(TurnstileGuard);
    turnstileService = module.get(TurnstileService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow without token when Turnstile is disabled', async () => {
      turnstileService.isEnabled.mockReturnValue(false);
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            body: {},
            query: {},
            headers: {},
          }),
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      expect(turnstileService.verifyToken).not.toHaveBeenCalled();
    });

    it('should throw an error if no token is provided when enabled', async () => {
      turnstileService.verifyToken.mockRejectedValue(
        new BusinessLogicException('Turnstile token required', 'AUTH_011'),
      );
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            body: {},
            query: {},
            headers: {},
          }),
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(BusinessLogicException);
    });

    it('should verify token and return true if successful', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            body: { turnstileToken: 'valid-token' },
            query: {},
            headers: {},
            ip: '127.0.0.1',
          }),
        }),
      } as ExecutionContext;

      turnstileService.verifyToken.mockResolvedValue(true as any);

      const result = await guard.canActivate(mockContext);

      expect(turnstileService.verifyToken).toHaveBeenCalledWith('valid-token', '127.0.0.1');
      expect(result).toBe(true);
    });

    it('should extract token from headers', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            body: {},
            query: {},
            headers: { 'x-turnstile-token': 'header-token', 'x-forwarded-for': '192.168.1.1' },
          }),
        }),
      } as ExecutionContext;

      turnstileService.verifyToken.mockResolvedValue(true as any);

      const result = await guard.canActivate(mockContext);

      expect(turnstileService.verifyToken).toHaveBeenCalledWith('header-token', '192.168.1.1');
      expect(result).toBe(true);
    });
  });
});
