import { IsOptional, IsString, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { SegmentDateRangeDto } from './segment-date-range.dto';

/**
 * Criteria for targeting a notification segment.
 */
export class SegmentCriteriaDto {
  @ApiPropertyOptional({
    example: 'USER',
    description: 'Target users by their role (USER or ADMIN)',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    type: SegmentDateRangeDto,
    description: 'Target users based on registration or activity date',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentDateRangeDto)
  dateRange?: SegmentDateRangeDto;

  @ApiPropertyOptional({ description: 'Target users by specific activity patterns' })
  @IsOptional()
  @IsString()
  activity?: string;
}

/**
 * Data Transfer Object for sending notifications to a targeted segment.
 */
export class SegmentNotificationDto {
  @ApiProperty({ description: 'Segmentation rules' })
  @ValidateNested()
  @Type(() => SegmentCriteriaDto)
  criteria: SegmentCriteriaDto;

  @ApiProperty({ description: 'The notification content and metadata' })
  @IsObject()
  notificationPayload: any;
}
