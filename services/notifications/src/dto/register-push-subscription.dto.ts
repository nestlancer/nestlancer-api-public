import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Keys used for Push Subscription encryption (Web Push).
 */
export class PushSubscriptionKeysDto {
  @ApiProperty({ description: 'The p256dh key for push subscription' })
  @IsString()
  p256dh: string;

  @ApiProperty({ description: 'The auth secret for push subscription' })
  @IsString()
  auth: string;
}

/**
 * Data Transfer Object for registering a push subscription.
 */
export class RegisterPushSubscriptionDto {
  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/...',
    description: 'The push service endpoint',
  })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: 'Encryption keys for the subscription' })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;

  @ApiPropertyOptional({
    example: 'Chrome on Windows',
    description: 'User-friendly name or identifier for the device',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
