import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { DeliverableReviewService } from '../../services/deliverable-review.service';
import { ApproveDeliverableDto } from '../../dto/approve-deliverable.dto';
import { RejectDeliverableDto } from '../../dto/reject-deliverable.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for client-side review of submitted deliverables.
 */
@ApiTags('Deliverable Reviews')
@ApiBearerAuth()
@Auth()
@Controller('deliverables')
@ApiStandardResponses()
export class DeliverableReviewsController {
  constructor(private readonly reviewService: DeliverableReviewService) {}

  /**
   * Approves a specific deliverable submission.
   */
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a deliverable' })
  @ApiParam({ name: 'id', description: 'Deliverable UUID' })
  @ApiResponse({ status: 200, description: 'Deliverable approved' })
  async approveDeliverable(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: ApproveDeliverableDto,
  ): Promise<any> {
    const data = await this.reviewService.approve(id, userId, dto);
    return { status: 'success', data };
  }

  /**
   * Rejects a deliverable submission, typically requiring changes.
   */
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a deliverable' })
  @ApiParam({ name: 'id', description: 'Deliverable UUID' })
  @ApiResponse({ status: 200, description: 'Deliverable rejected' })
  async rejectDeliverable(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: RejectDeliverableDto,
  ): Promise<any> {
    const data = await this.reviewService.reject(id, userId, dto);
    return { status: 'success', data };
  }
}
