import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Trim } from '@nestlancer/common';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for adding an internal or collaborative note to a request.
 */
export class AddNoteDto {
  @ApiProperty({
    description: 'The textual content of the note',
    example: 'Initial draft looks good, but need more clarity on the cloud provider requirements.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Trim()
  content: string;
}
