import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { NotificationTemplatesService } from './notification-templates.service';
import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../dto/update-notification-template.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@nestlancer/auth-lib';
import { UserRole, ApiStandardResponse } from '@nestlancer/common';

/**
 * Legacy URL prefixes for notification templates admin API.
 * Excluded from OpenAPI so documented routes only appear once (no duplicate operationId).
 */
@ApiTags('Admin/Notification Templates')
@ApiBearerAuth()
@Controller(['admin/templates', 'admin/notification-templates'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class NotificationTemplatesAdminLegacyController {
  constructor(private readonly templatesService: NotificationTemplatesService) {}

  @Get()
  @ApiExcludeEndpoint()
  @ApiStandardResponse(Object)
  async getTemplates(): Promise<any> {
    return this.templatesService.findAll();
  }

  @Post()
  @ApiExcludeEndpoint()
  @ApiStandardResponse(Object)
  async createTemplate(@Body() dto: CreateNotificationTemplateDto): Promise<any> {
    return this.templatesService.create(dto);
  }

  @Patch(':id')
  @ApiExcludeEndpoint()
  @ApiStandardResponse(Object)
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ): Promise<any> {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @ApiExcludeEndpoint()
  @ApiStandardResponse(Object)
  async deleteTemplate(@Param('id') id: string): Promise<any> {
    return this.templatesService.delete(id);
  }
}
