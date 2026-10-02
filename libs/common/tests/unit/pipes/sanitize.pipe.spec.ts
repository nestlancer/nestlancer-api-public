import { SanitizePipe } from '../../../src/pipes/sanitize.pipe';

describe('SanitizePipe', () => {
  let pipe: SanitizePipe;

  beforeEach(() => {
    pipe = new SanitizePipe();
  });

  it('should sanitize simple string', () => {
    expect(pipe.transform('<script>')).toBe('&lt;script&gt;');
  });

  it('should ignore numbers', () => {
    expect(pipe.transform(123)).toBe(123);
  });

  it('should sanitize strings inside an object', () => {
    const input = {
      name: 'John',
      bio: '<script>alert("xss")</script>',
    };
    const expected = {
      name: 'John',
      bio: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
    };
    expect(pipe.transform(input)).toEqual(expected);
  });

  it('should not throw on nulls', () => {
    expect(pipe.transform(null)).toBe(null);
  });
});
