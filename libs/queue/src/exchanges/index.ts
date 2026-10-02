export const EXCHANGES = {
  EVENTS: { name: 'nestlancer.events', type: 'topic', durable: true },
  DLX: { name: 'nestlancer.dlx', type: 'direct', durable: true },
} as const;
