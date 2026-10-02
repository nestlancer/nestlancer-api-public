import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** User summary returned after successful login or registration. */
export class AuthUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Contact phone in E.164 format',
    example: '+919876543210',
  })
  phone?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional({ example: 'client' })
  role?: string;

  @ApiPropertyOptional()
  emailVerified?: boolean;

  @ApiPropertyOptional()
  twoFactorEnabled?: boolean;
}

/** Successful login payload inside the gateway success envelope. */
export class LoginTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 3600 })
  expiresIn: number;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ type: () => AuthUserSummaryDto })
  user: AuthUserSummaryDto;
}

/** Returned when 2FA is required (HTTP 202, partial status — not the standard envelope). */
export class TwoFactorChallengeDto {
  @ApiProperty({ type: 'boolean', example: true })
  requires2FA: true;

  @ApiProperty()
  authSessionId: string;

  @ApiProperty({ type: [String], example: ['totp'] })
  methodsAvailable: string[];
}

/** Registration success payload inside the gateway success envelope. */
export class RegisterResultDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  emailVerificationSent: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  emailVerificationExpiresAt?: string;
}
