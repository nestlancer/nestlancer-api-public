import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from '@nestlancer/common';
import { NotificationType } from '../interfaces/notification.interface';

const SEVERITY_TYPES = new Set(Object.values(NotificationType));

/**
 * Data Transfer Object for querying user notifications.
 */
export class QueryNotificationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Severity filter (info|success|warning|error). UI tabs all|unread|payments|projects|system are also accepted.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => {
    if (value == null || value === '') return undefined;
    const raw = String(value).toLowerCase();
    // Product tabs used by auditors / older clients (NL-NOTIF-002 filters).
    if (raw === 'all') return undefined;
    if (raw === 'unread') {
      obj.unreadOnly = true;
      return undefined;
    }
    if (raw === 'payments' || raw === 'payment') return 'payments';
    if (raw === 'projects' || raw === 'project') return 'projects';
    if (raw === 'system') return 'system';
    if (raw === 'messages' || raw === 'message') return 'messages';
    if (SEVERITY_TYPES.has(raw as NotificationType)) return raw;
    return value;
  })
  type?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'If true, only unread notifications are returned',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;
}
