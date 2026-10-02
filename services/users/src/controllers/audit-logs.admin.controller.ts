import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiStandardResponse, ApiStandardResponses, UserRole, clampPagination } from '@nestlancer/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@nestlancer/auth-lib';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { UsersAdminService } from '../services/users.admin.service';

/**
 * Platform audit logs at GET /admin/logs (gateway canonical path).
 * Returns authentication-category audit events (login, logout, failed attempts).
 */
@ApiTags('Admin/Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/logs')
@ApiStandardResponses()
export class AuditLogsAdminController {
  constructor(private readonly adminService: UsersAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List authentication audit logs' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '50' })
  @ApiStandardResponse()
  async getAuditLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ): Promise<unknown> {
    const { page: pageNum, limit: limitNum } = clampPagination(page, limit);
    return this.adminService.getLogs(pageNum, limitNum, 'auth');
  }

  @Get('security-stats')
  @ApiOperation({ summary: 'Security metrics for audit dashboard' })
  @ApiStandardResponse()
  async getSecurityStats(): Promise<unknown> {
    return this.adminService.getSecurityStats();
  }
}
