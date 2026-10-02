import { Test, TestingModule } from '@nestjs/testing';
import { SearchModule } from '../../src/search.module';
import { SearchService } from '../../src/search.service';
import { ConfigModule } from '@nestjs/config';

// Mock meilisearch
jest.mock('meilisearch', () => {
  return {
    MeiliSearch: jest.fn().mockImplementation(() => ({
      index: jest.fn().mockReturnValue({
        search: jest.fn().mockResolvedValue({
          hits: [{ id: '1', title: 'Test Hit' }],
          estimatedTotalHits: 1,
          processingTimeMs: 10,
        }),
      }),
    })),
  };
});

describe('SearchModule (Integration)', () => {
  let module: TestingModule;
  let service: SearchService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        SearchModule.forRoot(),
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    service.onModuleInit();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should perform a search with parameters', async () => {
    const result = await service.search('products', {
      query: 'electronics',
      limit: 10,
      page: 1,
      filters: { category: 'phones' },
    });

    expect(result.hits).toHaveLength(1);
    expect(result.totalHits).toBe(1);
    expect(result.hits[0]).toEqual({ id: '1', title: 'Test Hit' });
  });
});
