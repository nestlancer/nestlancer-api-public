import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import { ReorderPortfolioDto } from '../dto/reorder-portfolio.dto';

@Injectable()
export class PortfolioOrderingService {
  constructor(private readonly prismaWrite: PrismaWriteService) {}

  async reorder(dto: ReorderPortfolioDto) {
    // Atomic bulk update using a transaction
    await this.prismaWrite.$transaction(
      dto.items.map((item) =>
        this.prismaWrite.portfolioItem.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
  }
}
