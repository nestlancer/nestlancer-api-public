import { ProgressEntryType, Visibility } from '../interfaces/progress.interface';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents an entry in the project progress timeline.
 */
export class ProgressEntryResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174333',
    description: 'Unique identifier for the progress entry',
  })
  id: string;

  @ApiProperty({
    enum: ProgressEntryType,
    example: ProgressEntryType.UPDATE,
    description: 'The type of progress update',
  })
  type: ProgressEntryType;

  @ApiProperty({ example: 'Research Complete', description: 'The title of the update' })
  title: string;

  @ApiProperty({
    example: 'Finished all user interviews for the initial phase.',
    description: 'Detailed content of the update',
  })
  description: string;

  @ApiProperty({
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174111',
    description: 'Optional associated milestone ID',
  })
  milestoneId?: string;

  @ApiProperty({
    type: [Object],
    required: false,
    description: 'Attached files or media references',
  })
  attachments?: any[];

  @ApiProperty({
    enum: Visibility,
    example: Visibility.CLIENT_VISIBLE,
    description: 'Privacy level of the entry',
  })
  visibility: Visibility;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID of the creator',
  })
  createdBy: string;

  @ApiProperty({ example: '2024-01-10T16:00:00Z', description: 'Timestamp of creation' })
  createdAt: Date;
}
