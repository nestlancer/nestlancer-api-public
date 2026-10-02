import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for representing a single audit log entry.
 */
export class AuditLogResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'The unique identifier of the audit log' })
  id: string;

  @ApiProperty({ example: 'USER_LOGIN', description: 'The specific action performed' })
  action: string;

  @ApiProperty({ example: 'User', description: 'The type of resource affected' })
  resourceType: string;

  @ApiPropertyOptional({
    example: 'user-456',
    description: 'The unique identifier of the affected resource',
  })
  resourceId?: string | null;

  @ApiPropertyOptional({
    example: 'admin-789',
    description: 'The ID of the user who performed the action',
  })
  userId?: string | null;

  @ApiPropertyOptional({
    example: 'admin@example.com',
    description: 'The email of the user who performed the action',
  })
  userEmail?: string;

  @ApiPropertyOptional({ description: 'The state of the resource before the action' })
  dataBefore?: any;

  @ApiPropertyOptional({ description: 'The state of the resource after the action' })
  dataAfter?: any;

  @ApiPropertyOptional({
    example: '192.168.1.1',
    description: 'The IP address from which the action was performed',
  })
  ip?: string | null;

  @ApiProperty({
    example: '2023-10-27T10:00:00Z',
    description: 'Timestamp when the action occurred',
  })
  createdAt: Date;
}
