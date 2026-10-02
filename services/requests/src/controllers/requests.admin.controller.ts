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
  HttpStatus,
  Res,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  BusinessLogicException,
  UserRole,
  clampPagination,
} from '@nestlancer/common';
import { ActiveUser, JwtAuthGuard, RolesGuard, Roles } from '@nestlancer/auth-lib';
import { RequestsAdminService } from '../services/requests.admin.service';
import { QuotesAdminService } from '../services/quotes.admin.service';
import { RequestStatsService } from '../services/request-stats.service';
import { RequestAttachmentsService } from '../services/request-attachments.service';
import { AdminCapacityService } from '../services/admin-capacity.service';
import { UpdateRequestStatusDto } from '../dto/update-request-status.dto';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { QuotePrefillDto } from '../dto/quote-prefill.dto';
import { AddNoteDto } from '../dto/add-note.dto';
import { UpdateRequestAdminDto } from '../dto/update-request-admin.dto';
import { AssignRequestDto } from '../dto/assign-request.dto';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Controller for administrative management and review of project requests.
 */
@ApiTags('Admin/Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/requests')
@ApiStandardResponses()
export class RequestsAdminController {
  constructor(
    private readonly adminService: RequestsAdminService,
    private readonly quotesService: QuotesAdminService,
    private readonly statsService: RequestStatsService,
    private readonly attachmentsService: RequestAttachmentsService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly capacityService: AdminCapacityService,
  ) {}

  /**
   * Retrieves a global registry of all project requests in the system.
   * Supports administrative filtering by status and paginated viewing.
   *
   * @param page Current target page index
   * @param limit Maximum amount of records to retrieve per response
   * @param status Optional filter for project request status
   * @returns A promise resolving to a paginated collection of all matching requests
   */
  @Get()
  @ApiOperation({
    summary: 'List all requests (Admin)',
    description: 'Access the system-wide repository of all project proposals for review.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: '20', description: 'Results per page' })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'inbox',
    description:
      'Filter by request status, or use queue shortcuts: inbox (submitted + under review + changes requested), all (include drafts). Default excludes client drafts.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by client user ID',
  })
  @ApiStandardResponse()
  async listRequests(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ): Promise<any> {
    const { page: pageNum, limit: limitNum } = clampPagination(page, limit);
    return this.adminService.listRequests(pageNum, limitNum, status, userId);
  }

  /**
   * Retrieves aggregated administrative statistics for all project requests platform-wide.
   * Includes volume trends, conversion rates, and status distribution.
   *
   * @returns A promise resolving to a global statistical overview of all project requests
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get overall request statistics',
    description: 'Access administrative KPIs and volume data for all user project proposals.',
  })
  @ApiStandardResponse()
  async getOverallStats(): Promise<any> {
    return this.statsService.getOverallStats();
  }

  @Get('capacity/dashboard')
  @ApiOperation({ summary: 'Admin capacity usage dashboard' })
  async getCapacityDashboard() {
    const data = await this.capacityService.getCapacityDashboard();
    return { status: 'success', data };
  }

  @Patch('settings/capacity')
  @ApiOperation({ summary: 'Update admin capacity settings' })
  async updateCapacity(@Body() body: Record<string, unknown>) {
    const data = await this.capacityService.updateSettings(body as any);
    return { status: 'success', data };
  }

  /**
   * Accesses the full administrative record and audit Trail for a single project request.
   *
   * @param id The unique identifier of the requested project
   * @returns A promise resolving to the comprehensive request administrative details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get request administrative details',
    description: 'Retrieve detailed metadata, content, and history for any project proposal.',
  })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse()
  async getRequestDetails(@Param('id') id: string): Promise<any> {
    return this.adminService.getRequestDetailsAdmin(id);
  }

  /**
   * Transitions a request to a new status and adds administrative notes.
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update request status (Admin)' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse({ message: 'Request status updated successfully' })
  async updateRequestStatus(
    @Param('id') id: string,
    @ActiveUser('sub') adminId: string,
    @Body() dto: UpdateRequestStatusDto,
  ): Promise<any> {
    return this.adminService.updateRequestStatus(id, adminId, dto.status, dto.notes);
  }

  /**
   * Issues a formal quote based on a reviewed project request.
   */
  @Post(':id/quotes')
  @ApiOperation({ summary: 'Create quote from request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse({ message: 'Quote created successfully' })
  async createQuote(
    @Param('id') id: string,
    @ActiveUser('sub') adminId: string,
    @Body() dto: CreateQuoteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const result = await this.quotesService.createQuote(id, adminId, dto);
    res.status(HttpStatus.CREATED);
    return result;
  }

  /**
   * Returns editable quote suggestions from a past quote (does not create a quote).
   */
  @Post(':id/quotes/prefill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get quote prefill suggestions from a past quote',
    description:
      'Returns suggested line items and terms for admin review. ' +
      'Does not persist — use POST /admin/requests/:id/quotes to create.',
  })
  @ApiParam({ name: 'id', description: 'Target request UUID' })
  @ApiStandardResponse()
  async suggestQuotePrefill(@Param('id') id: string, @Body() dto: QuotePrefillDto): Promise<any> {
    return this.quotesService.suggestQuotePrefill(id, dto);
  }

  /**
   * Adds an internal administrative note to a request record.
   */
  @Post(':id/notes')
  @ApiOperation({ summary: 'Add internal note' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse({ message: 'Internal note added' })
  async addNote(
    @Param('id') id: string,
    @ActiveUser('sub') adminId: string,
    @Body() dto: AddNoteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const result = await this.adminService.addNote(id, adminId, dto.content);
    res.status(HttpStatus.CREATED);
    return result;
  }

  /**
   * Lists all internal notes associated with a project request.
   */
  @Get(':id/notes')
  @ApiOperation({ summary: 'List request notes' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse()
  async getNotes(@Param('id') id: string): Promise<any> {
    return this.adminService.getNotes(id);
  }

  /**
   * Updates an existing request's core details (Admin override).
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update request details (Admin)' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse({ message: 'Request updated successfully' })
  async updateRequest(
    @Param('id') id: string,
    @Body() dto: UpdateRequestAdminDto,
  ): Promise<any> {
    const data: {
      title?: string;
      description?: string;
      category?: string;
      additionalInfo?: string;
      timeframe?: string;
    } = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.additionalInfo !== undefined) data.additionalInfo = dto.additionalInfo;
    if (dto.timeframe !== undefined) data.timeframe = dto.timeframe;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No updatable fields provided');
    }

    const req = await this.prismaWrite.projectRequest.update({
      where: { id },
      data,
    });
    return { requestId: id, updated: true, data: req };
  }

  /**
   * Assigns a staff member or team to a specific project request.
   */
  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign request to staff' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse({ message: 'Request assigned successfully' })
  @HttpCode(HttpStatus.OK)
  async assignRequest(
    @Param('id') id: string,
    @ActiveUser('sub') adminId: string,
    @Body() body: AssignRequestDto,
  ): Promise<any> {
    const assignee = await this.prismaWrite.user.findUnique({
      where: { id: body.assigneeId },
      select: { id: true, role: true, status: true },
    });
    if (!assignee || assignee.role !== UserRole.ADMIN || assignee.status !== 'ACTIVE') {
      throw new BusinessLogicException(
        'Assignee must be an active admin',
        'REQUEST_013',
      );
    }

    await this.prismaWrite.projectRequest.update({
      where: { id },
      data: { assigneeId: assignee.id },
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'REQUEST_ASSIGNED',
        aggregateType: 'REQUEST',
        aggregateId: id,
        payload: { assigneeId: assignee.id, assignedBy: adminId },
      },
    });

    return { requestId: id, assignedTo: assignee.id, assignedBy: adminId };
  }

  /**
   * Permanent removal of a project request record (Admin only).
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete request (Admin)' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Request deleted' })
  async deleteRequest(@Param('id') id: string): Promise<any> {
    await this.prismaWrite.projectRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { requestId: id, deleted: true };
  }

  @Get(':id/attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Get attachment download URL (Admin)' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment UUID' })
  @ApiStandardResponse()
  async getAttachmentDownloadUrl(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<any> {
    return this.attachmentsService.getAttachmentDownloadUrlAdmin(id, attachmentId);
  }
}
