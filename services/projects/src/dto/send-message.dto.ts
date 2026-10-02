import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for sending a message within a project context.
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'The textual content of the message',
    example: 'Can you please update the logo color?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
