import { TtlStrategy } from '../../../src/strategies/ttl.strategy';

describe('TtlStrategy', () => {
  let strategy: TtlStrategy;

  beforeEach(() => {
    strategy = new TtlStrategy();
  });

  it('should return 3600 for portfolio and blog keys', () => {
    expect(strategy.getTtl('portfolio:123')).toBe(3600);
    expect(strategy.getTtl('blog:post:456')).toBe(3600);
  });

  it('should return 300 for user profile keys', () => {
    expect(strategy.getTtl('user:profile:789')).toBe(300);
  });

  it('should return default TTL for other keys', () => {
    expect(strategy.getTtl('other:key')).toBe(300); // 300 is default constructor value
  });

  it('should use custom default TTL if provided', () => {
    const customStrategy = new TtlStrategy(600);
    expect(customStrategy.getTtl('other:key')).toBe(600);
  });
});
