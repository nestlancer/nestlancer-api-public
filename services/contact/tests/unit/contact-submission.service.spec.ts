import { Test, TestingModule } from '@nestjs/testing';

import { CacheService } from '@nestlancer/cache';
import { RateLimitException, ContactSubject } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';
import { OutboxService } from '@nestlancer/outbox';
import { QueuePublisherService } from '@nestlancer/queue';
import { TurnstileService } from '@nestlancer/turnstile';

import { ContactSubmissionService } from '../../src/services/contact-submission.service';
import { SpamFilterService } from '../../src/services/spam-filter.service';

describe('ContactSubmissionService', () => {
  let service: ContactSubmissionService;
  let cacheService: any;
  let turnstileService: any;
  let prismaWrite: { contactMessage: { create: jest.Mock } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactSubmissionService,
        {
          provide: PrismaWriteService,
          useValue: {
            contactMessage: { create: jest.fn().mockResolvedValue({ id: '1' }), update: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: { incr: jest.fn().mockResolvedValue(1), expire: jest.fn() },
        },
        {
          provide: QueuePublisherService,
          useValue: { publish: jest.fn(), sendToQueue: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: OutboxService,
          useValue: { createEvent: jest.fn().mockResolvedValue('outbox-1') },
        },
        { provide: TurnstileService, useValue: { verify: jest.fn().mockResolvedValue({ success: true }), isEnabled: jest.fn().mockReturnValue(true) } },
        {
          provide: SpamFilterService,
          useValue: {
            checkSpam: jest.fn().mockReturnValue({ isSpam: false, score: 0, reasons: [] }),
          },
        },
      ],
    }).compile();

    service = module.get<ContactSubmissionService>(ContactSubmissionService);
    cacheService = module.get<CacheService>(CacheService);
    turnstileService = module.get<TurnstileService>(TurnstileService);
    prismaWrite = module.get(PrismaWriteService);
  });

  it('should persist SALES, the subject the public contact form sends', async () => {
    await service.submit(
      {
        name: 'UI Audit',
        email: 'audit.contact@example.com',
        subject: ContactSubject.SALES,
        message: 'Please ignore this sales inquiry.',
        turnstileToken: 'dummy-token',
      },
      '127.0.0.1',
    );

    expect(prismaWrite.contactMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subject: ContactSubject.SALES }),
      }),
    );
  });

  it('should successfully submit contact', async () => {
    const result = await service.submit(
      {
        name: 'Test Name',
        email: 'test@example.com',
        subject: ContactSubject.SUPPORT,
        message: 'Hello World',
        turnstileToken: 'dummy-token',
      },
      '127.0.0.1',
    );

    expect(result).toHaveProperty('ticketId');
  });

  it('should throw BusinessLogicException if turnstile fails', async () => {
    turnstileService.verify.mockResolvedValue({ success: false });
    await expect(
      service.submit(
        {
          name: 'Test',
          email: 'a@a.com',
          subject: ContactSubject.SUPPORT,
          message: 'test message long enough',
          turnstileToken: 'invalid',
        },
        '127.0.0.1',
      ),
    ).rejects.toMatchObject({ code: 'CONTACT_005' });
  });

  it('should throw RateLimitException if count > limit', async () => {
    cacheService.incr.mockResolvedValue(4);
    await expect(
      service.submit(
        {
          name: 'Test',
          email: 'a@a.com',
          subject: ContactSubject.SUPPORT,
          message: 'test',
          turnstileToken: 't',
        },
        '127.0.0.1',
      ),
    ).rejects.toThrow();
  });
});
