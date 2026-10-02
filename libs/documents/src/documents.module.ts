import { Global, Module } from '@nestjs/common';
import { PdfModule } from '@nestlancer/pdf';
import { StorageModule } from '@nestlancer/storage';
import { DocumentNumberService } from './document-number.service';
import { DocumentStorageService } from './document-storage.service';
import { DocumentGenerationService } from './document-generation.service';

@Global()
@Module({
  imports: [PdfModule, StorageModule.forRoot()],
  providers: [DocumentNumberService, DocumentStorageService, DocumentGenerationService],
  exports: [DocumentNumberService, DocumentStorageService, DocumentGenerationService],
})
export class DocumentsModule {}
