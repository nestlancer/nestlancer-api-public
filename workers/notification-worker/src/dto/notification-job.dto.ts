import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';

import { NotificationChannel, NotificationJobType, NotificationJob } from '@nestlancer/common';

export class NotificationContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString()
  @IsOptional()
  actionUrl?: string;
}

export class NotificationJobDto implements NotificationJob {
  @IsEnum(NotificationJobType)
  type: NotificationJobType;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[];

  @IsObject()
  @ValidateNested()
  @Type(() => NotificationContentDto)
  notification: NotificationContentDto;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  notificationType?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsOptional()
  retryCount?: number;
}
