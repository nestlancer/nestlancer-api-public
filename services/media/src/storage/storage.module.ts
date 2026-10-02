import { Module } from '@nestjs/common';
import { MediaStorageService } from './storage.service';
import {
  StorageModule as LibStorageModule,
  StorageService as LibStorageService,
} from '@nestlancer/storage';

@Module({
  imports: [LibStorageModule.forRoot()],
  providers: [MediaStorageService],
  exports: [MediaStorageService],
})
export class StorageModule {}
