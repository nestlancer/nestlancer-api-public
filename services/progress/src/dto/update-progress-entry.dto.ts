import { PartialType } from '@nestjs/swagger';
import { CreateProgressEntryDto } from './create-progress-entry.dto';

/**
 * Data Transfer Object for updating an existing progress entry.
 */
export class UpdateProgressEntryDto extends PartialType(CreateProgressEntryDto) {}
