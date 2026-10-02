import { MockMailService } from '../../../src/mocks/mail.mock';

describe('MockMailService', () => {
  let mockService: MockMailService;

  beforeEach(() => {
    mockService = new MockMailService();
  });

  it('should store and retrieve values', async () => {
    await mockService.set('key1', 'value1');
    const val = await mockService.get('key1');
    expect(val).toBe('value1');
  });

  it('should return null for unset values', async () => {
    const val = await mockService.get('unknown');
    expect(val).toBeNull();
  });

  it('should delete values', async () => {
    await mockService.set('key1', 'value1');
    await mockService.del('key1');
    const val = await mockService.get('key1');
    expect(val).toBeNull();
  });
});
