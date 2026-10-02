import { SearchIndexerService } from '../../src/search-indexer.service';
import { MeiliSearch } from 'meilisearch';

jest.mock('meilisearch');

describe('SearchIndexerService', () => {
  let service: SearchIndexerService;
  let mockIndex: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIndex = {
      addDocuments: jest.fn().mockResolvedValue({ taskUid: 1 }),
      deleteDocument: jest.fn().mockResolvedValue({ taskUid: 2 }),
      deleteDocuments: jest.fn().mockResolvedValue({ taskUid: 3 }),
      updateDocuments: jest.fn().mockResolvedValue({ taskUid: 4 }),
    };

    (MeiliSearch as jest.Mock).mockImplementation(() => ({
      index: jest.fn().mockReturnValue(mockIndex),
    }));

    service = new SearchIndexerService();
    service.onModuleInit();
  });

  it('should index a single document', async () => {
    await service.index('products', 'doc1', { name: 'Test Product' });

    expect(mockIndex.addDocuments).toHaveBeenCalledWith([{ id: 'doc1', name: 'Test Product' }], {
      primaryKey: 'id',
    });
  });

  it('should batch index documents', async () => {
    const docs = [
      { id: '1', title: 'A' },
      { id: '2', title: 'B' },
    ];
    await service.indexBatch('posts', docs, 'id');

    expect(mockIndex.addDocuments).toHaveBeenCalledWith(docs, { primaryKey: 'id' });
  });

  it('should remove a single document', async () => {
    await service.remove('products', 'doc1');

    expect(mockIndex.deleteDocument).toHaveBeenCalledWith('doc1');
  });

  it('should batch remove documents', async () => {
    await service.removeBatch('posts', ['1', '2']);

    expect(mockIndex.deleteDocuments).toHaveBeenCalledWith(['1', '2']);
  });

  it('should update a single document', async () => {
    await service.update('users', 'user1', { status: 'active' });

    expect(mockIndex.updateDocuments).toHaveBeenCalledWith([{ id: 'user1', status: 'active' }], {
      primaryKey: 'id',
    });
  });
});
