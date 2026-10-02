import { IsString, IsOptional, MaxLength, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@nestlancer/common';

/**
 * Data Transfer Object for creating a new message.
 */
export class CreateMessageDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Project ID (exactly one of projectId or threadId is required)',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description:
      'Chat thread ID for direct or group messaging (exactly one of projectId or threadId)',
  })
  @IsUUID()
  @IsOptional()
  threadId?: string;

  @ApiPropertyOptional({
    example: 'Hello, how is the progress?',
    description: 'Text content of the message',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    example: '660f9511-f30c-52e5-b827-557766551111',
    description: 'ID of the message being replied to',
  })
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional({
    example: '019e578b-64e6-7578-b70d-7d99a2529658',
    description: 'Media ID for file attachments (requires type FILE)',
  })
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional({
    enum: MessageType,
    default: MessageType.TEXT,
    description: 'Type of the message',
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;
}
