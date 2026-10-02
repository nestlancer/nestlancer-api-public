import { Controller, Get, Post, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { Public, ApiStandardResponses } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Webhooks Gateway Controller
 * Routes inbound webhook requests to the Webhooks Service.
 * Outbound webhook management lives at GET/POST /admin/webhooks (admin gateway).
 */
@Controller('webhooks')
@ApiTags('webhooks')
@ApiStandardResponses()
export class WebhooksController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post('razorpay')
  @Public()
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async handleRazorpay(@Req() req: Request) {
    return this.proxy.forward('webhooks', req);
  }

  @Post('github')
  @Public()
  @ApiOperation({ summary: 'GitHub webhook endpoint' })
  async handleGithub(@Req() req: Request) {
    return this.proxy.forward('webhooks', req);
  }

  @Post('cloudflare')
  @Public()
  @ApiOperation({ summary: 'Cloudflare CDN webhook endpoint' })
  async handleCloudflare(@Req() req: Request) {
    return this.proxy.forward('webhooks', req);
  }

  @Post('stripe')
  @Public()
  @ApiOperation({
    summary: 'Stripe webhook endpoint (disabled)',
    description: 'Nestlancer uses Razorpay for payments. Stripe is not an active provider.',
  })
  async handleStripe() {
    throw new HttpException(
      {
        status: 'error',
        error: {
          code: 'WEBHOOK_PROVIDER_DISABLED',
          message: 'Stripe webhooks are not enabled. Nestlancer uses Razorpay for payments.',
        },
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  @Post('inbound/:provider')
  @Public()
  @ApiOperation({ summary: 'Generic webhook endpoint for any provider' })
  @ApiParam({ name: 'provider', description: 'Webhook provider key' })
  async handleProvider(@Req() req: Request, @Param('provider') provider: string) {
    return this.proxy.forward(
      'webhooks',
      req,
      undefined,
      `/api/v1/webhooks/${encodeURIComponent(provider)}`,
    );
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Webhooks service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('webhooks', req);
  }
}
