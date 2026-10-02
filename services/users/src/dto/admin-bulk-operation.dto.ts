import { IsString, IsArray, IsNotEmpty, IsOptional, ArrayNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Valid administrative actions for bulk processing.
 */
export enum BulkAction {
  SUSPEND = 'suspend',
  ACTIVATE = 'activate',
  DELETE = 'delete',
  RESET_PASSWORD = 'resetPassword',
}

/**
 * Administrative DTO for executing actions across multiple user accounts simultaneously.
 */
export class AdminBulkOperationDto {
  @ApiProperty({
    description: 'Array of user identification strings (UUIDs)',
    example: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  userIds: string[];

  @ApiProperty({
    description: 'The specific administrative action to execute',
    enum: BulkAction,
    example: BulkAction.SUSPEND,
  })
  @IsEnum(BulkAction)
  @IsNotEmpty()
  action: BulkAction;

  @ApiPropertyOptional({
    description:
      'Compulsory justification or reasoning for the bulk action (Audit log requirement)',
    example: 'Security breach suspected across multiple related accounts.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
