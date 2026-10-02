import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../dto/update-notification-template.dto';

interface NotificationTemplateResponse {
  id: string;
  name: string;
  eventType: string;
  titleTemplate: string;
  messageTemplate: string;
  channels: Record<string, unknown> | string[];
  priority: string;
  isActive: boolean;
  variables?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationTemplatesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  @ReadOnly()
  async findAll(): Promise<NotificationTemplateResponse[]> {
    const templates = await this.prismaRead.notificationTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    return templates.map((t) => this.formatTemplateResponse(t));
  }

  @ReadOnly()
  async findByEventType(eventType: string): Promise<NotificationTemplateResponse | null> {
    const template = await this.prismaRead.notificationTemplate.findFirst({
      where: { eventType, isActive: true },
    });
    return template ? this.formatTemplateResponse(template) : null;
  }

  @ReadOnly()
  async findById(id: string): Promise<NotificationTemplateResponse> {
    const template = await this.prismaRead.notificationTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Notification template with ID ${id} not found`);
    }
    return this.formatTemplateResponse(template);
  }

  async create(dto: CreateNotificationTemplateDto): Promise<NotificationTemplateResponse> {
    const { titleTemplate, messageTemplate, channels, priority, isActive } =
      this.normalizeCreatePayload(dto);

    const template = await this.prismaWrite.notificationTemplate.upsert({
      where: { name: dto.name },
      create: {
        name: dto.name,
        eventType: dto.eventType,
        titleTemplate,
        messageTemplate,
        channels: channels as Prisma.InputJsonValue,
        priority: priority as any,
        isActive,
      },
      update: {
        eventType: dto.eventType,
        titleTemplate,
        messageTemplate,
        channels: channels as Prisma.InputJsonValue,
        priority: priority as any,
        isActive,
      },
    });
    return this.formatTemplateResponse(template);
  }

  async update(
    id: string,
    dto: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplateResponse> {
    await this.findById(id);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.eventType !== undefined) updateData.eventType = dto.eventType;
    if (dto.titleTemplate !== undefined) updateData.titleTemplate = dto.titleTemplate;
    if (dto.messageTemplate !== undefined) updateData.messageTemplate = dto.messageTemplate;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.channels !== undefined) {
      updateData.channels = dto.channels;
      if (!Array.isArray(dto.channels) && typeof dto.channels === 'object') {
        if ((dto.channels as any).title) updateData.titleTemplate = (dto.channels as any).title;
        if ((dto.channels as any).message)
          updateData.messageTemplate = (dto.channels as any).message;
      }
    }

    const template = await this.prismaWrite.notificationTemplate.update({
      where: { id },
      data: updateData,
    });
    return this.formatTemplateResponse(template);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prismaWrite.notificationTemplate.delete({
      where: { id },
    });
  }

  async toggleActive(id: string): Promise<NotificationTemplateResponse> {
    const existing = await this.findById(id);
    const template = await this.prismaWrite.notificationTemplate.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return this.formatTemplateResponse(template);
  }

  private normalizeCreatePayload(dto: CreateNotificationTemplateDto): {
    titleTemplate: string;
    messageTemplate: string;
    channels: Record<string, unknown> | string[];
    priority: string;
    isActive: boolean;
  } {
    const channels = dto.channels ?? ['IN_APP'];
    let titleTemplate = dto.titleTemplate ?? dto.name;
    let messageTemplate = dto.messageTemplate ?? '';

    if (!Array.isArray(channels) && typeof channels === 'object') {
      if (typeof (channels as any).title === 'string') titleTemplate = (channels as any).title;
      if (typeof (channels as any).message === 'string')
        messageTemplate = (channels as any).message;
    }

    return {
      titleTemplate,
      messageTemplate,
      channels,
      priority: dto.priority ?? 'NORMAL',
      isActive: dto.isActive ?? true,
    };
  }

  private formatTemplateResponse(template: any): NotificationTemplateResponse {
    return {
      id: template.id,
      name: template.name,
      eventType: template.eventType,
      titleTemplate: template.titleTemplate,
      messageTemplate: template.messageTemplate,
      channels: template.channels as Record<string, unknown> | string[],
      priority: template.priority,
      isActive: template.isActive,
      variables: template.variables as Record<string, unknown> | undefined,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
