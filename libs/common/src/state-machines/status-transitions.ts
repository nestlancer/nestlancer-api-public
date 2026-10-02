import { BadRequestException } from '@nestjs/common';

/** Allowed status transitions per entity type. */
const PROJECT_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['PENDING_CONTRACT', 'PENDING_PAYMENT', 'CANCELLED'],
  PENDING_CONTRACT: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['REVIEW', 'ON_HOLD', 'PAYMENT_OVERDUE', 'SUSPENDED', 'DISPUTED', 'CANCELLED'],
  PAYMENT_OVERDUE: ['IN_PROGRESS', 'SUSPENDED', 'DISPUTED', 'CANCELLED'],
  SUSPENDED: ['IN_PROGRESS', 'PAYMENT_OVERDUE', 'CANCELLED'],
  DISPUTED: ['ON_HOLD', 'IN_PROGRESS', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  REVIEW: ['COMPLETED', 'REVISION_REQUESTED', 'IN_PROGRESS'],
  REVISION_REQUESTED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
};

const REQUEST_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'QUOTED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED'],
  UNDER_REVIEW: ['QUOTED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED'],
  QUOTED: ['ACCEPTED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED_QUOTE', 'CANCELLED'],
  EXPIRED_QUOTE: ['QUOTED', 'REJECTED', 'CANCELLED'],
  CHANGES_REQUESTED: ['SUBMITTED', 'CANCELLED'],
  ACCEPTED: ['CONVERTED_TO_PROJECT', 'CANCELLED'],
  CONVERTED_TO_PROJECT: [],
  REJECTED: [],
  CANCELLED: [],
};

const QUOTE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING', 'SENT', 'CANCELLED'],
  PENDING: ['SENT', 'DRAFT'],
  SENT: ['VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CHANGES_REQUESTED'],
  VIEWED: ['ACCEPTED', 'DECLINED', 'EXPIRED', 'CHANGES_REQUESTED'],
  EXPIRED: ['SENT'],
  CHANGES_REQUESTED: ['REVISED', 'DRAFT'],
  REVISED: ['SENT'],
  ACCEPTED: [],
  DECLINED: ['REVISED'],
};

const MILESTONE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['APPROVED', 'REVISION_REQUESTED'],
  REVISION_REQUESTED: ['IN_PROGRESS', 'COMPLETED'],
  APPROVED: [],
  CANCELLED: [],
};

const PAYMENT_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
  PENDING: ['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: ['REFUNDED', 'DISPUTED'],
  DISPUTED: ['COMPLETED', 'REFUNDED'],
  FAILED: ['PENDING', 'CREATED'],
  REFUNDED: [],
  CANCELLED: [],
};

type EntityType = 'PROJECT' | 'REQUEST' | 'QUOTE' | 'MILESTONE' | 'PAYMENT';

const TRANSITION_MAPS: Record<EntityType, Record<string, string[]>> = {
  PROJECT: PROJECT_TRANSITIONS,
  REQUEST: REQUEST_TRANSITIONS,
  QUOTE: QUOTE_TRANSITIONS,
  MILESTONE: MILESTONE_TRANSITIONS,
  PAYMENT: PAYMENT_TRANSITIONS,
};

export function isValidTransition(entity: EntityType, from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = TRANSITION_MAPS[entity][from];
  return allowed?.includes(to) ?? false;
}

export function assertValidTransition(entity: EntityType, from: string, to: string): void {
  if (!isValidTransition(entity, from, to)) {
    throw new BadRequestException(
      `Invalid ${entity.toLowerCase()} status transition: ${from} → ${to}`,
    );
  }
}

/** Project statuses that block admin delivery work. */
export const PROJECT_WORK_BLOCKED_STATUSES = new Set(['SUSPENDED', 'DISPUTED', 'PAYMENT_OVERDUE']);

export function assertProjectWorkAllowed(status: string): void {
  if (PROJECT_WORK_BLOCKED_STATUSES.has(status)) {
    throw new BadRequestException(`Project work is blocked while status is ${status}`);
  }
}
