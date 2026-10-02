import { MailService } from '../../src/mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('Mail Integration', () => {
  let service: MailService;
  let mockTransporter: any;

  beforeAll(() => {
    // Mock nodemailer for integration tests to prevent actual network calls,
    // but simulate a realistic response.
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'integration-msg-123' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    service = new MailService({
      provider: 'smtp',
      from: 'integration@test.com',
      smtp: { host: 'localhost', port: 1025, secure: false },
    });
    service.onModuleInit();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should integrate with template engine and send email successfully', async () => {
    const result = await service.sendTemplate(
      'invoice',
      'client@test.com',
      { invoiceNumber: 'INV-001', amount: '$500', dueDate: '2024-12-31' },
      'Your Invoice is Ready',
    );

    expect(result.messageId).toBe('integration-msg-123');
    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: 'integration@test.com',
      to: 'client@test.com',
      subject: 'Your Invoice is Ready',
      html: expect.stringMatching(/<h1>Invoice #INV-001<\/h1>.*\$500.*2024-12-31/),
      attachments: undefined,
      bcc: undefined,
      cc: undefined,
      replyTo: undefined,
      text: undefined,
    });
  });
});
