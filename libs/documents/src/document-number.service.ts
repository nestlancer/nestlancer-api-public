import { Injectable } from '@nestjs/common';
import { DocumentType, Prisma } from '@prisma/client';
import { PrismaWriteService } from '@nestlancer/database';
import { DOCUMENT_TYPE_PREFIX } from './interfaces/document.interface';

@Injectable()
export class DocumentNumberService {
  constructor(private readonly prismaWrite: PrismaWriteService) {}

  async assignNumber(type: DocumentType, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || this.prismaWrite;
    const year = new Date().getFullYear();
    const prefix = DOCUMENT_TYPE_PREFIX[type];

    const sequence = await db.documentSequence.upsert({
      where: { type_year: { type, year } },
      create: { type, year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });

    const padded = String(sequence.lastNumber).padStart(6, '0');
    return `${prefix}-${year}-${padded}`;
  }
}
