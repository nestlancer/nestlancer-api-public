import { Test, TestingModule } from '@nestjs/testing';
import { MailModule } from '../../src/mail.module';
import { MailService } from '../../src/mail.service';
import { ConfigModule } from '@nestjs/config';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

describe('MailModule (Integration)', () => {
  let module: TestingModule;
  let service: MailService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        MailModule.forRoot({
          provider: 'smtp',
          smtp: { host: 'localhost', port: 587, secure: false },
        }),
      ],
      providers: [],
    }).compile();

    service = module.get<MailService>(MailService);
    service.onModuleInit();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send an email using the transporter', async () => {
    const result = await service.send({
      to: 'test@example.com',
      subject: 'Integration Test',
      text: 'Hello from integration test',
    });

    expect(result.messageId).toBe('test-id');
  });

  it('should send an email from a template', async () => {
    const result = await service.sendTemplate('welcome', 'user@example.com', { name: 'John Doe' });
    expect(result.messageId).toBe('test-id');
  });
});
