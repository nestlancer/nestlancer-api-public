export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type?: string;
  jti?: string;
  portal?: 'client' | 'admin';
  iat?: number;
  exp?: number;
  /** Present on admin→client support-session access tokens. */
  isImpersonated?: boolean;
  impersonationSessionId?: string;
  originalAdminId?: string;
}

export interface AuthenticatedUser {
  userId: string;
  sub?: string; // Alias for userId (JWT standard claim)
  email: string;
  role: string;
  portal?: 'client' | 'admin';
  jti?: string;
  iat: number;
  exp: number;
  /** Present on admin→client support-session access tokens. */
  isImpersonated?: boolean;
  impersonationSessionId?: string;
  originalAdminId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
