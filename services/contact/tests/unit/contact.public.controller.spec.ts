import { Test, TestingModule } from '@nestjs/testing';

import { ContactSubject } from '@nestlancer/common';

import { ContactPublicController } from '../../src/controllers/public/contact.public.controller';
import { ContactSubmissionService } from '../../src/services/contact-submission.service';

describe('ContactPublicController', () => {
  let controller: ContactPublicController;
  let submissionService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactPublicController],
      providers: [
        {
          provide: ContactSubmissionService,
          useValue: {
            submit: jest.fn().mockResolvedValue({ ticketId: 'TKT-123' }),
          },
        },
      ],
    }).compile();

    controller = module.get<ContactPublicController>(ContactPublicController);
    submissionService = module.get<ContactSubmissionService>(ContactSubmissionService);
  });

  it('should submit a contact form', async () => {
    const result = await controller.submitContact(
      {
        name: 'Test',
        email: 'a@a.com',
        subject: ContactSubject.SUPPORT,
        message: 'test message',
        turnstileToken: 'abc',
      },
      '127.0.0.1',
    );

    expect(result.data.ticketId).toEqual('TKT-123');
    expect(submissionService.submit).toHaveBeenCalled();
  });
});
