import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ContactStatus, ContactSubject } from '@nestlancer/common';

import { ContactResponseLog } from '../entities/contact-response-log.entity';

/**
 * Data Transfer Object representing a detailed contact inquiry response.
 */
export class ContactMessageResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier',
  })
  id: string;

  @ApiProperty({ example: 'John Doe', description: 'Name of the requester' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({ enum: ContactSubject, description: 'Primary subject' })
  subject: ContactSubject;

  @ApiProperty({ example: 'I have a question...', description: 'Original message' })
  message: string;

  @ApiProperty({ enum: ContactStatus, description: 'Current processing status' })
  status: ContactStatus;

  @ApiPropertyOptional({ example: 0.1, description: 'Automated spam probability score' })
  spamScore?: number;

  @ApiProperty({ type: [Object], description: 'History of administrative responses' })
  responses: ContactResponseLog[];

  @ApiProperty({ description: 'Timestamp when the inquiry was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the inquiry was last updated' })
  updatedAt: Date;
}
