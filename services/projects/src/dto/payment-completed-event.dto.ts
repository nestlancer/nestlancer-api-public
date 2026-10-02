import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class PaymentCompletedEventDto {
  @IsUUID()
  paymentId!: string;

  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;
}
