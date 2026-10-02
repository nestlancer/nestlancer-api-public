import {
  Controller,
  Post,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookIngestionService } from '../../services/webhook-ingestion.service';
import { ApiStandardResponse, ApiStandardResponses, Public } from '@nestlancer/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

/**
 * Controller responsible for receiving and validating inbound webhooks from various external providers.
 * All endpoints in this controller are public as they are called by external services.
 */
@ApiTags('Webhooks/Receiver')
@Controller()
@ApiStandardResponses()
export class WebhookReceiverController {
  private readonly logger = new Logger(WebhookReceiverController.name);

  constructor(private readonly webhookIngestionService: WebhookIngestionService) {}

  /**
   * Specialized ingestion endpoint for secure Razorpay payment gateway webhooks.
   * Validates and asynchronously dispatches payment success, failure, and refund events.
   *
   * @param headers Collection of HTTP headers for signature validation
   * @param req The raw request object containing the provider payload
   * @returns A promise resolving to the ingestion confirmation
   */
  @Public()
  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Razorpay Webhook',
    description:
      'Capture and queue financial event notifications from the Razorpay payment provider.',
  })
  @ApiBody({
    description: 'Raw Razorpay Webhook Body (provider-specific JSON)',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({ status: 200, description: 'Webhook received and scheduled for processing' })
  async handleRazorpay(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<any> {
    await this.processWebhook('razorpay', req.rawBody, headers);
  }

  /**
   * Specialized ingestion endpoint for Cloudflare edge events and security notices.
   *
   * @param headers HTTP headers for metadata and validation
   * @param req The raw request object from Cloudflare
   * @returns A promise resolving to the ingestion confirmation
   */
  @Public()
  @Post('cloudflare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Cloudflare Webhook',
    description: 'Ingest infrastructure and security events from the Cloudflare edge platform.',
  })
  @ApiBody({
    description: 'Raw Cloudflare Webhook Body (provider-specific JSON)',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({ status: 200, description: 'Webhook received and scheduled for processing' })
  async handleCloudflare(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<any> {
    await this.processWebhook('cloudflare', req.rawBody, headers);
  }

  /**
   * Specialized receiver for GitHub platform events.
   */
  @Public()
  @Post('github')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive GitHub Webhook' })
  @ApiBody({
    description: 'Raw GitHub Webhook Body (provider-specific JSON)',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({ status: 200, description: 'Webhook received and scheduled for processing' })
  async handleGitHub(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<any> {
    await this.processWebhook('github', req.rawBody, headers);
  }

  /**
   * Specialized receiver for Stripe payment platform webhooks.
   */
  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Stripe Webhook' })
  @ApiBody({
    description: 'Raw Stripe Webhook Body (provider-specific JSON)',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({ status: 200, description: 'Webhook received and scheduled for processing' })
  async handleStripe(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<any> {
    await this.processWebhook('stripe', req.rawBody, headers);
  }

  /**
   * Dynamic receiver for arbitrary webhook providers.
   */
  @Public()
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Dynamic Provider Webhook' })
  @ApiParam({ name: 'provider', description: 'Internal identifier for the webhook source' })
  @ApiBody({
    description: 'Raw provider webhook body (JSON)',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({ status: 200, description: 'Webhook received and scheduled for processing' })
  async handleProvider(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<any> {
    await this.processWebhook(provider, req.rawBody, headers);
  }

  /**
   * Internal processing logic for all inbound webhooks.
   * Records the raw payload to the database and dispatches for asynchronous processing.
   */
  private async processWebhook(
    provider: string,
    rawBody: Buffer | undefined,
    headers: Record<string, string>,
  ): Promise<void> {
    if (!rawBody) {
      this.logger.warn(`No raw body found for webhook from provider: ${provider}`);
    }

    await this.webhookIngestionService.handleIncoming(
      provider,
      rawBody || Buffer.from(''),
      headers,
    );
  }
}
