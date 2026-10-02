import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { createPgPool } from './utils/pg-pool.util';

/** Primary Prisma client for write operations (ADR-005) */
@Injectable()
export class PrismaWriteService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  [key: string]: any;
  private readonly logger = new Logger(PrismaWriteService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL must be set');
    }
    const pool = createPgPool(connectionString);
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    } as any);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to primary database...');
    await this.$connect();
    this.logger.log('Connected to primary database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from primary database');
  }
}
