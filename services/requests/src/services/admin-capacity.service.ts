import { Injectable } from '@nestjs/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';

@Injectable()
export class AdminCapacityService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async getSettings() {
    const row = await (this.prismaRead as any).adminCapacitySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    return (
      row ?? {
        availabilityStatus: 'AVAILABLE',
        maxConcurrentProjects: 25,
        autoRejectWhenBusy: false,
      }
    );
  }

  async updateSettings(raw: Record<string, unknown>) {
    const data = this.allowlistedCapacityUpdate(raw ?? {});
    const existing = await (this.prismaRead as any).adminCapacitySettings.findFirst();
    if (existing) {
      return (this.prismaWrite as any).adminCapacitySettings.update({
        where: { id: existing.id },
        data,
      });
    }
    return (this.prismaWrite as any).adminCapacitySettings.create({ data });
  }

  /** Prisma update used to accept the raw body — keep an explicit allowlist. */
  private allowlistedCapacityUpdate(raw: Record<string, unknown>): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (raw.availabilityStatus !== undefined) {
      const status = String(raw.availabilityStatus).trim().toUpperCase();
      if (!['AVAILABLE', 'BUSY', 'UNAVAILABLE'].includes(status)) {
        throw new BusinessLogicException('Invalid availability status', 'CAPACITY_003');
      }
      data.availabilityStatus = status;
    }
    if (raw.maxConcurrentProjects !== undefined) {
      const max = Number(raw.maxConcurrentProjects);
      if (!Number.isInteger(max) || max < 1 || max > 500) {
        throw new BusinessLogicException(
          'maxConcurrentProjects must be an integer from 1 to 500',
          'CAPACITY_003',
        );
      }
      data.maxConcurrentProjects = max;
    }
    if (raw.autoRejectWhenBusy !== undefined) {
      if (typeof raw.autoRejectWhenBusy !== 'boolean') {
        throw new BusinessLogicException('autoRejectWhenBusy must be a boolean', 'CAPACITY_003');
      }
      data.autoRejectWhenBusy = raw.autoRejectWhenBusy;
    }
    if (raw.unavailableMessage !== undefined && raw.unavailableMessage !== null) {
      const message = String(raw.unavailableMessage).trim();
      if (message.length > 500) {
        throw new BusinessLogicException('unavailableMessage must be 500 characters or fewer', 'CAPACITY_003');
      }
      data.unavailableMessage = message || null;
    }
    if (raw.unavailableUntil !== undefined && raw.unavailableUntil !== null && raw.unavailableUntil !== '') {
      const until = new Date(String(raw.unavailableUntil));
      if (Number.isNaN(until.getTime())) {
        throw new BusinessLogicException('unavailableUntil must be a valid date', 'CAPACITY_003');
      }
      data.unavailableUntil = until;
    }
    if (Object.keys(data).length === 0) {
      throw new BusinessLogicException('No capacity settings to update', 'CAPACITY_003');
    }
    return data;
  }

  async assertCanAcceptRequest(): Promise<void> {
    const settings = await this.getSettings();
    if (settings.availabilityStatus === 'UNAVAILABLE') {
      throw new BusinessLogicException(
        settings.unavailableMessage || 'Studio is currently unavailable',
        'CAPACITY_001',
        { unavailableUntil: settings.unavailableUntil },
      );
    }

    if (!settings.autoRejectWhenBusy) return;

    const active = await this.prismaRead.project.count({
      where: {
        status: { in: ['IN_PROGRESS', 'REVIEW', 'PAYMENT_OVERDUE', 'PENDING_PAYMENT'] as any },
      },
    });

    if (active >= settings.maxConcurrentProjects) {
      throw new BusinessLogicException(
        'Studio is at capacity. Please try again later.',
        'CAPACITY_002',
        { maxConcurrentProjects: settings.maxConcurrentProjects },
      );
    }
  }

  async getCapacityDashboard() {
    const settings = await this.getSettings();
    const activeProjects = await this.prismaRead.project.count({
      where: {
        status: { in: ['IN_PROGRESS', 'REVIEW', 'PAYMENT_OVERDUE', 'PENDING_PAYMENT'] as any },
      },
    });
    const pendingPayments = await this.prismaRead.payment.count({
      where: { status: { in: ['CREATED', 'PENDING'] } },
    });
    const max = Math.max(1, settings.maxConcurrentProjects ?? 25);
    const capacityUsedPercent = Math.round((activeProjects / max) * 100);
    const isOverCapacity = activeProjects > max;
    // NL-BUG-PIPE-002: operator "AVAILABLE" must not contradict live over-capacity.
    // UNAVAILABLE stays sticky; otherwise surface BUSY when utilization exceeds max.
    let availabilityStatus = String(settings.availabilityStatus ?? 'AVAILABLE').toUpperCase();
    if (availabilityStatus !== 'UNAVAILABLE' && isOverCapacity) {
      availabilityStatus = 'BUSY';
    }
    return {
      activeProjects,
      pendingPayments,
      maxConcurrentProjects: max,
      // Honest utilization (may exceed 100% when max is below live active count).
      capacityUsedPercent,
      isOverCapacity,
      availabilityStatus,
    };
  }
}
