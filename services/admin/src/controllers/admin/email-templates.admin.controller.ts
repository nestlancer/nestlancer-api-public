import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ApiStandardResponses, ApiStandardResponse } from '@nestlancer/common';
import { AdminGuard } from '../../guards/admin.guard';

import { EmailTemplatesService } from '../../services/email-templates.service';
import { UpdateEmailTemplateDto } from '../../dto/update-email-template.dto';
import { CreateEmailTemplateDto } from '../../dto/create-email-template.dto';

/**
 * Controller for managing system email templates.
 * Provides endpoints for listing, retrieving, updating, and testing email templates.
 *
 * @category Admin
 */
@ApiTags('Admin - Email Templates')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('system/email-templates')
@ApiStandardResponses()
export class EmailTemplatesAdminController {
  constructor(private readonly emailService: EmailTemplatesService) {}

  /**
   * Retrieves a list of all defined email templates.
   *
   * @returns Array of email template metadata
   */
  @Get()
  @ApiOperation({
    summary: 'List email templates',
    description: 'Fetch all available email templates in the system.',
  })
  @ApiStandardResponse({ message: 'Templates retrieved' })
  async list(): Promise<any> {
    return this.emailService.findAll();
  }

  /**
   * Create or upsert an email template by unique name (idempotent / seed-safe).
   */
  @Post()
  @ApiOperation({
    summary: 'Create or upsert email template',
    description: 'Upsert an email template by unique name. Safe to re-run during seeding.',
  })
  @ApiStandardResponse({ message: 'Template upserted' })
  async create(@Body() dto: CreateEmailTemplateDto): Promise<any> {
    return this.emailService.upsertByName(dto);
  }

  /**
   * Collection-level preview (NL-BUG-SYS-002). Auditors called
   * POST /admin/system/email-templates/preview which previously 404'd;
   * id-scoped GET :id/preview already existed.
   */
  @Post('preview')
  @ApiOperation({
    summary: 'Preview email template by id',
    description: 'Render a template with sample variables. Body: { templateId } or { id }.',
  })
  @ApiStandardResponse({ message: 'Template previewed' })
  async previewByBody(@Body() body: { templateId?: string; id?: string }): Promise<any> {
    const id = body?.templateId ?? body?.id;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestException('templateId is required');
    }
    return this.preview(id.trim());
  }

  /**
   * Retrieves a specific email template by its ID.
   *
   * @param id The unique identifier of the template
   * @returns Detailed email template object
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get template',
    description: 'Retrieve the full configuration and body of a specific email template.',
  })
  @ApiStandardResponse({ message: 'Template retrieved' })
  async get(@Param('id') id: string): Promise<any> {
    return this.emailService.findOne(id);
  }

  /**
   * Updates an existing email template's subject or body.
   *
   * @param id The unique identifier of the template
   * @param dto New content for the template
   * @returns Updated email template
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update template',
    description: 'Modify the subject line or body content of an existing email template.',
  })
  @ApiStandardResponse({ message: 'Template updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto): Promise<any> {
    return this.emailService.update(id, dto);
  }

  /**
   * Generates a preview of the email template with mock data.
   * Compiles the template using Handlebars and returns both HTML and text versions.
   *
   * @param id The unique identifier of the template
   * @returns Object containing rendered HTML and text previews
   */
  @Get(':id/preview')
  @ApiOperation({
    summary: 'Preview template',
    description:
      'Render an email template with example data to visualize how it will appear to users.',
  })
  @ApiStandardResponse({ message: 'Template previewed' })
  async preview(@Param('id') id: string): Promise<any> {
    const template = await this.emailService.findOne(id);
    const mockData = this.buildPreviewMockData(template.variables);

    let html = template.body;
    let text = template.body;

    try {
      // Admin-authored bodies are compiled with prototype access disabled.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Handlebars = require('handlebars');
      const runtime = {
        allowProtoPropertiesByDefault: false,
        allowProtoMethodsByDefault: false,
      };
      const safeData = Object.create(null) as Record<string, unknown>;
      for (const [key, value] of Object.entries(mockData)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) {
          safeData[key] = value;
        }
      }
      html = Handlebars.compile(template.body, { noEscape: false, strict: false })(safeData, runtime);
      text = Handlebars.compile(template.body, { noEscape: true, strict: false })(safeData, runtime);
    } catch {
      // Fallback if compilation fails — return escaped body, not an evaluated template.
      html = template.body;
      text = template.body;
    }

    return { html, text, subject: template.subject, mockData };
  }

  /**
   * Sends a test email using the specified template to a given recipient.
   *
   * @param id The unique identifier of the template
   * @param body Recipient address (`email` preferred; `to` accepted as alias)
   * @returns Success confirmation
   */
  @Post(':id/test')
  @ApiOperation({
    summary: 'Send test email',
    description: 'Dispatch a live test email using the specified template to a target address.',
  })
  @ApiStandardResponse({ message: 'Test email sent' })
  async test(@Param('id') id: string, @Body() body: { email?: string; to?: string }): Promise<any> {
    const email = body?.email ?? body?.to;
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new BadRequestException('email is required');
    }
    return this.emailService.sendTestEmail(id, email.trim());
  }

  private buildPreviewMockData(variables: unknown): Record<string, string> {
    const defaults: Record<string, string> = {
      name: 'John Doe',
      userName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      action_url: 'https://example.com/action',
      link: 'https://example.com/verify',
      url: 'https://example.com',
      code: '123456',
      amount: '₹1,000.00',
      projectName: 'Sample Project',
      title: 'Sample Title',
    };

    if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
      for (const key of Object.keys(variables as Record<string, unknown>)) {
        if (!(key in defaults)) {
          defaults[key] = `sample-${key}`;
        }
      }
    }

    return defaults;
  }
}
