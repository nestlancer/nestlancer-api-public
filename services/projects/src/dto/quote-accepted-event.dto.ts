import { IsString, IsUUID } from 'class-validator';

export class QuoteAcceptedEventDto {
  @IsUUID()
  quoteId!: string;

  @IsUUID()
  requestId!: string;

  /** Client id from auth (seed users may use non-UUID ids e.g. test-user-002). */
  @IsString()
  userId!: string;
}
