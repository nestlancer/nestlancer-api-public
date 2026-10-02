/** Request context available throughout a request lifecycle */
export interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  timestamp: Date;
}

/** Authenticated user attached to request by JwtAuthGuard */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
