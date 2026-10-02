import { getCompressionConfig } from '../../src/compression.config';

describe('Compression Config', () => {
  it('should return default compression configuration', () => {
    const config = getCompressionConfig();
    expect(config).toEqual({ threshold: 1024, level: 6 });
  });
});
