import { PrismaWriteService } from './prisma-write.service';
import { PrismaReadService } from './prisma-read.service';

/** Base repository providing read/write split access to Prisma */
export abstract class BaseRepository {
  constructor(
    protected readonly writeDb: PrismaWriteService,
    protected readonly readDb: PrismaReadService,
  ) {}

  /** Use for read queries (can go to replica) */
  protected get reader(): PrismaReadService {
    return this.readDb;
  }

  /** Use for write queries (always goes to primary) */
  protected get writer(): PrismaWriteService {
    return this.writeDb;
  }
}
