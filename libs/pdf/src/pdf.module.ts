import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfService } from './pdf.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
