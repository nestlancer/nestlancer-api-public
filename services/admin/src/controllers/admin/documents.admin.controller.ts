import { Controller, Get, Headers, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponses, Public } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { DocumentGenerationService } from '@nestlancer/documents';
import { isValidDocumentVerifyToken } from '@nestlancer/pdf';

@ApiTags('Documents')
@Controller('documents')
@ApiStandardResponses()
export class DocumentsAdminController {
  constructor(private readonly documentGen: DocumentGenerationService) {}

  @Public()
  @Get('verify/:documentNumber')
  @ApiOperation({
    summary: 'Verify document authenticity',
    description:
      'Public callers must pass HMAC query `t` (printed on the PDF). Without a valid token the response is indistinguishable from not-found (closes sequential enumeration).',
  })
  @ApiParam({ name: 'documentNumber', description: 'Document number e.g. NL-INV-2026-000042' })
  @ApiQuery({
    name: 't',
    required: false,
    description: 'HMAC verify token from the PDF QR / verification URL',
  })
  async verify(
    @Param('documentNumber') documentNumber: string,
    @Query('t') verifyToken?: string,
    @Headers('x-gateway-source') gatewaySource?: string,
    @Headers('x-verify-detail') verifyDetail?: string,
  ) {
    const trustedAdmin =
      gatewaySource === 'nestlancer-gateway' && verifyDetail === 'admin';

    // Public path: require high-entropy token before any DB lookup so sequential
    // document numbers cannot be enumerated via 200 vs 404.
    if (!trustedAdmin && !isValidDocumentVerifyToken(documentNumber, verifyToken)) {
      throw new NotFoundException(`Document ${documentNumber} not found`);
    }

    const result = await this.documentGen.verifyDocument(documentNumber);
    if (!result) {
      throw new NotFoundException(`Document ${documentNumber} not found`);
    }
    if (trustedAdmin) return result;
    // Public lean payload — no timestamps / version / entity hints.
    return {
      documentNumber: result.documentNumber,
      type: result.type,
      status: result.status,
    };
  }

  @Auth()
  @ApiBearerAuth()
  @Get('mine')
  @ApiOperation({ summary: 'List generated documents issued to the current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'latestOnly', required: false })
  async listMine(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('latestOnly') latestOnly?: string,
  ) {
    // Return the paginated payload under a success envelope so top-level
    // `pagination` is visible (TransformResponseInterceptor otherwise nests it
    // under data and auditors/clients reading envelope.pagination see null).
    const result = await this.documentGen.listIssuedToUser(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      latestOnly: latestOnly === 'false' ? false : true,
    });
    return {
      status: 'success' as const,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Auth()
  @ApiBearerAuth()
  @Get('mine/:documentId/download')
  @ApiOperation({ summary: 'Download a generated document issued to the current user' })
  @ApiParam({ name: 'documentId', description: 'GeneratedDocument UUID' })
  async downloadMine(
    @CurrentUser('userId') userId: string,
    @Param('documentId') documentId: string,
  ) {
    const result = await this.documentGen.getDocumentDownloadUrlForUser(documentId, userId);
    if (!result) {
      throw new NotFoundException('Document not found');
    }
    return {
      documentId: result.id,
      documentNumber: result.documentNumber,
      versionNumber: result.versionNumber,
      documentType: result.documentType,
      downloadUrl: result.downloadUrl,
      pdfUrl: result.downloadUrl,
      filename: result.filename,
      expiresIn: result.expiresIn,
    };
  }

  @Auth('ADMIN')
  @ApiBearerAuth()
  @Get('users/:userId')
  @ApiOperation({ summary: 'List generated documents issued to a user (admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'latestOnly', required: false })
  async listForUser(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('latestOnly') latestOnly?: string,
  ) {
    return this.documentGen.listIssuedToUser(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      latestOnly: latestOnly === 'false' ? false : true,
    });
  }

  @Auth('ADMIN')
  @ApiBearerAuth()
  @Get(':documentId/download')
  @ApiOperation({ summary: 'Download a specific generated document version (admin)' })
  @ApiParam({ name: 'documentId', description: 'GeneratedDocument UUID' })
  async downloadVersion(@Param('documentId') documentId: string) {
    const result = await this.documentGen.getDocumentDownloadUrl(documentId);
    if (!result) {
      throw new NotFoundException('Document not found');
    }
    return {
      documentId: result.id,
      documentNumber: result.documentNumber,
      versionNumber: result.versionNumber,
      documentType: result.documentType,
      downloadUrl: result.downloadUrl,
      pdfUrl: result.downloadUrl,
      filename: result.filename,
      expiresIn: result.expiresIn,
    };
  }
}
