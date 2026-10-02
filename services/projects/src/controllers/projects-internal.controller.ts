import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiStandardResponse, ApiStandardResponses, Public } from '@nestlancer/common';

import { QuoteAcceptedEventDto } from '../dto/quote-accepted-event.dto';
import { ProjectFromQuoteService } from '../services/project-from-quote.service';

/**
 * Inter-service endpoints (Docker network only). Used for synchronous quote→project
 * provisioning when the outbox consumer has not run yet.
 */
@ApiTags('Internal Projects')
@Controller('internal/projects')
@Public()
@ApiStandardResponses()
export class ProjectsInternalController {
  constructor(private readonly projectFromQuote: ProjectFromQuoteService) {}

  @Post('provision-from-quote')
  @ApiOperation({ summary: 'Provision project from accepted quote (inter-service)' })
  @ApiStandardResponse()
  async provisionFromQuote(@Body() dto: QuoteAcceptedEventDto) {
    return this.projectFromQuote.createFromAcceptedQuote(dto);
  }
}
