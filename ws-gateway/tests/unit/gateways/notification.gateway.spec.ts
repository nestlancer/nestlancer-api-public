import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from '../../../src/gateways/notification.gateway';
import { WsConnectionService } from '../../../src/services/connection.service';
import { WsAuthGuard } from '@nestlancer/websocket';
import { ExecutionContext } from '@nestjs/common';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;

  beforeEach(async () => {
    const mockConnectionService = {
      addConnection: jest.fn(),
      removeConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        { provide: WsConnectionService, useValue: mockConnectionService },
      ],
    })
      .overrideGuard(WsAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => true,
      })
      .compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
