import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ExtendProjectAdminDto {
  @ApiProperty({
    description: 'New target end date for the project (ISO 8601)',
    example: '2025-12-31',
  })
  @IsString()
  newDeadline: string;

  @ApiProperty({
    description: 'Reason for extending the project deadline',
    example: 'Client requested additional features',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  reason: string;
}
