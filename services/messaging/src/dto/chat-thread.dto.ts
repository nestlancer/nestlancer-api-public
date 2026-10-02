import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class DirectThreadDto {
  @ApiPropertyOptional({
    description:
      'The other party (admin or client UUID). Omit for clients to open chat with the platform support admin. Admins must always send this.',
  })
  @IsOptional()
  @IsUUID()
  peerUserId?: string;
}

export class GroupThreadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ type: [String], description: 'At least two client user ids (USER role)' })
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID(undefined, { each: true })
  clientUserIds!: string[];
}

export class UpdateChatThreadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class AddChatThreadMembersDto {
  @ApiProperty({ type: [String], description: 'Client user ids to add (USER role)' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  clientUserIds!: string[];
}
