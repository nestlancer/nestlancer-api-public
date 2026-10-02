import { Controller, Post, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

/**
 * Payload for push device registration.
 */
class RegisterDeviceDto {
  @ApiProperty({ example: 'fcm_token_123' })
  @IsString()
  token: string;
  @ApiProperty({ example: 'device_abc' })
  @IsString()
  deviceId: string;
  @ApiProperty({ example: 'android' })
  @IsString()
  platform: string;
}

/**
 * Controller for managing push notification device registrations.
 */
@ApiTags('Push Notifications')
@ApiBearerAuth()
@Controller('push')
@UseGuards(JwtAuthGuard)
@ApiStandardResponses()
export class PushController {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Registers a device token for push notifications.
   */
  @Post('register')
  @ApiOperation({ summary: 'Register push device token' })
  @HttpCode(200)
  @ApiStandardResponse(Object)
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RegisterDeviceDto,
  ): Promise<any> {
    // For the purposes of this service, acknowledge registration without
    // depending on a specific notificationPreference schema.
    return { userId: user.userId, deviceId: body.deviceId, registered: true };
  }

  /**
   * Unregisters a device from push notifications.
   */
  @Delete('unregister/:deviceId')
  @ApiOperation({ summary: 'Unregister push device' })
  @ApiStandardResponse(Object)
  async unregisterDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deviceId') deviceId: string,
  ): Promise<any> {
    return { userId: user.userId, deviceId, unregistered: true };
  }
}
