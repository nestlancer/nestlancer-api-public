import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { MilestoneApprovalService } from '../../services/milestone-approval.service';
import { ApproveMilestoneDto } from '../../dto/approve-milestone.dto';
import { RequestMilestoneRevisionDto } from '../../dto/request-milestone-revision.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for client-side approval and revision requests for project milestones.
 */
@ApiTags('Milestone Approvals')
@ApiBearerAuth()
@Auth()
@Controller('milestones')
@ApiStandardResponses()
export class MilestoneApprovalsController {
  constructor(private readonly approvalService: MilestoneApprovalService) {}

  /**
   * Approves a milestone, marking it as finalized and potentially triggering payment milestones.
   */
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a milestone' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({ status: 200, description: 'Milestone approved successfully' })
  async approveMilestone(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: ApproveMilestoneDto,
  ): Promise<any> {
    const data = await this.approvalService.approve(id, userId, dto);
    return { status: 'success', data };
  }

  /**
   * Requests a revision for a completed milestone if requirements were not fully met.
   */
  @Post(':id/request-revision')
  @ApiOperation({ summary: 'Request revision on a milestone' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({ status: 200, description: 'Revision request submitted' })
  async requestRevision(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: RequestMilestoneRevisionDto,
  ): Promise<any> {
    const data = await this.approvalService.requestRevision(id, userId, dto);
    return { status: 'success', data };
  }
}
