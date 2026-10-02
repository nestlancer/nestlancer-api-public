import { Controller, Post, Headers, Body, Req, RawBodyRequest, HttpCode } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';
import { RazorpayWebhookService } from '../../services/razorpay-webhook.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for handling incoming webhooks from Razorpay.
 */
@ApiTags('Webhooks')
@Controller('webhooks/razorpay')
@ApiStandardResponses()
export class RazorpayWebhookController {
  constructor(private readonly webhookService: RazorpayWebhookService) {}

  /**
   * Processes verified asynchronous payment events transmitted by Razorpay.
   * Conducts cryptographic signature verification to ensure the authenticity and integrity of the webhook payload.
   *
   * @param signature Cryptographic signature provided by the provider
   * @param req The raw request object for signature validation
   * @param payload Standardized event payload from Razorpay
   * @returns A promise resolving to the webhook processing result
   */
  @Post()
  @ApiOperation({
    summary: 'Handle Razorpay Webhook',
    description:
      'Securely process external payment status updates and events from the Razorpay provider.',
  })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: any,
  ): Promise<any> {
    const rawBody = req.rawBody?.toString('utf8');
    if (!rawBody) {
      throw new Error('Raw body not found. Make sure rawBody is enabled in NestJS app.');
    }
    return this.webhookService.handleWebhook(signature, rawBody, payload);
  }
}
