import { Test, TestingModule } from '@nestjs/testing';
import { AccessTokenRevocationService } from '@nestlancer/cache';
import { PrismaWriteService } from '@nestlancer/database';
import { AuthService } from '../../../src/services/auth.service';
import { RegistrationService } from '../../../src/services/registration.service';
import { LoginService } from '../../../src/services/login.service';
import { TokenService } from '../../../src/services/token.service';
import { PasswordService } from '../../../src/services/password.service';
import { TwoFactorService } from '../../../src/services/two-factor.service';
import { EmailVerificationService } from '../../../src/services/email-verification.service';
import { TurnstileService } from '../../../src/services/turnstile.service';

describe('AuthService', () => {
  let service: AuthService;
  let RegistrationMock: any;
  let TurnstileMock: any;

  beforeEach(async () => {
    RegistrationMock = { registerUser: jest.fn(), checkEmail: jest.fn() };
    TurnstileMock = { verifyToken: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: RegistrationService, useValue: RegistrationMock },
        { provide: LoginService, useValue: { authenticate: jest.fn() } },
        { provide: TokenService, useValue: { refreshToken: jest.fn() } },
        {
          provide: PasswordService,
          useValue: { requestPasswordReset: jest.fn(), resetPassword: jest.fn() },
        },
        { provide: TwoFactorService, useValue: { verify2FA: jest.fn() } },
        {
          provide: EmailVerificationService,
          useValue: { verifyEmail: jest.fn(), resendVerification: jest.fn() },
        },
        { provide: TurnstileService, useValue: TurnstileMock },
        {
          provide: PrismaWriteService,
          useValue: {
            impersonationSession: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: AccessTokenRevocationService,
          useValue: { revokeAccessJti: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should verify turnstile and register user', async () => {
      const mockDto = {
        email: 'test@example.com',
        password: 'pw',
        firstName: 'fn',
        lastName: 'ln',
        acceptTerms: true,
        turnstileToken: 'valid',
      };
      RegistrationMock.registerUser.mockResolvedValue({ user: { id: '1' } });

      const result = await service.register(mockDto, '127.0.0.1');

      expect(TurnstileMock.verifyToken).toHaveBeenCalledWith('valid', '127.0.0.1');
      expect(RegistrationMock.registerUser).toHaveBeenCalledWith(mockDto);
      expect(result).toEqual({ user: { id: '1' } });
    });
  });
});
