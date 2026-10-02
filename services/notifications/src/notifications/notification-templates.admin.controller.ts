import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationTemplatesService } from './notification-templates.service';
import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../dto/update-notification-template.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses, UserRole } from '@nestlancer/common';

/**
 * Controller for administrative management of notification templates.
 * Restricted to administrators.
 *
 * Legacy paths `admin/templates` and `admin/notification-templates` are served by
 * {@link NotificationTemplatesAdminLegacyController} (hidden from OpenAPI).
 */
@ApiTags('Admin/Notification Templates')
@ApiBearerAuth()
/** Canonical admin path; legacy aliases live on {@link NotificationTemplatesAdminLegacyController}. */
@Controller('admin/notifications/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiStandardResponses()
export class NotificationTemplatesAdminController {
  constructor(private readonly templatesService: NotificationTemplatesService) {}

  /**
   * Retrieves a curated registry of all system-wide notification templates.
   *
   * @returns A promise resolving to a collection of notification templates
   */
  @Get()
  @ApiOperation({
    summary: 'Get all notification templates',
    description: 'Access the library of predefined notification structures and content.',
  })
  @ApiStandardResponse(Object)
  async getTemplates(): Promise<any> {
    return this.templatesService.findAll();
  }

  /**
   * Registers and persists a new standardized notification template.
   *
   * @param dto Configuration and content of the new notification template
   * @returns A promise resolving to the created template record
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new template',
    description: 'Define and save a new blueprint for automated notifications.',
  })
  @ApiStandardResponse(Object)
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Body() dto: CreateNotificationTemplateDto): Promise<any> {
    return this.templatesService.create(dto);
  }

  /**
   * Updates an existing notification template.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  @ApiStandardResponse(Object)
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ): Promise<any> {
    return this.templatesService.update(id, dto);
  }

  /**
   * Deletes a notification template.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a template' })
  @ApiStandardResponse(Object)
  async deleteTemplate(@Param('id') id: string): Promise<any> {
    return this.templatesService.delete(id);
  }
}
