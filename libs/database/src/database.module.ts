import { Module, DynamicModule, Global } from '@nestjs/common';
import { PrismaWriteService } from './prisma-write.service';
import { PrismaReadService } from './prisma-read.service';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [PrismaWriteService, PrismaReadService],
      exports: [PrismaWriteService, PrismaReadService],
    };
  }
}
