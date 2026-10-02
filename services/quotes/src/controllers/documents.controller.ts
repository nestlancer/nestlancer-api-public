import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponses, BusinessLogicException, QuoteStatus } from '@nestlancer/common';
import { Auth, ActiveUser } from '@nestlancer/auth-lib';
import { DocumentType } from '@prisma/client';
import { DocumentGenerationService } from '@nestlancer/documents';
import { PrismaReadService } from '@nestlancer/database';
import { ContractPdfService } from '../services/contract-pdf.service';

const CLIENT_HIDDEN_QUOTE_STATUSES = [QuoteStatus.DRAFT, QuoteStatus.PENDING] as const;

@ApiTags('Quote Documents')
@Auth()
@Controller('quotes')
@ApiStandardResponses()
export class QuoteDocumentsController {
  constructor(
    private readonly documentGen: DocumentGenerationService,
    private readonly prismaRead: PrismaReadService,
    private readonly contractPdfService: ContractPdfService,
  ) {}

  @Get(':id/documents/versions')
  @ApiOperation({ summary: 'List quote document versions' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async listVersions(@ActiveUser('sub') userId: string, @Param('id') id: string) {
    await this.assertQuoteAccess(userId, id);
    const quoteDocs = await this.documentGen.listVersionsForUser('QUOTE', id, DocumentType.QUOTE);
    const contractDocs = await this.documentGen.listVersionsForUser(
      'QUOTE',
      id,
      DocumentType.CONTRACT,
    );
    const versions = [...quoteDocs, ...contractDocs].sort(
      (a, b) => b.versionNumber - a.versionNumber,
    );
    return { quoteId: id, versions, quotes: quoteDocs, contracts: contractDocs };
  }

  @Get(':id/contract/preview')
  @ApiOperation({ summary: 'Preview draft service agreement PDF before acceptance' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async previewContract(@ActiveUser('sub') userId: string, @Param('id') id: string) {
    return this.contractPdfService.getContractPreviewUrl(userId, id);
  }

  @Get(':id/contract')
  @ApiOperation({ summary: 'Download signed contract PDF' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async downloadContract(@ActiveUser('sub') userId: string, @Param('id') id: string) {
    return this.contractPdfService.getContractDownloadUrl(userId, id);
  }

  private async assertQuoteAccess(userId: string, quoteId: string) {
    const quote = await this.prismaRead.quote.findFirst({
      where: {
        id: quoteId,
        userId,
        status: { notIn: [...CLIENT_HIDDEN_QUOTE_STATUSES] },
      },
      select: { id: true },
    });
    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');
  }
}
