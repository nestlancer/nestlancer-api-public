import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage<Map<string, string>>();

@Injectable()
export class TracingService {
  getCorrelationId(): string | undefined {
    return storage.getStore()?.get('correlationId');
  }

  setCorrelationId(id: string): void {
    storage.getStore()?.set('correlationId', id);
  }

  run<T>(correlationId: string, fn: () => T): T {
    const store = new Map<string, string>();
    store.set('correlationId', correlationId);
    return storage.run(store, fn);
  }

  getStore(): AsyncLocalStorage<Map<string, string>> {
    return storage;
  }
}
