import { Test, TestingModule } from '@nestjs/testing';
import { ShareController } from '../../../src/share/share.controller';
import { ShareService } from '../../../src/share/share.service';
import { JwtAuthGuard } from '@nestlancer/auth-lib';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('ShareController', () => {
  let controller: ShareController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShareController],
      providers: [
        {
          provide: ShareService,
          useValue: {},
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ShareController>(ShareController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
