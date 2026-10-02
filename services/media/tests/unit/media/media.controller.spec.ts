import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from '../../../src/media/media.controller';
import { MediaService } from '../../../src/media/media.service';
import { ShareService } from '../../../src/share/share.service';
import { JwtAuthGuard } from '@nestlancer/auth-lib';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('MediaController', () => {
  let controller: MediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: {},
        },
        {
          provide: ShareService,
          useValue: {
            listSharesByUploader: jest.fn().mockResolvedValue({ data: [], total: 0 }),
          },
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
