import { Controller, Get, Param, Post, HttpCode, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiStandardResponses } from '@nestlancer/common';
import { Auth } from '@nestlancer/auth-lib';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { PaymentMilestonesService } from '../../services/payment-milestones.service';
import { PaymentGatingService } from '../../services/payment-gating.service';
import { PaymentNotificationService } from '../../services/payment-notification.service';
import { ProgressProxyService } from '../../services/progress-proxy.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for administrative management of payment milestones.
 */
@ApiTags('Admin/Payment Milestones')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin/milestones')
@ApiStandardResponses()
export class PaymentMilestonesAdminController {
  constructor(
    private readonly milestonesService: PaymentMilestonesService,
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly paymentGating: PaymentGatingService,
    private readonly paymentNotifications: PaymentNotificationService,
    private readonly progressProxy: ProgressProxyService,
  ) {}

  /**
   * Retrieves a comprehensive list of payment records associated with a specific project milestone.
   *
   * @param id Unique identifier of the project milestone
   * @returns A promise resolving to the list of associated payments
   */
  @Get(':id/payments')
  @ApiOperation({
    summary: 'List payments for a milestone',
    description:
      'Monitor transaction distribution and status for a specific contractual milestone.',
  })
  @ApiResponse({ status: 200, description: 'Payments list retrieved successfully' })
  async getPaymentsByMilestone(@Param('id') id: string): Promise<any> {
    const data = await this.milestonesService.getPaymentsByMilestone(id);
    return { status: 'success', data };
  }

  /**
   * @deprecated Prefer progress service `POST /admin/milestones/:id/complete` for delivery handoff.
   * Kept for backward compatibility; emits the same outbox type as progress complete.
   */
  @Post(':id/mark-complete')
  @ApiOperation({
    summary: 'Mark milestone as complete (deprecated)',
    deprecated: true,
    description:
      'Use POST /admin/milestones/:id/complete (progress) instead. This endpoint only remains for legacy callers.',
  })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Milestone marked as complete' })
  async markComplete(@Param('id') id: string, @Req() req: Request): Promise<any> {
    return this.progressProxy.completeMilestone(req.headers.authorization, id);
  }

  /**
   * Triggers a payment request for a specific milestone by emitting an outbox event.
   * A downstream worker/notification service picks this up and notifies the client.
   */
  @Post(':id/request-payment')
  @ApiOperation({ summary: 'Request payment for milestone' })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Payment requested successfully' })
  async requestPayment(@Param('id') id: string): Promise<any> {
    await this.paymentGating.assertCanRequestPayment(id);

    const milestone = await this.prismaRead.milestone.findUnique({ where: { id } });
    if (!milestone) {
      return { status: 'error', message: 'Milestone not found' };
    }

    const project = await this.prismaRead.project.findUnique({
      where: { id: milestone.projectId },
      select: { clientId: true, quote: { select: { currency: true } } },
    });

    const existingPayment = await this.prismaRead.payment.findFirst({
      where: {
        milestoneId: id,
        status: { in: ['CREATED', 'PENDING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requestedAt = new Date();
    if (!existingPayment && project?.clientId && milestone.amount) {
      await this.prismaWrite.payment.create({
        data: {
          projectId: milestone.projectId,
          milestoneId: id,
          clientId: project.clientId,
          amount: milestone.amount,
          currency: project.quote?.currency ?? 'INR',
          status: 'CREATED',
          paymentRequestedAt: requestedAt,
        },
      });
    } else if (existingPayment) {
      await this.prismaWrite.payment.update({
        where: { id: existingPayment.id },
        data: { paymentRequestedAt: requestedAt },
      });
    }

    await this.prismaWrite.outbox.create({
      data: {
        type: 'PAYMENT_REQUESTED',
        payload: {
          milestoneId: id,
          projectId: milestone.projectId,
          name: milestone.name,
          amount: milestone.amount ?? null,
          currency: project?.quote?.currency ?? 'INR',
          requestedAt: requestedAt.toISOString(),
        },
      },
    });

    if (project?.clientId && milestone.amount) {
      await this.paymentNotifications.notifyPaymentRequested({
        clientId: project.clientId,
        projectId: milestone.projectId,
        milestoneName: milestone.name,
        amount: milestone.amount,
        currency: project.quote?.currency ?? 'INR',
      });
    }

    return {
      status: 'success',
      data: { id, paymentRequested: true, requestedAt: new Date().toISOString() },
    };
  }
}
