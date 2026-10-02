import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { QueuePublisherService } from '@nestlancer/queue';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly queueService: QueuePublisherService,
  ) {}

  async findAll() {
    return this.prismaRead.emailTemplate.findMany();
  }

  async findOne(id: string) {
    const template = await this.prismaRead.emailTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async findByName(name: string) {
    return this.prismaRead.emailTemplate.findUnique({ where: { name } });
  }

  async upsertByName(dto: CreateEmailTemplateDto) {
    return this.prismaWrite.emailTemplate.upsert({
      where: { name: dto.name },
      create: {
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        variables: (dto.variables ?? undefined) as Prisma.InputJsonValue | undefined,
        description: dto.description,
      },
      update: {
        subject: dto.subject,
        body: dto.body,
        ...(dto.variables !== undefined
          ? { variables: dto.variables as Prisma.InputJsonValue }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  async update(id: string, dto: UpdateEmailTemplateDto) {
    await this.findOne(id);
    return this.prismaWrite.emailTemplate.update({
      where: { id },
      data: {
        subject: dto.subject,
        body: dto.body,
      },
    });
  }

  async sendTestEmail(id: string, email: string) {
    const template = await this.findOne(id);
    await this.queueService.publish('email', 'TEMPLATE_TEST', {
      to: email,
      templateId: template.id,
      mockData: true,
    });
    return { success: true, message: `Test email queued for ${email}` };
  }
}
