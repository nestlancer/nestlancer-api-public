import { createAccessToken, createRefreshToken } from '../../../src/utils/token.util';
import { JwtService } from '@nestjs/jwt';

describe('TokenUtil', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
    } as any;
  });

  describe('createAccessToken', () => {
    it('should sign a token with sub, email, and role', () => {
      const payload = { sub: 'user-123', email: 'test@example.com', role: 'USER' };
      const token = createAccessToken(jwtService, payload);

      expect(token).toBe('mock-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
    });
  });

  describe('createRefreshToken', () => {
    it('should sign a refresh token with 7d expiry', () => {
      process.env.JWT_REFRESH_SECRET = 'refresh-secret';
      const token = createRefreshToken(jwtService, 'user-123');

      expect(token).toBe('mock-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', type: 'refresh' },
        { expiresIn: '7d', secret: 'refresh-secret' },
      );
    });
  });
});
