import { Controller, Get, Post, Param, Query, UseGuards, Res, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ApiStandardResponses, ApiStandardResponse, UserRole } from '@nestlancer/common';
import { AdminGuard } from '../../guards/admin.guard';

import { AuditService } from '../../services/audit.service';
import { AuditExportService } from '../../services/audit-export.service';
import { QueryAuditDto } from '../../dto/query-audit.dto';
import { ExportAuditDto } from '../../dto/export-audit.dto';

/**
 * Controller for administrative audit log management.
 * Provides endpoints for viewing, searching, and exporting system-wide audit trails.
 *
 * @category Admin
 */
@ApiTags('Admin - Audit')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('audit')
@ApiStandardResponses()
export class AuditAdminController {
  constructor(
    private readonly auditService: AuditService,
    private readonly exportService: AuditExportService,
  ) {}

  /**
   * Retrieves a paginated list of audit logs based on provided query filters.
   *
   * @param query Filters for user ID, resource type, action, and date range
   * @returns Paginated list of audit records
   */
  @Get()
  @ApiOperation({
    summary: 'List audit logs',
    description: 'Retrieve a paginated list of system audit logs with optional filtering.',
  })
  @ApiStandardResponse({ message: 'Logs retrieved' })
  async list(@Query() query: QueryAuditDto): Promise<any> {
    return this.auditService.findAll(query);
  }

  /**
   * Alias for list — auditors and older clients call `/admin/audit/logs`
   * which previously matched `:id` and returned null/not-found (NL-BUG-USR-001).
   */
  @Get('logs')
  @ApiOperation({
    summary: 'List audit logs (alias)',
    description: 'Same as GET /audit — kept so /admin/audit/logs is not treated as an entry id.',
  })
  @ApiStandardResponse({ message: 'Logs retrieved' })
  async listLogsAlias(@Query() query: QueryAuditDto): Promise<any> {
    return this.auditService.findAll(query);
  }

  /**
   * Retrieves aggregate statistics for the audit system.
   * Includes counts of actions and most active resources/users.
   *
   * @returns Audit system status and statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Audit statistics',
    description: 'Get aggregate overview of audit activity.',
  })
  @ApiStandardResponse({ message: 'Statistics retrieved' })
  async getStats(): Promise<any> {
    return this.auditService.getStats();
  }

  /**
   * Retrieves the audit trail for a specific user.
   *
   * @param userId The ID of the user to retrieve the trail for
   * @returns List of audit entries for the user
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: 'User audit trail',
    description: 'Retrieve all audit logs associated with a specific user ID.',
  })
  @ApiStandardResponse({ message: 'User trail retrieved' })
  async getUserTrail(@Param('userId') userId: string): Promise<any> {
    return this.auditService.getUserTrail(userId);
  }

  /**
   * Retrieves the audit trail for a specific resource.
   *
   * @param type The type of resource (e.g., 'Project', 'User')
   * @param id The unique identifier of the resource
   * @returns List of audit entries for the resource
   */
  @Get('resource/:type/:id')
  @ApiOperation({
    summary: 'Resource audit trail',
    description: 'Retrieve all audit logs associated with a specific resource type and ID.',
  })
  @ApiStandardResponse({ message: 'Resource trail retrieved' })
  async getResourceTrail(@Param('type') type: string, @Param('id') id: string): Promise<any> {
    return this.auditService.getResourceTrail(type, id);
  }

  /**
   * Retrieves a single audit log entry by its ID.
   *
   * @param id The unique identifier of the audit log
   * @returns A single audit log entry
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get audit entry',
    description: 'Retrieve detailed information for a specific audit log entry.',
  })
  @ApiStandardResponse({ message: 'Audit entry retrieved' })
  async get(@Param('id') id: string): Promise<any> {
    return this.auditService.findOne(id);
  }

  /**
   * Triggers an asynchronous export of audit logs.
   * The export format and filters are specified in the DTO.
   *
   * @param dto Export configuration (format, filters)
   * @returns Success response indicating the export process has started
   */
  @Post('export')
  @ApiOperation({
    summary: 'Export audit logs',
    description: 'Initiate a background process to export audit logs in CSV or JSON format.',
  })
  @ApiStandardResponse({ message: 'Export started' })
  async export(@Body() dto: ExportAuditDto): Promise<any> {
    return this.exportService.triggerExport(dto);
  }
}
