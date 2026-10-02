import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponses } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { DocumentType } from '@prisma/client';
import { DocumentGenerationService } from '@nestlancer/documents';
import { PrismaReadService } from '@nestlancer/database';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Payment Documents')
@ApiBearerAuth()
@Auth()
@Controller('payments')
@ApiStandardResponses()
export class PaymentDocumentsController {
  constructor(
    private readonly documentGen: DocumentGenerationService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  @Get(':id/documents/versions')
  @ApiOperation({ summary: 'List payment document versions' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async listVersions(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    await this.assertPaymentAccess(userId, id);
    const invoices = await this.documentGen.listVersionsForUser(
      'PAYMENT',
      id,
      DocumentType.INVOICE,
    );
    const receipts = await this.documentGen.listVersionsForUser(
      'PAYMENT',
      id,
      DocumentType.RECEIPT,
    );
    const versions = [...invoices, ...receipts].sort((a, b) => b.versionNumber - a.versionNumber);
    return { paymentId: id, versions, invoices, receipts };
  }

  private async assertPaymentAccess(userId: string, paymentId: string) {
    const payment = await this.prismaRead.payment.findFirst({
      where: { id: paymentId, clientId: userId },
      select: { id: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
  }
}
