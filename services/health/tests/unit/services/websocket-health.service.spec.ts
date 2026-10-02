describe('WebsocketHealthService', () => {
  let service: any;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    originalFetch = global.fetch;
    // Dynamic import to handle the module
    const { WebsocketHealthService } =
      await import('../../../src/services/websocket-health.service');
    service = new WebsocketHealthService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('check', () => {
    it('should return healthy when WS gateway responds ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          details: { websocket: { connectedClients: 5 } },
        }),
      }) as any;

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.details.connectedClients).toBe(5);
      expect(result.details.statusText).toBe('OK');
    });

    it('should return degraded when WS gateway responds not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Service Unavailable',
        json: jest.fn().mockResolvedValue({}),
      }) as any;

      const result = await service.check();
      expect(result.status).toBe('degraded');
    });

    it('should handle json parse failure gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      }) as any;

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.details.connectedClients).toBe(0);
    });

    it('should return unhealthy when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Network error');
    });
  });
});
