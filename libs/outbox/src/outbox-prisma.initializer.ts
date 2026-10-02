import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';

import { OutboxRepository } from './outbox.repository';

/** Wires PrismaWriteService into OutboxRepository at module bootstrap. */
@Injectable()
export class OutboxPrismaInitializer implements OnModuleInit {
  constructor(
    private readonly repository: OutboxRepository,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  onModuleInit(): void {
    this.repository.setPrisma(this.prismaWrite);
  }
}
