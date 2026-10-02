import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../../src/mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
  }),
}));

describe('MailService', () => {
  let service: MailService;
  let mockTransporter: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'MAIL_OPTIONS',
          useValue: { provider: 'smtp', from: 'test@host.com' },
        },
        MailService,
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    service.onModuleInit();
    mockTransporter = (nodemailer.createTransport as jest.Mock).mock.results[0].value;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send an email', async () => {
    const mailOptions = {
      to: 'user@test.com',
      subject: 'Hello',
      text: 'Body',
    };

    const result = await service.send(mailOptions);

    expect(result.messageId).toBe('msg-123');
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Hello',
        from: 'test@host.com',
      }),
    );
  });

  it('should render and send the welcome template', async () => {
    await service.sendTemplate('welcome', 'user@test.com', { name: 'John' });

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        html: expect.stringContaining('Welcome to Nestlancer, John!'),
        subject: 'welcome',
      }),
    );
  });

  it('should render and send the reset-password template', async () => {
    await service.sendTemplate(
      'reset-password',
      'user@test.com',
      { resetUrl: 'http://reset', expiry: '1 hour' },
      'Password Reset',
    );

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Password Reset',
        html: expect.stringMatching(/http:\/\/reset.*1 hour/),
      }),
    );
  });

  it('should fallback to default template for unknown template', async () => {
    await service.sendTemplate('unknown-template', 'user@test.com', {
      subject: 'Unknown',
      body: 'Missing',
    });

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        html: expect.stringContaining('Unknown'),
      }),
    );
  });
});
