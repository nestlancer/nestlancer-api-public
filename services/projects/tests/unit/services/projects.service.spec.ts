import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../../../src/services/projects.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { ProjectFromQuoteService } from '../../../src/services/project-from-quote.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prismaRead: PrismaReadService;
  let prismaWrite: PrismaWriteService;
  let projectFromQuote: { createFromAcceptedQuote: jest.Mock };
  let txProjectUpdate: jest.Mock;
  let txOutboxCreate: jest.Mock;

  beforeEach(async () => {
    txProjectUpdate = jest.fn();
    txOutboxCreate = jest.fn();
    projectFromQuote = { createFromAcceptedQuote: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaReadService,
          useValue: {
            project: { findFirst: jest.fn(), groupBy: jest.fn() },
          },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            $transaction: jest.fn((cb) =>
              cb({
                project: { update: txProjectUpdate },
                outbox: { create: txOutboxCreate },
                projectShowcaseConsent: { upsert: jest.fn() },
                quote: { findUnique: jest.fn().mockResolvedValue(null) },
                user: { findUnique: jest.fn(), update: jest.fn() },
              }),
            ),
            project: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
            quote: { findFirst: jest.fn() },
            outbox: { create: jest.fn() },
          },
        },
        { provide: ProjectFromQuoteService, useValue: projectFromQuote },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prismaRead = module.get<PrismaReadService>(PrismaReadService);
    prismaWrite = module.get<PrismaWriteService>(PrismaWriteService);
  });

  describe('getOrProvisionProjectByQuoteId', () => {
    it('returns existing project without provisioning', async () => {
      jest.spyOn(prismaWrite.project, 'findFirst').mockResolvedValue({
        id: 'proj-1',
        status: 'PENDING_PAYMENT',
        title: 'Test',
        createdAt: new Date(),
      } as any);

      const result = await service.getOrProvisionProjectByQuoteId('user-1', 'quote-1');

      expect(result?.projectId).toBe('proj-1');
      expect(projectFromQuote.createFromAcceptedQuote).not.toHaveBeenCalled();
    });

    it('sync-provisions when quote is accepted but project missing', async () => {
      jest
        .spyOn(prismaWrite.project, 'findFirst')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'proj-new',
          status: 'PENDING_PAYMENT',
          title: 'New project',
          createdAt: new Date(),
        } as any);
      jest.spyOn(prismaWrite.quote, 'findFirst').mockResolvedValue({
        id: 'quote-1',
        requestId: 'req-1',
        status: 'ACCEPTED',
      } as any);
      projectFromQuote.createFromAcceptedQuote.mockResolvedValue({
        projectId: 'proj-new',
        created: true,
      });

      const result = await service.getOrProvisionProjectByQuoteId('user-1', 'quote-1');

      expect(projectFromQuote.createFromAcceptedQuote).toHaveBeenCalledWith({
        quoteId: 'quote-1',
        requestId: 'req-1',
        userId: 'user-1',
      });
      expect(result?.projectId).toBe('proj-new');
    });
  });

  describe('approveProject', () => {
    it('should approve project successfully', async () => {
      const mockProj = { id: 'proj1', userId: 'user1', status: 'REVIEW', quoteId: 'q1' };
      jest.spyOn(prismaRead.project, 'findFirst').mockResolvedValue(mockProj as any);

      const dto: any = { rating: 5, feedback: {} };
      const result = await service.approveProject('user1', 'proj1', dto);

      expect(result.status).toEqual('completed');
      expect(txProjectUpdate).toHaveBeenCalled();
      expect(txOutboxCreate).toHaveBeenCalled();
    });

    it('should throw if project not ready', async () => {
      const mockProj = { id: 'proj1', userId: 'user1', status: 'IN_PROGRESS' };
      jest.spyOn(prismaRead.project, 'findFirst').mockResolvedValue(mockProj as any);

      const dto: any = { rating: 5, feedback: {} };
      await expect(service.approveProject('user1', 'proj1', dto)).rejects.toThrow();
    });
  });
});
