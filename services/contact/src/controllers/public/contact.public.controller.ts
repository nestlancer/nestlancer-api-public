import { Controller, Post, Body, Ip, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiStandardResponses, Idempotent, Public } from '@nestlancer/common';

import { SubmitContactDto } from '../../dto/submit-contact.dto';
import { ContactSubmissionService } from '../../services/contact-submission.service';

/**
 * Public-facing controller for the Contact service.
 * Allows users to submit inquiries and check the status of their contact requests.
 *
 * @category Communications
 */
@ApiTags('Contact - Public')
@Controller('contact')
@ApiStandardResponses()
export class ContactPublicController {
  constructor(private readonly submissionService: ContactSubmissionService) {}

  /**
   * Performs a health check on the contact service.
   *
   * @returns A promise resolving to the status of the service
   */
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Contact service health check',
    description: 'Check if the contact service is operational.',
  })
  async healthCheck(): Promise<any> {
    return { status: 'healthy', service: 'contact' };
  }

  /**
   * Submits a new contact inquiry from the public website.
   *
   * @param dto Contact submission data
   * @param ip The IP address of the client submitting the contact form
   * @returns A promise resolving to the confirmation of submission
   */
  @Public()
  @Idempotent()
  @Post()
  @ApiOperation({
    summary: 'Submit contact inquiry',
    description: 'Submit a new message or inquiry through the contact form.',
  })
  async submitContact(@Body() dto: SubmitContactDto, @Ip() ip: string): Promise<any> {
    const result = await this.submissionService.submit(dto, ip);
    return {
      message: "Your message has been received. We'll be in touch soon.",
      data: result,
    };
  }
}
