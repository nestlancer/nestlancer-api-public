import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthPublicController } from '../../../src/controllers/auth.public.controller';
import { AuthService } from '../../../src/services/auth.service';
import { TurnstileService } from '../../../src/services/turnstile.service';
import { Response } from 'express';

describe('AuthPublicController', () => {
  let controller: AuthPublicController;
  let authService: AuthService;

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthPublicController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            verify2FA: jest.fn(),
            checkEmail: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerification: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
        {
          provide: TurnstileService,
          useValue: { verifyToken: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<AuthPublicController>(AuthPublicController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should return created user data and 201 status', async () => {
      const mockDto = {
        email: 'test@example.com',
        password: 'Password1!',
        firstName: 'Test',
        lastName: 'User',
        acceptTerms: true,
        turnstileToken: 'valid',
      };
      const expiresAt = new Date();
      jest.spyOn(authService, 'register').mockResolvedValue({
        user: { id: 'usr123', email: 'test@example.com', verificationTokens: [{ expiresAt }] },
        emailVerificationToken: 'token123',
        emailVerificationExpiresAt: expiresAt,
      } as any);

      const res = mockResponse();
      const result = await controller.register(mockDto, '127.0.0.1', res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(result).toEqual({
        userId: 'usr123',
        email: 'test@example.com',
        emailVerificationSent: true,
        emailVerificationExpiresAt: expiresAt,
      });
    });
  });

  describe('login', () => {
    const loginArgs = (res: Response) =>
      [
        { email: 'test@example.com', password: 'Password1!' },
        '127.0.0.1',
        'user-agent',
        'http://localhost:9000',
        'http://localhost:9000/login',
        'localhost:9000',
        '',
        res,
      ] as const;

    it('should handle successful login returning tokens', async () => {
      const mockResult = {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
        tokenType: 'Bearer',
        user: {} as any,
      };
      jest.spyOn(authService, 'login').mockResolvedValue(mockResult);
      const res = mockResponse();

      const result = await controller.login(...loginArgs(res));

      expect(authService.login).toHaveBeenCalledWith(
        { email: 'test@example.com', password: 'Password1!' },
        '127.0.0.1',
        'user-agent',
        {
          origin: 'http://localhost:9000',
          referer: 'http://localhost:9000/login',
          host: 'localhost:9000',
          forwardedHost: '',
        },
      );
      expect(result).toEqual(mockResult);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 2FA challenge with 202 without throwing', async () => {
      const mockResult = {
        requires2FA: true as const,
        authSessionId: 'sess123',
        methodsAvailable: ['totp'] as any,
      };
      jest.spyOn(authService, 'login').mockResolvedValue(mockResult);
      const res = mockResponse();

      const result = await controller.login(...loginArgs(res));

      expect(res.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
      expect(result).toEqual(mockResult);
    });
  });
});
