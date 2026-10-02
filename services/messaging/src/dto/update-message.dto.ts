import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating an existing message.
 */
export class UpdateMessageDto {
  @ApiProperty({
    example: 'Updated message content',
    description: 'The new content of the message',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
