import { MockStorageService } from '../../../src/mocks/storage.mock';

describe('MockStorageService', () => {
  let service: MockStorageService;

  beforeEach(() => {
    service = new MockStorageService();
  });

  it('should set and get values', async () => {
    await service.set('key1', 'value1');
    const value = await service.get('key1');
    expect(value).toBe('value1');
  });

  it('should return null for non-existent keys', async () => {
    const value = await service.get('key_not_found');
    expect(value).toBeNull();
  });

  it('should delete values', async () => {
    await service.set('test_key', 'test_data');
    await service.del('test_key');
    const value = await service.get('test_key');
    expect(value).toBeNull();
  });
});
