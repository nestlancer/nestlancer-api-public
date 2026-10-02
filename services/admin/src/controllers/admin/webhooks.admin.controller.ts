import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ApiStandardResponses, ApiStandardResponse, UserRole } from '@nestlancer/common';
import { AdminGuard } from '../../guards/admin.guard';

import { WebhooksManagementService } from '../../services/webhooks-management.service';
import { WebhookDeliveriesService } from '../../services/webhook-deliveries.service';
import { WebhookTestingService } from '../../services/webhook-testing.service';

import { CreateWebhookDto } from '../../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../../dto/update-webhook.dto';
import { TestWebhookDto } from '../../dto/test-webhook.dto';
import { QueryWebhookDeliveriesDto } from '../../dto/query-webhook-deliveries.dto';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

/**
 * Controller for administrative webhook management and monitoring.
 * Provides endpoints for configuring webhooks, listing events, and auditing delivery history.
 *
 * @category Admin
 */
@ApiTags('Admin - Webhooks')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller()
@ApiStandardResponses()
export class WebhooksAdminController {
  constructor(
    private readonly webhooksService: WebhooksManagementService,
    private readonly deliveriesService: WebhookDeliveriesService,
    private readonly testingService: WebhookTestingService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Retrieves a list of all configured webhooks.
   *
   * @returns Array of webhook configurations
   */
  @Get('webhooks')
  @ApiOperation({
    summary: 'List webhooks',
    description: 'Fetch all registered webhooks for the system.',
  })
  @ApiStandardResponse({ message: 'Webhooks retrieved' })
  async list(): Promise<any> {
    return this.webhooksService.findAll();
  }

  /**
   * Registers a new system-wide webhook.
   *
   * @param dto Webhook configuration (target URL, events, secret)
   * @returns The created webhook object
   */
  @Post('webhooks')
  @ApiOperation({
    summary: 'Create webhook',
    description: 'Register a new webhook endpoint to receive specified system events.',
  })
  @ApiStandardResponse({ message: 'Webhook created' })
  async create(@Body() dto: CreateWebhookDto): Promise<any> {
    return this.webhooksService.create(dto);
  }

  @Get('webhooks/health')
  @ApiOperation({ summary: 'Webhooks health check' })
  @ApiStandardResponse({ message: 'Webhooks health' })
  async health(): Promise<any> {
    return { status: 'ok', service: 'webhooks-admin' };
  }

  /**
   * Retrieves an enumeration of all system events compatible with webhook triggers.
   *
   * @returns A promise resolving to an object containing an array of supported event identifiers
   */
  @Get('webhooks/events')
  @ApiOperation({
    summary: 'List available webhook events',
    description:
      'Retrieve a comprehensive registry of all platform events that can trigger a webhook notification.',
  })
  @ApiStandardResponse({ message: 'Available events' })
  async events(): Promise<any> {
    return {
      events: [
        'project.created',
        'project.updated',
        'project.completed',
        'payment.completed',
        'payment.failed',
        'payment.refunded',
        'quote.sent',
        'quote.accepted',
        'quote.declined',
        'message.sent',
        'user.registered',
        'webhook.test',
      ],
    };
  }

  /**
   * Retrieves detailed configuration for a specific webhook.
   *
   * @param id The unique identifier of the webhook
   * @returns Detailed webhook configuration
   */
  @Get('webhooks/:id')
  @ApiOperation({
    summary: 'Get webhook',
    description: 'Retrieve comprehensive configuration for a specific webhook by ID.',
  })
  @ApiStandardResponse({ message: 'Webhook retrieved' })
  async get(@Param('id') id: string): Promise<any> {
    return this.webhooksService.findOne(id);
  }

  /**
   * Updates an existing webhook configuration.
   *
   * @param id The unique identifier of the webhook
   * @param dto New configuration values
   * @returns Updated webhook configuration
   */
  @Patch('webhooks/:id')
  @ApiOperation({
    summary: 'Update webhook',
    description: 'Modify the URL, events, or status of an existing webhook.',
  })
  @ApiStandardResponse({ message: 'Webhook updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDto): Promise<any> {
    return this.webhooksService.update(id, dto);
  }

  /**
   * Permanently deletes a webhook from the system.
   *
   * @param id The unique identifier of the webhook
   * @returns Confirmation of deletion
   */
  @Delete('webhooks/:id')
  @ApiOperation({
    summary: 'Delete webhook',
    description: 'Remove a webhook registration and stop all future delivery attempts.',
  })
  @ApiStandardResponse({ message: 'Webhook deleted' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.webhooksService.remove(id);
  }

  /**
   * Sends a test event to the specified webhook to verify connectivity.
   *
   * @param id The unique identifier of the webhook
   * @param dto Test configuration (optional test event type)
   * @returns Result of the test delivery
   */
  @Post('webhooks/:id/test')
  @ApiOperation({
    summary: 'Test webhook',
    description:
      'Trigger a sample event to verify the target URL is reachable and correctly configured.',
  })
  @ApiStandardResponse()
  async test(@Param('id') id: string, @Body() dto: TestWebhookDto): Promise<any> {
    return this.testingService.testDelivery(id, dto);
  }

  /**
   * Retrieves recent delivery history for a specific webhook.
   *
   * @param id The unique identifier of the webhook
   * @param query Pagination and filtering for delivery records
   * @returns Paginated list of webhook delivery attempts
   */
  @Get('webhooks/:id/deliveries')
  @ApiOperation({
    summary: 'Get webhook deliveries',
    description:
      'Fetch a history of delivery attempts, status codes, and response bodies for a specific webhook.',
  })
  @ApiStandardResponse({ message: 'Deliveries retrieved' })
  async getDeliveries(
    @Param('id') id: string,
    @Query() query: QueryWebhookDeliveriesDto,
  ): Promise<any> {
    return this.deliveriesService.findAll(id, query);
  }

  @Post('webhooks/:id/enable')
  @ApiOperation({ summary: 'Enable webhook' })
  @ApiStandardResponse({ message: 'Webhook enabled' })
  async enableWebhook(@Param('id') id: string): Promise<any> {
    await this.webhooksService.update(id, { enabled: true });
    return { id, status: 'active' };
  }

  @Post('webhooks/:id/disable')
  @ApiOperation({ summary: 'Disable webhook' })
  @ApiStandardResponse({ message: 'Webhook disabled' })
  async disableWebhook(@Param('id') id: string): Promise<any> {
    await this.webhooksService.update(id, { enabled: false });
    return { id, status: 'disabled' };
  }

  @Get('webhooks/:id/deliveries/:deliveryId')
  @ApiOperation({ summary: 'Get delivery details' })
  @ApiStandardResponse({ message: 'Delivery details retrieved' })
  async getDeliveryDetails(
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ): Promise<any> {
    const details = await this.prismaRead.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!details || details.webhookId !== id) throw new Error('Delivery not found');
    return details;
  }

  @Post('webhooks/:id/deliveries/:deliveryId/retry')
  @ApiOperation({ summary: 'Retry delivery' })
  @ApiStandardResponse({ message: 'Delivery retry initiated' })
  async retryDelivery(
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ): Promise<any> {
    const delivery = await this.prismaRead.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery || delivery.webhookId !== id) throw new Error('Delivery not found');

    await this.prismaWrite.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING' },
    });

    await this.prismaWrite.outboxEvent.create({
      data: {
        aggregateType: 'WEBHOOK',
        aggregateId: id,
        eventType: 'WEBHOOK_DELIVERY_RETRY',
        payload: { deliveryId },
      },
    });

    return { id: deliveryId, webhookId: id, status: 'pending' };
  }

  @Get('webhooks/:id/stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiStandardResponse({ message: 'Webhook stats retrieved' })
  async getWebhookStats(@Param('id') id: string): Promise<any> {
    const stats = await this.deliveriesService.getDeliveryStats(id);
    const total = Object.values(stats as Record<string, number>).reduce((a, b) => a + b, 0);
    const failed = stats['FAILED'] || 0;
    const successRate = total > 0 ? ((total - failed) / total) * 100 : 100;

    return { webhookId: id, total, failed, stats, successRate: parseFloat(successRate.toFixed(2)) };
  }
}
