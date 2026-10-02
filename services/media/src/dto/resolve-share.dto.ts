import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Body for POST /share/:token — password must never be sent in the URL. */
export class ResolveShareDto {
  @ApiPropertyOptional({ description: 'Password for a password-protected share link' })
  @IsOptional()
  @IsString()
  password?: string;
}
