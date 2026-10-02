import { Injectable, Logger } from '@nestjs/common';

import { ResourceNotFoundException, ContactStatus } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { EmailJobType, publishEmailJob } from '@nestlancer/email';
import { OutboxService } from '@nestlancer/outbox';
import { QueuePublisherService } from '@nestlancer/queue';

import { RespondContactDto } from '../dto/respond-contact.dto';

interface ContactResponseResult {
  id: string;
  contactMessageId: string;
  adminId: string;
  subject: string;
  message: string;
  sentAt: Date;
}

@Injectable()
export class ContactResponseService {
  private readonly logger = new Logger(ContactResponseService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly queuePublisher: QueuePublisherService,
    private readonly outbox: OutboxService,
  ) {}

  async respond(
    contactId: string,
    adminId: string,
    dto: RespondContactDto,
  ): Promise<ContactResponseResult> {
    const contactMessage = await this.prismaRead.contactMessage.findUnique({
      where: { id: contactId },
    });

    if (!contactMessage) {
      throw new ResourceNotFoundException('ContactMessage', contactId);
    }

    const inquirySubject =
      typeof contactMessage.subject === 'string' && contactMessage.subject.trim()
        ? contactMessage.subject.trim().replace(/_/g, ' ')
        : 'Your inquiry';
    const subject =
      typeof dto.subject === 'string' && dto.subject.trim()
        ? dto.subject.trim()
        : `Re: ${inquirySubject}`.slice(0, 200);

    // Create response log and update status in one transaction
    const result = await this.prismaWrite.$transaction(async (tx: any) => {
      // Create the response log
      const responseLog = await tx.contactResponseLog.create({
        data: {
          contactMessageId: contactId,
          adminId,
          subject,
          message: dto.message,
          sentAt: new Date(),
        },
      });

      // Update contact message status if requested
      if (dto.markAsResponded) {
        await tx.contactMessage.update({
          where: { id: contactId },
          data: { status: ContactStatus.RESPONDED as any },
        });
      }

      await this.outbox.createEvent(
        {
          aggregateType: 'ContactMessage',
          aggregateId: contactId,
          type: 'CONTACT_RESPONSE_SENT',
          payload: {
            contactId,
            ticketId: contactMessage.ticketId,
            email: contactMessage.email,
            subject,
          },
        },
        tx,
      );

      return responseLog;
    });

    await publishEmailJob(this.queuePublisher, {
      type: EmailJobType.CONTACT_RESPONSE,
      to: contactMessage.email,
      senderProfile: 'support',
      data: {
        name: contactMessage.name,
        subject,
        message: dto.message,
        ticketId: contactMessage.ticketId,
        contactId,
      },
    });

    this.logger.log(`Response sent for contact message ${contactId} by admin ${adminId}`);

    return {
      id: result.id,
      contactMessageId: result.contactMessageId,
      adminId: result.adminId,
      subject: result.subject,
      message: result.message,
      sentAt: result.sentAt,
    };
  }

  async getResponseHistory(contactId: string): Promise<ContactResponseResult[]> {
    const responses = await this.prismaRead.contactResponseLog.findMany({
      where: { contactMessageId: contactId },
      orderBy: { sentAt: 'desc' },
    });

    return responses.map((r) => ({
      id: r.id,
      contactMessageId: r.contactMessageId,
      adminId: r.adminId,
      subject: r.subject,
      message: r.message,
      sentAt: r.sentAt,
    }));
  }
}
