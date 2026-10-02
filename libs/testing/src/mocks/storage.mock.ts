export class MockStorageService {
  private readonly store = new Map<string, unknown>();
  async get(key: string) {
    return this.store.get(key) || null;
  }
  async set(key: string, value: unknown) {
    this.store.set(key, value);
  }
  async del(key: string) {
    this.store.delete(key);
  }
}
