import { Controller, Post, Get, Delete, Patch, Body, Param } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { PaymentMethodsService } from '../../services/payment-methods.service';
import { AddPaymentMethodDto } from '../../dto/add-payment-method.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for managing user payment methods (saved cards, etc.).
 */
@ApiTags('Payment Methods')
@ApiBearerAuth()
@Auth()
@Controller('payments/methods')
@ApiStandardResponses()
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  /**
   * Retrieves an inventory of all saved payment instruments associated with the user account.
   *
   * @param userId Unique identifier of the authenticated user
   * @returns A promise resolving to the collection of payment methods
   */
  @Get()
  @ApiOperation({
    summary: 'List saved payment methods',
    description: 'Access your vault of registered credit cards and digital payment instruments.',
  })
  @ApiResponse({ status: 200, description: 'List of payment methods retrieved successfully' })
  async getMethods(@CurrentUser('userId') userId: string): Promise<any> {
    const data = await this.paymentMethodsService.getSavedMethods(userId);
    return { status: 'success', data };
  }

  /**
   * Adds a new payment method for the authenticated user.
   */
  @Post()
  @ApiOperation({ summary: 'Add a new payment method' })
  @ApiResponse({ status: 201, description: 'Payment method added successfully' })
  async addMethod(
    @CurrentUser('userId') userId: string,
    @Body() dto: AddPaymentMethodDto,
  ): Promise<any> {
    const result = await this.paymentMethodsService.addMethod(userId, dto);
    return { status: 'success', data: result };
  }

  /**
   * Removes a saved payment method.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remove a payment method' })
  @ApiResponse({ status: 200, description: 'Payment method removed successfully' })
  async removeMethod(
    @CurrentUser('userId') userId: string,
    @Param('id') methodId: string,
  ): Promise<any> {
    await this.paymentMethodsService.removeMethod(userId, methodId);
    return { status: 'success' };
  }

  /**
   * Sets a specific payment method as the default for future transactions.
   */
  @Patch(':id/default')
  @ApiOperation({ summary: 'Set a payment method as default' })
  @ApiResponse({ status: 200, description: 'Default payment method updated successfully' })
  async setDefault(
    @CurrentUser('userId') userId: string,
    @Param('id') methodId: string,
  ): Promise<any> {
    const result = await this.paymentMethodsService.setDefaultMethod(userId, methodId);
    return { status: 'success', data: result };
  }

  /**
   * Updates the user-friendly nickname for a payment method.
   */
  @Patch(':id/nickname')
  @ApiOperation({ summary: 'Update payment method nickname' })
  @ApiResponse({ status: 200, description: 'Nickname updated successfully' })
  async updateNickname(
    @CurrentUser('userId') userId: string,
    @Param('id') methodId: string,
    @Body('nickname') nickname: string,
  ): Promise<any> {
    const result = await this.paymentMethodsService.updateNickname(userId, methodId, nickname);
    return { status: 'success', data: result };
  }
}
