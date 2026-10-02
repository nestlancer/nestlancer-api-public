import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { Auth } from '@nestlancer/auth-lib';
import {
  ApiStandardResponses,
  CurrentUser,
  Idempotent,
  ParseUuidPipe,
  Roles,
  UserRole,
} from '@nestlancer/common';

import { QueryContactsDto } from '../../dto/query-contacts.dto';
import { RespondContactDto } from '../../dto/respond-contact.dto';
import { UpdateContactStatusDto } from '../../dto/update-contact-status.dto';
import { ContactAdminService } from '../../services/contact-admin.service';
import { ContactResponseService } from '../../services/contact-response.service';
import { ContactService } from '../../services/contact.service';

/**
 * Administrative controller for managing contact inquiries.
 * Provides endpoints for listing, viewing, responding to, and updating the status of contact requests.
 *
 * @category Communications
 */
@ApiTags('Contact - Admin')
@ApiBearerAuth()
@Controller('admin/contact')
@Auth(UserRole.ADMIN)
@ApiStandardResponses()
export class ContactAdminController {
  constructor(
    private readonly contactService: ContactService,
    private readonly responseService: ContactResponseService,
    private readonly adminService: ContactAdminService,
  ) {}

  @Roles(UserRole.ADMIN)
  /**
   * Retrieves an exhaustive list of all contact inquiries received.
   * Includes advanced filtering and pagination.
   *
   * @param query Filtering and pagination parameters
   * @returns A promise resolving to a paginated list of inquiries and summary statistics
   */
  @Get()
  @ApiOperation({
    summary: 'List all inquiries',
    description: 'Retrieve a paginated list of all contact inquiries received with statistics.',
  })
  async findAll(@Query() query: QueryContactsDto): Promise<any> {
    const { items, totalItems } = await this.contactService.findAll(query);
    const summary = await this.adminService.getStatistics();

    return {
      data: items,
      summary,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalItems,
        totalPages: Math.ceil(totalItems / (query.limit || 10)),
        hasNext: query.page * (query.limit || 10) < totalItems,
        hasPrev: query.page > 1,
      },
    };
  }

  /**
   * Retrieves the complete lifecycle and content of a specific contact inquiry.
   *
   * @param id Unique identifier (UUID) of the inquiry
   * @returns A promise resolving to the full inquiry details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get inquiry details',
    description: 'Retrieve exhaustive metadata and content for a specific contact inquiry.',
  })
  async getContactDetails(@Param('id', ParseUuidPipe) id: string): Promise<any> {
    return this.contactService.findById(id);
  }

  /**
   * Modifies the internal processing status of a contact inquiry.
   *
   * @param id Unique identifier of the inquiry
   * @param dto Configuration for the new status
   * @returns A promise resolving to the updated inquiry record
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update inquiry status',
    description: 'Transition an inquiry between states like PENDING, RESPONDED, or RESOLVED.',
  })
  async updateStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateContactStatusDto,
  ): Promise<any> {
    return this.contactService.updateStatus(id, dto.status);
  }

  /**
   * Submits an official administrative response to a pending contact inquiry.
   *
   * @param id Unique identifier of the target inquiry
   * @param dto Content and attributes of the response
   * @param admin The authenticated administrator user object
   * @returns A promise resolving to the response confirmation
   */
  @Post(':id/respond')
  @ApiOperation({
    summary: 'Respond to inquiry',
    description: 'Send a professional response to a contact inquiry and notify the requester.',
  })
  async respondToContact(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: RespondContactDto,
    @CurrentUser() admin: any,
  ): Promise<any> {
    const result = await this.responseService.respond(id, admin.userId, dto);
    return {
      message: 'Response sent successfully',
      data: result,
    };
  }

  /**
   * Flag a contact inquiry as spam to improve internal filtering.
   *
   * @param id Unique identifier of the inquiry
   * @returns A promise resolving to the status update confirmation
   */
  @Post(':id/spam')
  @Idempotent()
  @ApiOperation({
    summary: 'Mark as spam',
    description:
      'Identify an inquiry as illegitimate content and update its internal classification.',
  })
  async markAsSpam(@Param('id', ParseUuidPipe) id: string): Promise<any> {
    return this.adminService.markAsSpam(id);
  }

  /**
   * Performs a soft deletion of a contact inquiry record.
   *
   * @param id Unique identifier of the inquiry to remove
   * @returns A promise resolving to the deletion confirmation
   */
  @Delete(':id')
  @Idempotent()
  @ApiOperation({
    summary: 'Delete inquiry',
    description: 'Remove a contact inquiry record from the active administrative view.',
  })
  async deleteContact(@Param('id', ParseUuidPipe) id: string): Promise<any> {
    await this.contactService.softDelete(id);
    return { message: 'Contact deleted successfully' };
  }
}
