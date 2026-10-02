import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Metadata included on every successful API response. */
export class ResponseMetadataDto {
  @ApiProperty({ example: '2026-05-29T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  requestId!: string;

  @ApiProperty({ example: 'v1' })
  version!: string;

  @ApiPropertyOptional({ example: '/api/v1/users/me' })
  path?: string;
}
