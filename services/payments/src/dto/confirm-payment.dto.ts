import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for confirming a payment (Razorpay).
 */
export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'order_987abc',
    description: 'The payment intent or order ID from the payment provider',
  })
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string; // Razorpay Order ID

  @ApiProperty({
    example: 'pay_123xyz',
    description: 'The external transaction ID from the payment provider',
  })
  @IsString()
  @IsNotEmpty()
  externalPaymentId: string; // Razorpay Payment ID

  @ApiProperty({
    example: 'sig_abc123...',
    description: 'Security signature for payment verification',
  })
  @IsString()
  @IsNotEmpty()
  signature: string; // Razorpay Signature for verification
}
