import { Module, Global, DynamicModule } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';

@Global()
@Module({})
export class SearchModule {
  static forRoot(): DynamicModule {
    return {
      module: SearchModule,
      providers: [SearchService, SearchIndexerService],
      exports: [SearchService, SearchIndexerService],
    };
  }
}
