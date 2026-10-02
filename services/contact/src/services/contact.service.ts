import { Injectable, Logger } from '@nestjs/common';

import { ResourceNotFoundException, ContactStatus } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService, buildPrismaSkipTake } from '@nestlancer/database';

import { QueryContactsDto } from '../dto/query-contacts.dto';
import { ContactWithResponses } from '../interfaces/contact.interface';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async findAll(query: QueryContactsDto) {
    const { page = 1, limit = 20, status, sortBy = 'createdAt', order = 'desc' } = query as any;
    const { skip, take } = buildPrismaSkipTake({ page, limit });

    const allowedSortFields = ['createdAt', 'status', 'email', 'name'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const normalizedOrder = String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [items, totalItems] = await Promise.all([
      this.prismaRead.contactMessage.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: normalizedOrder },
      }),
      this.prismaRead.contactMessage.count({ where }),
    ]);

    return { items, totalItems };
  }

  async findById(id: string): Promise<ContactWithResponses> {
    const contact = await this.prismaRead.contactMessage.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new ResourceNotFoundException('ContactMessage', id);
    }

    let responses = [];
    try {
      // Best-effort fetching of responses. If Prisma model exists, it will work.
      responses =
        (await (this.prismaRead as any).contactResponseLog?.findMany({
          where: { contactMessageId: id },
          orderBy: { sentAt: 'asc' },
        })) || [];
    } catch (err: any) {
      this.logger.warn(`Failed to fetch contact response log for ${id}: ${err.message}`);
    }

    return {
      ...contact,
      responses,
    } as any;
  }

  async updateStatus(id: string, status: ContactStatus) {
    const contact = await this.prismaRead.contactMessage.findUnique({ where: { id } });
    if (!contact) {
      throw new ResourceNotFoundException('ContactMessage', id);
    }

    return this.prismaWrite.contactMessage.update({
      where: { id },
      data: { status },
    });
  }

  async softDelete(id: string) {
    const contact = await this.prismaRead.contactMessage.findUnique({ where: { id } });
    if (!contact) {
      throw new ResourceNotFoundException('ContactMessage', id);
    }

    // In model ContactMessage, since we don't have deletedAt we might just delete or mark as archived.
    // The spec says "DELETE /:id – Soft-delete contact message."
    // Since there's no deletedAt, I'll update status to ARCHIVED.
    await this.prismaWrite.contactMessage.update({
      where: { id },
      data: { status: ContactStatus.ARCHIVED },
    });
  }
}
