import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../../src/search.service';
import { MeiliSearch } from 'meilisearch';

jest.mock('meilisearch', () => {
  return {
    MeiliSearch: jest.fn().mockImplementation(() => ({
      index: jest.fn().mockReturnValue({
        search: jest.fn().mockResolvedValue({
          hits: [],
          estimatedTotalHits: 0,
          processingTimeMs: 10,
        }),
        updateSearchableAttributes: jest.fn().mockResolvedValue({}),
        updateFilterableAttributes: jest.fn().mockResolvedValue({}),
        updateSortableAttributes: jest.fn().mockResolvedValue({}),
      }),
      createIndex: jest.fn().mockResolvedValue({}),
    })),
  };
});

describe('SearchService', () => {
  let service: SearchService;
  let mockClient: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService],
    }).compile();

    service = module.get<SearchService>(SearchService);
    service.onModuleInit();
    mockClient = (MeiliSearch as jest.Mock).mock.results[0].value;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should perform a search', async () => {
    const result = await service.search('users', { query: 'test' });
    expect(result.hits).toEqual([]);
    expect(mockClient.index).toHaveBeenCalledWith('users');
  });

  it('should create an index', async () => {
    await service.createIndex('projects', 'id', {
      searchableAttributes: ['title'],
    });
    expect(mockClient.createIndex).toHaveBeenCalledWith('projects', { primaryKey: 'id' });
  });
});
