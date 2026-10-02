import { TagInvalidationStrategy } from '../../../src/strategies/tag-invalidation.strategy';

describe('TagInvalidationStrategy', () => {
  let strategy: TagInvalidationStrategy;

  beforeEach(() => {
    strategy = new TagInvalidationStrategy();
  });

  it('should extract top level tag from compound key', () => {
    expect(strategy.getTagsForKey('user:profile:123')).toEqual(['user:profile']);
  });

  it('should return exact key if no compound separator', () => {
    expect(strategy.getTagsForKey('config')).toEqual(['config']);
  });

  it('should return top level tag from 2-part compound key', () => {
    expect(strategy.getTagsForKey('portfolio:list')).toEqual(['portfolio:list']);
  });
});
