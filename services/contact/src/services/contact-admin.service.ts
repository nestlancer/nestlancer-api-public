import { Injectable, Logger } from '@nestjs/common';

import { ContactStatus, ResourceNotFoundException } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

@Injectable()
export class ContactAdminService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async getStatistics() {
    const [total, newMessages, spam] = await Promise.all([
      this.prismaRead.contactMessage.count(),
      this.prismaRead.contactMessage.count({ where: { status: ContactStatus.NEW } }),
      this.prismaRead.contactMessage.count({ where: { status: ContactStatus.SPAM } }),
    ]);

    return { total, newMessages, spam };
  }

  async markAsSpam(id: string) {
    const contact = await this.prismaRead.contactMessage.findUnique({ where: { id } });
    if (!contact) {
      throw new ResourceNotFoundException('ContactMessage', id);
    }

    return this.prismaWrite.contactMessage.update({
      where: { id },
      data: { status: ContactStatus.SPAM },
    });
  }
}
