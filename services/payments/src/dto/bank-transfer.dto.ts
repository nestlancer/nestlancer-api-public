import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitBankTransferDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  milestoneId: string;

  @ApiProperty({ description: 'Amount in paise' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Platform settlement account used for the transfer' })
  @IsUUID()
  @IsNotEmpty()
  platformAccountId: string;

  @ApiProperty({ description: 'UTR / UPI transaction reference' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  transferReference: string;

  @ApiPropertyOptional({ description: 'Client-claimed transfer time (ISO)' })
  @IsOptional()
  @IsDateString()
  transferPaidAt?: string;

  @ApiProperty({
    type: [String],
    description: 'Media IDs of uploaded transfer proofs (image/PDF)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUUID('all', { each: true })
  mediaIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ApproveTransferDto {
  @ApiPropertyOptional({ description: 'Internal verification notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  verificationNotes?: string;
}

export class RejectTransferDto {
  @ApiProperty({ description: 'Reason shown to the client' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({
    description: 'If true, reset payment to CREATED so the client can retry (default true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowRetry?: boolean;
}
