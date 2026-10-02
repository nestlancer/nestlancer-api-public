import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';
import { ApiStandardResponse, ApiStandardResponses, Public, ClientIp } from '@nestlancer/common';
import { ActiveUser, JwtAuthGuard } from '@nestlancer/auth-lib';
import { QuotesService } from '../services/quotes.service';
import { QuoteStatusService } from '../services/quote-status.service';
import { QuotePdfService } from '../services/quote-pdf.service';
import { QuoteStatsService } from '../services/quote-stats.service';
import { AcceptQuoteDto } from '../dto/accept-quote.dto';
import { DeclineQuoteDto } from '../dto/decline-quote.dto';
import { RequestQuoteChangesDto } from '../dto/request-quote-changes.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for managing client-side quote interactions and details.
 */
@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotes')
@ApiStandardResponses()
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly statusService: QuoteStatusService,
    private readonly pdfService: QuotePdfService,
    private readonly statsService: QuoteStatsService,
  ) {}

  /**
   * Evaluates the operational health of the Quotes service.
   *
   * @returns A promise resolving to the service health metadata
   */
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Confirm that the quotes microservice is alive and operational.',
  })
  @ApiStandardResponse()
  async healthCheck(): Promise<any> {
    return { status: 'ok', service: 'quotes' };
  }

  /**
   * Retrieves a paginated list of all quotes issued to the current user.
   *
   * @param userId The unique identifier of the authenticated user
   * @returns A promise resolving to a collection of the user's quotes
   */
  @Get()
  @ApiOperation({
    summary: 'List my quotes',
    description: 'Fetch all quotes and proposals that have been sent to your account.',
  })
  @ApiStandardResponse()
  async listQuotes(
    @ActiveUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<any> {
    return this.quotesService.getMyQuotes(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      sortBy,
      sortOrder,
    });
  }

  /**
   * Retrieves aggregated quote metrics and performance KPIs for the user.
   *
   * @param userId The unique identifier of the authenticated user
   * @returns A promise resolving to a statistical overview of the user's quotes
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get user quote statistics',
    description: 'Fetch a bird-eye view of your quoting activity, including acceptance rates.',
  })
  @ApiStandardResponse()
  async getStats(@ActiveUser('sub') userId: string): Promise<any> {
    return this.statsService.getUserStats(userId);
  }

  /**
   * Retrieves detailed information for a specific quote.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get quote details' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse()
  async getQuoteDetails(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @ClientIp() ip: string,
    @Req() req: { headers: Record<string, string | string[] | undefined> },
  ): Promise<any> {
    const userAgent = String(req.headers['user-agent'] ?? '');
    return this.quotesService.getQuoteDetails(userId, id, { ip, userAgent });
  }

  /**
   * Accepts a quote and initiates the project creation workflow.
   */
  @Post(':id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept quote' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse({ message: 'Quote accepted successfully. Project has been created.' })
  async acceptQuote(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: AcceptQuoteDto,
  ): Promise<any> {
    return this.statusService.acceptQuote(userId, id, dto);
  }

  /**
   * Declines a quote with optional qualitative feedback.
   */
  @Post(':id/decline')
  @HttpCode(200)
  @ApiOperation({ summary: 'Decline quote' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse({ message: 'Quote declined. Your feedback has been sent.' })
  async declineQuote(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: DeclineQuoteDto,
  ): Promise<any> {
    return this.statusService.declineQuote(userId, id, dto);
  }

  /**
   * Requests specific modifications or clarifications on a quote.
   */
  @Post(':id/request-changes')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request quote changes' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse({ message: 'Change request submitted.' })
  async requestChanges(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: RequestQuoteChangesDto,
  ): Promise<any> {
    return this.statusService.requestChanges(userId, id, dto);
  }

  /**
   * Returns a presigned cloud storage URL for the latest quote PDF.
   */
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download quote PDF' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiResponse({ status: 200, description: 'Presigned download URL' })
  async downloadPdf(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    return this.pdfService.getPdfDownloadUrl(userId, id);
  }
}
