import { Controller, Post, Patch, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Auth } from '@nestlancer/auth-lib';
import { MilestonesService } from '../../services/milestones.service';
import { CreateMilestoneDto } from '../../dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../../dto/update-milestone.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';
import { MilestoneResponseDto } from '../../dto/milestone-response.dto';

/**
 * Controller for administrative management of project milestones.
 */
@ApiTags('Admin/Milestones')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin')
@ApiStandardResponses()
export class MilestonesAdminController {
  constructor(private readonly milestonesService: MilestonesService) {}

  /**
   * Creates a new milestone for a project.
   */
  @Post('projects/:projectId/milestones')
  @ApiOperation({ summary: 'Create milestone' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiStandardResponse({ type: MilestoneResponseDto })
  async createMilestone(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ): Promise<any> {
    const data = await this.milestonesService.create(projectId, dto);
    return { status: 'success', data };
  }

  /**
   * Updates an existing milestone's details (dates, description, etc.).
   */
  @Patch('milestones/:id')
  @ApiOperation({ summary: 'Update milestone' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiStandardResponse({ type: MilestoneResponseDto })
  async updateMilestone(@Param('id') id: string, @Body() dto: UpdateMilestoneDto): Promise<any> {
    const data = await this.milestonesService.update(id, dto);
    return { status: 'success', data };
  }

  /**
   * Manually marks a milestone as physically complete, pending client approval.
   */
  @Post('milestones/:id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark milestone complete' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({ status: 200, description: 'Milestone marked as complete' })
  async completeMilestone(@Param('id') id: string): Promise<any> {
    const data = await this.milestonesService.complete(id);
    return { status: 'success', data };
  }
}
