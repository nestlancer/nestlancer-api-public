jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

import { RegistrationService } from '../../../src/services/registration.service';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let mockPrismaWrite: any;
  let mockQueue: any;
  let mockConfig: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrismaWrite = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'new-user-1',
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
            }),
          },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
    };
    mockQueue = {
      publish: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn().mockResolvedValue(undefined),
    };
    mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        if (key === 'authService.security.bcryptSaltRounds') return 12;
        if (key === 'authService.tokens.emailVerificationExpiresIn') return 86400;
        return undefined;
      }),
      getOptional: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        if (key === 'authService.security.bcryptSaltRounds') return 12;
        if (key === 'authService.tokens.emailVerificationExpiresIn') return 86400;
        return defaultValue;
      }),
    };
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    service = new RegistrationService(mockPrismaWrite, mockQueue, mockConfig, mockLogger);
  });

  describe('registerUser', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+919999999999',
      marketingConsent: true,
    };

    it('should register a new user successfully', async () => {
      const result = await service.registerUser(registerDto);
      expect(result.user).toBeDefined();
      expect(result.emailVerificationToken).toBeDefined();
      expect(result.emailVerificationToken).toContain('verify_');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaWrite.user.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(service.registerUser(registerDto)).rejects.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should lowercase email before saving', async () => {
      const dto = { ...registerDto, email: 'TEST@EXAMPLE.COM' };
      await service.registerUser(dto);

      expect(mockPrismaWrite.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });

    it('should create outbox event for user registration', async () => {
      await service.registerUser(registerDto);
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });
  });

  describe('checkEmail', () => {
    it('should return true if email exists', async () => {
      mockPrismaWrite.user.count.mockResolvedValue(1);

      const result = await service.checkEmail('test@example.com');
      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockPrismaWrite.user.count.mockResolvedValue(0);

      const result = await service.checkEmail('new@example.com');
      expect(result).toBe(false);
    });

    it('should lowercase email before checking', async () => {
      await service.checkEmail('TEST@EXAMPLE.COM');
      expect(mockPrismaWrite.user.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });
  });
});
