import { Test, TestingModule } from '@nestjs/testing';
import { BusinessLogicException } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';

import { ProjectFromQuoteService } from '../../../src/services/project-from-quote.service';
import { ProjectPaymentScheduleService } from '../../../src/services/project-payment-schedule.service';

describe('ProjectFromQuoteService', () => {
  let service: ProjectFromQuoteService;
  let prisma: {
    project: { findUnique: jest.Mock; findFirst: jest.Mock };
    quote: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let paymentSchedule: { backfillIfMissing: jest.Mock };

  beforeEach(async () => {
    prisma = {
      project: { findUnique: jest.fn(), findFirst: jest.fn() },
      quote: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    paymentSchedule = {
      backfillIfMissing: jest.fn().mockResolvedValue(undefined),
      ensureScheduleWithTemplate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectFromQuoteService,
        { provide: PrismaWriteService, useValue: prisma },
        { provide: ProjectPaymentScheduleService, useValue: paymentSchedule },
      ],
    }).compile();

    service = module.get(ProjectFromQuoteService);
  });

  it('returns existing project when quoteId already has a project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj-1',
      status: 'PENDING_PAYMENT',
      quoteId: 'quote-1',
      clientId: 'user-1',
    });

    const result = await service.createFromAcceptedQuote({
      quoteId: 'quote-1',
      requestId: 'req-1',
      userId: 'user-1',
    });

    expect(result).toEqual({
      projectId: 'proj-1',
      quoteId: 'quote-1',
      requestId: 'req-1',
      status: 'PENDING_PAYMENT',
      created: false,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(paymentSchedule.backfillIfMissing).toHaveBeenCalledWith('proj-1', 'user-1');
  });

  it('creates project in transaction when quote is accepted', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    prisma.quote.findFirst.mockResolvedValue({
      id: 'quote-1',
      requestId: 'req-1',
      userId: 'user-1',
      status: 'ACCEPTED',
      title: 'Test Project',
      description: 'Scope',
      totalAmount: 10000,
      currency: 'INR',
      validUntil: new Date('2026-12-31'),
      timeline: null,
      createdById: 'admin-1',
      requiresContract: false,
    });

    const createdProject = {
      id: 'proj-new',
      quoteId: 'quote-1',
      status: 'PENDING_PAYMENT',
    };

    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        project: { create: jest.fn().mockResolvedValue(createdProject) },
        projectRequest: { update: jest.fn().mockResolvedValue({}) },
        outbox: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await service.createFromAcceptedQuote({
      quoteId: 'quote-1',
      requestId: 'req-1',
      userId: 'user-1',
    });

    expect(result.created).toBe(true);
    expect(result.projectId).toBe('proj-new');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('throws when quote is not accepted', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    prisma.quote.findFirst.mockResolvedValue({
      id: 'quote-1',
      requestId: 'req-1',
      userId: 'user-1',
      status: 'SENT',
      title: 'T',
      description: 'D',
      validUntil: new Date(),
      timeline: null,
    });

    await expect(
      service.createFromAcceptedQuote({
        quoteId: 'quote-1',
        requestId: 'req-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow(BusinessLogicException);
  });
});
