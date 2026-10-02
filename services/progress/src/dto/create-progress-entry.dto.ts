import {
  IsEnum,
  IsString,
  MaxLength,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressEntryType, Visibility } from '../interfaces/progress.interface';

@ValidatorConstraint({ name: 'internalNotifyClientConflict', async: false })
class InternalNotifyClientConflictConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as CreateProgressEntryDto;
    const isInternal =
      obj.visibility === Visibility.INTERNAL || obj.type === ProgressEntryType.INTERNAL_NOTE;
    if (isInternal && obj.notifyClient === true) {
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'notifyClient cannot be true when visibility is INTERNAL or type is INTERNAL_NOTE';
  }
}

/**
 * Data Transfer Object for creating a new progress entry in the timeline.
 */
export class CreateProgressEntryDto {
  @ApiProperty({
    enum: ProgressEntryType,
    example: ProgressEntryType.UPDATE,
    description: 'The type of progress update',
  })
  @IsEnum(ProgressEntryType)
  type: ProgressEntryType;

  @ApiProperty({
    example: 'Backend Infrastructure Ready',
    maxLength: 200,
    description: 'Short title for the update',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'Completed the migration to the new database schema...',
    maxLength: 5000,
    description: 'Detailed update content',
  })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174111',
    description: 'Associated milestone UUID',
  })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174222'],
    description: 'List of deliverable UUIDs covered by this update',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deliverableIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174444'],
    description: 'List of media/attachment UUIDs',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to send a notification to the client',
  })
  @IsOptional()
  @IsBoolean()
  @Validate(InternalNotifyClientConflictConstraint)
  notifyClient?: boolean = true;

  @ApiPropertyOptional({
    enum: Visibility,
    default: Visibility.CLIENT_VISIBLE,
    description: 'Who can see this progress entry',
  })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility = Visibility.CLIENT_VISIBLE;
}
