import * as jwt from 'jsonwebtoken';
import {
  createTestJwt,
  createTestRefreshToken,
  createAuthHeader,
} from '../../../src/helpers/test-auth.helper';

describe('TestAuthHelper', () => {
  const mockSecret = 'test-secret-key-for-testing-only-32char';

  it('should create a valid JWT access token', () => {
    const token = createTestJwt({ sub: 'user-1' });
    // Signing algorithm follows env (RS256 when JWT_ACCESS_PRIVATE_KEY is set).
    const decoded = jwt.decode(token) as any;
    expect(decoded.sub).toBe('user-1');
    expect(decoded.email).toBe('user-1@test.com'); // default fallback
    expect(decoded.role).toBe('USER');
  });

  it('should create a valid refresh token', () => {
    const token = createTestRefreshToken('user-1', { secret: mockSecret });
    const decoded = jwt.verify(token, mockSecret) as any;
    expect(decoded.sub).toBe('user-1');
    expect(decoded.type).toBe('refresh');
  });

  it('should create an auth header correctly', () => {
    const header = createAuthHeader({ sub: 'user-1' });
    expect(header.startsWith('Bearer ')).toBe(true);
    const token = header.split(' ')[1];
    const decoded = jwt.decode(token) as any;
    expect(decoded.sub).toBe('user-1');
  });
});
