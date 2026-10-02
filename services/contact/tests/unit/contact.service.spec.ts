import { Test, TestingModule } from '@nestjs/testing';

import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

import { ContactService } from '../../src/services/contact.service';

describe('ContactService', () => {
  let service: ContactService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaWriteService, useValue: { contactMessage: { update: jest.fn() } } },
        {
          provide: PrismaReadService,
          useValue: {
            contactMessage: {
              findUnique: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
