<div align="center">

# Adding a New Worker

</div>

---

## Step-by-Step

### 1. Create Worker Directory

```bash
mkdir -p workers/<name>-worker/src
```

### 2. Initialize Package

```json
{
  "name": "@nestlancer/<name>-worker",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@nestlancer/common": "workspace:*",
    "@nestlancer/config": "workspace:*",
    "@nestlancer/queue": "workspace:*",
    "@nestlancer/database": "workspace:*",
    "@nestlancer/logger": "workspace:*"
  }
}
```

### 3. Implement Consumer

```typescript
import { QueueConsumerService } from '@nestlancer/queue';

@Injectable()
export class MyConsumer {
  constructor(
    private readonly queueConsumer: QueueConsumerService,
    private readonly myService: MyProcessorService,
  ) {}

  @Consume({ queue: 'my.queue', routingKey: 'my.*' })
  async handleEvent(envelope: MessageEnvelope<MyPayload>) {
    await this.myService.process(envelope.payload);
  }
}
```

### 4. Create Dockerfile

Extend `docker/worker-base/Dockerfile.base`.

### 5. Add K8s Manifests

```bash
mkdir -p deploy/kubernetes/workers/<name>-worker
# Create: deployment.yaml, hpa.yaml, kustomization.yaml
# HPA based on queue depth metric
```

### 6. Add Routing Keys

Create `libs/queue/src/routing-keys/<name>.routing-keys.ts`.

### 7. Test

```typescript
it('should process message', async () => {
  const message = createMockMessage({ type: 'my.event' });
  await consumer.handleEvent(message);
  expect(service.process).toHaveBeenCalledWith(message.payload);
});
```

---

<div align="center">

**Adding a New Worker** — Nestlancer guide

</div>
