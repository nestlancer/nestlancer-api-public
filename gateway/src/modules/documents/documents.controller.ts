import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, ApiStandardResponses } from '@nestlancer/common';
import { HttpProxyService } from '../../proxy';

@Controller('documents')
@ApiTags('documents')
@ApiStandardResponses()
export class DocumentsController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Public()
  @Get('verify/:documentNumber')
  @ApiOperation({ summary: 'Verify document authenticity (public)' })
  @ApiParam({ name: 'documentNumber', description: 'e.g. NL-INV-2026-000042' })
  @ApiResponse({ status: 200, description: 'Document verification metadata' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async verify(@Req() req: Request) {
    return this.proxy.forward(
      'admin',
      req,
      undefined,
      `/api/documents/verify/${req.params.documentNumber}`,
    );
  }

  @Get('mine')
  @ApiOperation({ summary: 'List documents issued to the current user' })
  async listMine(@Req() req: Request) {
    return this.proxy.forward('admin', req, undefined, '/api/documents/mine');
  }

  @Get('mine/:documentId/download')
  @ApiOperation({ summary: 'Download a document issued to the current user' })
  @ApiParam({ name: 'documentId', description: 'GeneratedDocument UUID' })
  async downloadMine(@Req() req: Request) {
    return this.proxy.forward(
      'admin',
      req,
      undefined,
      `/api/documents/mine/${req.params.documentId}/download`,
    );
  }
}
