import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { SubscriptionsService } from './subscriptions.service';
import { RegisterPushSubscriptionDto } from '../dto/register-push-subscription.dto';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';

/**
 * Payload for removing a push subscription.
 */
class RemoveSubscriptionDto {
  @ApiProperty({ description: 'The endpoint URL of the push subscription to remove' })
  @IsString()
  endpoint: string;
}

/**
 * Controller for managing Web Push subscriptions.
 */
@ApiTags('Push Subscriptions')
@ApiBearerAuth()
@Controller('push-subscription')
@UseGuards(JwtAuthGuard)
@ApiStandardResponses()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Registers a new Web Push subscription for the authenticated user.
   * Enables receipt of push notifications on the specific device/browser.
   *
   * @param user The metadata of the currently authenticated user
   * @param dto Endpoint and key information for the push subscription
   * @returns A promise resolving to the registration confirmation
   */
  @Post()
  @ApiOperation({
    summary: 'Register web push subscription',
    description: 'Enroll a device for receiving real-time browser push notifications.',
  })
  @ApiStandardResponse(Object)
  async registerSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushSubscriptionDto,
  ): Promise<any> {
    return this.subscriptionsService.register(user.userId, dto);
  }

  /**
   * Terminates and removes an existing Web Push subscription.
   *
   * @param user The metadata of the currently authenticated user
   * @param body Details identifying the subscription to be removed
   * @returns A promise resolving to the unregistration confirmation
   */
  @Delete()
  @ApiOperation({
    summary: 'Remove web push subscription',
    description: 'Deactivate and delete a previously registered push notification endpoint.',
  })
  @ApiStandardResponse(Object)
  async removeSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RemoveSubscriptionDto,
  ): Promise<any> {
    return this.subscriptionsService.unregister(user.userId, body.endpoint);
  }
}
