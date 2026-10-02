import { IsString, IsArray, IsObject, IsInt, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for incoming Razorpay webhook event data.
 * Adheres to Razorpay's standard webhook payload structure.
 * @see https://razorpay.com/docs/webhooks/
 */
export class RazorpayWebhookDto {
  @ApiProperty({ description: 'The entity type of the event, usually "event"', example: 'event' })
  @IsString()
  entity: string;

  @ApiProperty({
    description: 'Razorpay Account ID that triggered the webhook',
    example: 'acc_LQ21Z9X7j7Xy',
  })
  @IsString()
  account_id: string;

  @ApiProperty({ description: 'The specific event name', example: 'payment.captured' })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Entities involved in the payload',
    example: ['payment'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  contains: string[];

  @ApiProperty({
    description: 'Detailed event payload containing the actual entity data',
    example: {
      payment: {
        entity: {
          id: 'pay_LQ21Z9X7j7Xy',
          amount: 50000,
          currency: 'INR',
          status: 'captured',
        },
      },
    },
    type: 'object',
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiProperty({ description: 'Unix timestamp of when the event was created', example: 1629881234 })
  @IsInt()
  created_at: number;
}
