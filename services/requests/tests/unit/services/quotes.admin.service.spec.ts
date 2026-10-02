import { Test, TestingModule } from '@nestjs/testing';
import { QuotesAdminService } from '../../../src/services/quotes.admin.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';
import { CreateQuoteDto } from '../../../src/dto/create-quote.dto';

describe('QuotesAdminService', () => {
  let service: QuotesAdminService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesAdminService,
        {
          provide: PrismaWriteService,
          useValue: {
            $transaction: jest.fn(),
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            projectRequest: { findFirst: jest.fn() },
            quote: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<QuotesAdminService>(QuotesAdminService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);

    prismaWrite.$transaction.mockImplementation(async (cb: any) => {
      return cb({
        quote: {
          create: jest
            .fn()
            .mockResolvedValue({ id: 'q1', requestId: 'req1', createdAt: new Date(), items: [] }),
        },
        projectRequest: { update: jest.fn().mockResolvedValue({}) },
        requestStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        outbox: { create: jest.fn().mockResolvedValue({}) },
      });
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createQuote', () => {
    const dto: CreateQuoteDto = {
      items: [{ description: 'item1', quantity: 2, unitPrice: 100 }],
      taxPercentage: 10,
      currency: 'INR',
      validUntil: new Date(),
      termsAndConditions: 'test terms',
      internalNotes: 'test notes',
    } as any;

    it('should throw BusinessLogicException if request not found', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue(null);
      await expect(service.createQuote('req1', 'admin1', dto)).rejects.toThrow(
        BusinessLogicException,
      );
    });

    it('should throw BusinessLogicException if request is a client draft', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req1',
        status: 'DRAFT',
      } as any);
      await expect(service.createQuote('req1', 'admin1', dto)).rejects.toThrow(
        BusinessLogicException,
      );
    });

    it('should throw BusinessLogicException if request already has a quote row', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req1',
        status: 'SUBMITTED',
        title: 'Test',
        description: 'Desc',
      } as any);
      prismaRead.quote.findUnique.mockResolvedValue({ id: 'existing' } as any);
      await expect(service.createQuote('req1', 'admin1', dto)).rejects.toThrow(
        'Request already has a quote',
      );
    });

    it('should throw BusinessLogicException if request is already QUOTED', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req1',
        status: 'QUOTED',
      } as any);
      await expect(service.createQuote('req1', 'admin1', dto)).rejects.toThrow(
        BusinessLogicException,
      );
    });

    it('should create a quote via transaction and return formatted quote', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req1',
        userId: 'user1',
        status: 'SUBMITTED',
        title: 'Test',
        description: 'Desc',
      } as any);

      let createdData: Record<string, unknown> = {};
      prismaWrite.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          quote: {
            create: jest.fn().mockImplementation((args) => {
              createdData = args.data;
              return Promise.resolve({
                id: 'q1',
                requestId: 'req1',
                createdAt: new Date(),
              });
            }),
          },
          projectRequest: { update: jest.fn().mockResolvedValue({}) },
          requestStatusHistory: { create: jest.fn().mockResolvedValue({}) },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await service.createQuote('req1', 'admin1', dto);

      expect(prismaWrite.$transaction).toHaveBeenCalled();
      expect(createdData.terms).toEqual(expect.any(String));
      expect(createdData.termsAndConditions).toBe('test terms');
      expect(createdData.paymentSchedule).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Deposit', dueTrigger: 'on_accept' }),
          expect.objectContaining({ label: 'Final payment', dueTrigger: 'on_prior_approved' }),
        ]),
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'q1',
          requestId: 'req1',
          status: 'draft',
          schedulePreset: '50-50',
          paymentSchedule: expect.any(Array),
          amount: {
            subtotal: 20_000,
            taxAmount: 2_000,
            totalAmount: 22_000,
            currency: 'INR',
          },
        }),
      );
    });

    it('does not silently apply VIP discount unless applyClientTierDiscount is set (NL-BUG-PAY-001)', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req1',
        userId: 'user1',
        status: 'SUBMITTED',
        title: 'Test',
        description: 'Desc',
        user: { clientTier: 'VIP' },
      } as any);

      let createdData: Record<string, unknown> = {};
      prismaWrite.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          quote: {
            create: jest.fn().mockImplementation((args) => {
              createdData = args.data;
              return Promise.resolve({ id: 'q-vip', requestId: 'req1', createdAt: new Date() });
            }),
          },
          projectRequest: { update: jest.fn() },
          requestStatusHistory: { create: jest.fn() },
          outbox: { create: jest.fn() },
        });
      });

      const result = await service.createQuote('req1', 'admin1', dto);

      // List-price totals stay as computed; no silent ×0.9.
      expect(createdData.totalAmount).toBe(22_000);
      expect(result.amount.totalAmount).toBe(22_000);

      createdData = {};
      await service.createQuote('req1', 'admin1', {
        ...dto,
        applyClientTierDiscount: true,
      } as any);
      expect(createdData.totalAmount).toBe(19_800);
    });

    it('applies schedulePreset when provided', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req1',
        userId: 'user1',
        status: 'SUBMITTED',
        title: 'Test',
        description: 'Desc',
      } as any);

      let createdData: Record<string, unknown> = {};
      prismaWrite.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          quote: {
            create: jest.fn().mockImplementation((args) => {
              createdData = args.data;
              return Promise.resolve({ id: 'q2', requestId: 'req1', createdAt: new Date() });
            }),
          },
          projectRequest: { update: jest.fn() },
          requestStatusHistory: { create: jest.fn() },
          outbox: { create: jest.fn() },
        });
      });

      await service.createQuote('req1', 'admin1', {
        ...dto,
        schedulePreset: '30-70',
      } as any);

      const schedule = createdData.paymentSchedule as Array<{ amountPaise: number }>;
      expect(schedule).toHaveLength(2);
      expect(schedule[0].amountPaise).toBe(6_600);
      expect(schedule[1].amountPaise).toBe(15_400);
    });

    it('prefills items from service package when prefillFromPackage is true', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req1',
        userId: 'user1',
        status: 'SUBMITTED',
        title: 'Test',
        description: 'Desc',
        servicePackage: {
          revisionsIncluded: 3,
          deliverables: [{ description: 'Discovery', quantity: 1, unitPrice: 15000 }],
          addOns: [],
        },
      } as any);

      const result = await service.createQuote('req1', 'admin1', {
        prefillFromPackage: true,
        taxPercentage: 0,
        currency: 'INR',
        validUntil: new Date().toISOString(),
      } as any);

      expect(result.amount.totalAmount).toBe(1_500_000);
      expect(result.revisionsIncluded).toBe(3);
    });

    it('persists requiresContract and revisionsIncluded from dto', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req1',
        userId: 'user1',
        status: 'SUBMITTED',
        title: 'Test',
        description: 'Desc',
      } as any);

      let createdData: Record<string, unknown> = {};
      prismaWrite.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          quote: {
            create: jest.fn().mockImplementation((args) => {
              createdData = args.data;
              return Promise.resolve({ id: 'q3', requestId: 'req1', createdAt: new Date() });
            }),
          },
          projectRequest: { update: jest.fn() },
          requestStatusHistory: { create: jest.fn() },
          outbox: { create: jest.fn() },
        });
      });

      await service.createQuote('req1', 'admin1', {
        ...dto,
        requiresContract: true,
        revisionsIncluded: 4,
      } as any);

      expect(createdData.requiresContract).toBe(true);
      expect(createdData.revisionsIncluded).toBe(4);
    });
  });

  describe('suggestQuotePrefill', () => {
    it('returns suggestions from source quote without creating a quote', async () => {
      prismaRead.projectRequest.findFirst.mockResolvedValue({
        id: 'req-target',
        status: 'SUBMITTED',
      } as any);
      prismaRead.quote.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'source-q',
        termsAndConditions: '2 revisions included',
        revisionsIncluded: 2,
        requiresContract: false,
        taxPercentage: 0,
        currency: 'INR',
        paymentBreakdown: [
          { description: 'Build', quantity: 1, unitPrice: 100000, totalPrice: 100000 },
        ],
        paymentSchedule: [
          { label: 'Deposit', percentage: 50 },
          { label: 'Final payment', percentage: 50 },
        ],
      } as any);

      const result = await service.suggestQuotePrefill('req-target', {
        sourceQuoteId: 'source-q',
      });

      expect(result.suggestedItems).toHaveLength(1);
      expect(result.suggestedSchedulePreset).toBe('50-50');
      expect(result.suggestedRevisionsIncluded).toBe(2);
    });
  });
});
