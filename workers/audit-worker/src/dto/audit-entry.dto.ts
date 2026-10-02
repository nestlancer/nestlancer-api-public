import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsDateString,
  IsUUID,
  IsIP,
} from 'class-validator';

export class AuditEntryDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  resourceType?: string;

  @IsString()
  @IsOptional()
  resourceId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsIP()
  @IsOptional()
  ip?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  impersonatedBy?: string;

  @IsOptional()
  createdAt?: string | Date;
}
