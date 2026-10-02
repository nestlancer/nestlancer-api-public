import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { createPgPool } from './utils/pg-pool.util';

/** Read replica Prisma client (ADR-005). Falls back to primary if no read URL configured. */
@Injectable()
export class PrismaReadService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  [key: string]: any;
  private readonly logger = new Logger(PrismaReadService.name);

  constructor() {
    const connectionString = process.env.DATABASE_READ_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL or DATABASE_READ_URL must be set');
    }
    const pool = createPgPool(connectionString);
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    } as any);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to read replica...');
    await this.$connect();
    this.logger.log('Connected to read replica');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
