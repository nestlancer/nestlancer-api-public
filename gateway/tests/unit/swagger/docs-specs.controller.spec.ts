import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '@nestlancer/auth-lib';
import { DocsSpecsController } from '../../../src/swagger/docs-specs.controller';
import { DocsSpecsService } from '../../../src/swagger/docs-specs.service';
import { IS_PUBLIC_KEY } from '@nestlancer/common';

describe('DocsSpecsController', () => {
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocsSpecsController],
      providers: [
        {
          provide: DocsSpecsService,
          useValue: { fetchServiceSpec: jest.fn(), getMergedOpenApiDocument: jest.fn() },
        },
      ],
    }).compile();

    reflector = module.get(Reflector);
  });

  it('is marked @Public so Swagger UI can load specs without JWT', () => {
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      DocsSpecsController.prototype.getSpec,
      DocsSpecsController,
    ]);
    expect(isPublic).toBe(true);
  });

  it('is reachable via JwtAuthGuard documentation path bypass', () => {
    const guard = new JwtAuthGuard(reflector);
    const context = {
      getHandler: () => DocsSpecsController.prototype.getSpec,
      getClass: () => DocsSpecsController,
      switchToHttp: () => ({
        getRequest: () => ({ path: '/api/v1/docs-specs/admin' }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
