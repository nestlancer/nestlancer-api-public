import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Auth } from '@nestlancer/auth-lib';
import { DeliverablesService } from '../../services/deliverables.service';
import { UploadDeliverableDto } from '../../dto/upload-deliverable.dto';
import { UpdateDeliverableDto } from '../../dto/update-deliverable.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';
import { DeliverableResponseDto } from '../../dto/deliverable-response.dto';

/**
 * Controller for administrative management of project deliverables.
 */
@ApiTags('Admin/Deliverables')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin')
@ApiStandardResponses()
export class DeliverablesAdminController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  /**
   * Uploads a new deliverable submission for a project.
   */
  @Post('projects/:projectId/deliverables')
  @ApiOperation({ summary: 'Upload deliverable' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiStandardResponse({ type: DeliverableResponseDto })
  async uploadDeliverable(
    @Param('projectId') projectId: string,
    @Body() dto: UploadDeliverableDto,
  ): Promise<any> {
    const data = await this.deliverablesService.create(projectId, dto);
    return { status: 'success', data };
  }

  /**
   * Lists all deliverables submitted for a specific project.
   */
  @Get('projects/:projectId/deliverables')
  @ApiOperation({ summary: 'List project deliverables' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiStandardResponse({ type: DeliverableResponseDto, isArray: true })
  async getProjectDeliverables(@Param('projectId') projectId: string): Promise<any> {
    const data = await this.deliverablesService.getProjectDeliverables(projectId);
    return { status: 'success', data };
  }

  /**
   * Updates the metadata or description of an existing deliverable.
   */
  @Patch('deliverables/:id')
  @ApiOperation({ summary: 'Update deliverable metadata' })
  @ApiParam({ name: 'id', description: 'Deliverable UUID' })
  @ApiStandardResponse({ type: DeliverableResponseDto })
  async updateDeliverable(
    @Param('id') id: string,
    @Body() dto: UpdateDeliverableDto,
  ): Promise<any> {
    const data = await this.deliverablesService.update(id, dto);
    return { status: 'success', data };
  }

  /**
   * Permanent removal of a deliverable submission.
   */
  @Delete('deliverables/:id')
  @ApiOperation({ summary: 'Delete deliverable' })
  @ApiParam({ name: 'id', description: 'Deliverable UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Deliverable deleted' })
  async deleteDeliverable(@Param('id') id: string): Promise<any> {
    await this.deliverablesService.delete(id);
    return { status: 'success' };
  }
}
