import { retry } from '../../../src/utils/retry.util';

describe('RetryUtils', () => {
  it('should return result if function succeeds on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry if function fails and eventually succeeds', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('success');
    const result = await retry(fn, { delayMs: 1 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw last error if all attempts fail', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(retry(fn, { attempts: 2, delayMs: 1 })).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
