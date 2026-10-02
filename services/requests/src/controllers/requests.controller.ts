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
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  Res,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiStandardResponse, ApiStandardResponses, Public } from '@nestlancer/common';
import { ActiveUser, JwtAuthGuard } from '@nestlancer/auth-lib';
import { PrismaReadService } from '@nestlancer/database';
import { RequestsService } from '../services/requests.service';
import { RequestAttachmentsService } from '../services/request-attachments.service';
import { RequestStatsService } from '../services/request-stats.service';
import { CreateRequestDto } from '../dto/create-request.dto';
import { UpdateRequestDto } from '../dto/update-request.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

/**
 * Controller for managing client project requests and their lifecycle.
 */
@ApiTags('Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
@ApiStandardResponses()
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly attachmentsService: RequestAttachmentsService,
    private readonly statsService: RequestStatsService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Evaluates the operational status of the Requests service.
   *
   * @returns A promise resolving to the physical health status of the service
   */
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description:
      'Confirm that the project requests microservice is reachable and functioning correctly.',
  })
  @ApiStandardResponse()
  async healthCheck(): Promise<any> {
    return { status: 'ok', service: 'requests' };
  }

  /**
   * Initializes a new project request record in the draft state.
   * Clients can iterate on draft requests before final submission.
   *
   * @param userId The unique identifier of the requesting user
   * @param dto Initial configuration and requirements for the project
   * @param res Express response object for setting custom status codes
   * @returns A promise resolving to the newly created request object
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new request',
    description: 'Register a new project proposal in the system as a draft.',
  })
  @ApiStandardResponse({ message: 'Request created successfully in draft status' })
  async createRequest(
    @ActiveUser('sub') userId: string,
    @Body() dto: CreateRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const result = await this.requestsService.createRequest(userId, dto);
    res.status(HttpStatus.CREATED);
    return result;
  }

  /**
   * Retrieves a paginated list of all project requests associated with the authenticated user.
   *
   * @param userId The unique identifier of the active user
   * @returns A promise resolving to a collection of the user's project requests
   */
  @Get()
  @ApiOperation({
    summary: 'List my requests',
    description:
      'Fetch all project proposals you have created, including drafts and submitted items.',
  })
  @ApiStandardResponse()
  async listRequests(
    @ActiveUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.requestsService.getMyRequests(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
    });
  }

  /**
   * Retrieves aggregated request statistics for the current user.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get user request statistics' })
  @ApiStandardResponse()
  async getStats(@ActiveUser('sub') userId: string): Promise<any> {
    return this.statsService.getUserStats(userId);
  }

  /**
   * Retrieves the complete status transition history for a specific request.
   */
  @Get(':id/status')
  @ApiOperation({ summary: 'Get request status timeline' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse()
  async getStatusTimeline(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.requestsService.getStatusTimeline(userId, id);
  }

  /**
   * Retrieves full details for a specific project request.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get request details' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse()
  async getRequestDetails(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.requestsService.getRequestDetails(userId, id);
  }

  /**
   * Updates an existing draft or active project request.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse({ message: 'Request updated successfully' })
  async updateRequest(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
  ): Promise<any> {
    return this.requestsService.updateRequest(userId, id, dto);
  }

  /**
   * Formally submits a draft request for review and quoting.
   */
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit request for review' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse({
    message: 'Request submitted successfully. You will receive a quote within 24-48 hours.',
  })
  @HttpCode(HttpStatus.OK)
  async submitRequest(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    return this.requestsService.submitRequest(userId, id);
  }

  /**
   * Removes a project request record.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse({ message: 'Request deleted successfully' })
  async deleteRequest(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    return this.requestsService.deleteRequest(userId, id);
  }

  // --- Attachments ---

  /**
   * Lists all files attached to a specific project request.
   */
  @Get(':id/attachments')
  @ApiOperation({ summary: 'List request attachments' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse()
  async getAttachments(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    return this.attachmentsService.getAttachments(userId, id);
  }

  /**
   * Uploads a new file attachment to a request.
   */
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiStandardResponse({ message: 'Attachment uploaded successfully' })
  async addAttachment(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const result = await this.attachmentsService.addAttachment(userId, id, file);
    res.status(HttpStatus.CREATED);
    return result;
  }

  /**
   * Deletes a specific attachment from a project request.
   */
  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete attachment' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment UUID' })
  @ApiStandardResponse({ message: 'Attachment removed successfully' })
  async removeAttachment(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<any> {
    return this.attachmentsService.removeAttachment(userId, id, attachmentId);
  }

  /**
   * Returns a presigned download URL for a request attachment.
   */
  @Get(':id/attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Get attachment download URL' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment UUID' })
  @ApiStandardResponse()
  async getAttachmentDownloadUrl(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<any> {
    return this.attachmentsService.getAttachmentDownloadUrl(userId, id, attachmentId);
  }

  /**
   * Retrieves all official quotes issued for a specific client request.
   */
  @Get(':id/quotes')
  @ApiOperation({ summary: 'Get quotes for a request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiStandardResponse()
  async getRequestQuotes(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    // Verify user owns the request
    await this.requestsService.getRequestDetails(userId, id);

    const quotes = await this.prismaRead.quote.findMany({
      where: {
        requestId: id,
        // NL-QUOTE-006: hide drafts until admin Send.
        status: { notIn: ['DRAFT', 'PENDING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { requestId: id, quotes };
  }
}
