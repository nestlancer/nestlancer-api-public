import { buildOrderBy } from '../../../src/utils/query-builder.util';

describe('buildOrderBy', () => {
  it('should return default order by if no sort string provided', () => {
    expect(buildOrderBy()).toEqual([{ createdAt: 'desc' }]);
    expect(buildOrderBy('')).toEqual([{ createdAt: 'desc' }]);
  });

  it('should parse single sort field correctly', () => {
    expect(buildOrderBy('name:asc')).toEqual([{ name: 'asc' }]);
    expect(buildOrderBy('age:desc')).toEqual([{ age: 'desc' }]);
  });

  it('should default to desc if order is missing or invalid', () => {
    expect(buildOrderBy('title')).toEqual([{ title: 'desc' }]);
    expect(buildOrderBy('title:foo')).toEqual([{ title: 'desc' }]);
  });

  it('should handle uppercase and valid whitespace', () => {
    expect(buildOrderBy(' title : ASC ')).toEqual([{ title: 'asc' }]);
  });

  it('should parse multiple sort fields', () => {
    expect(buildOrderBy('name:asc,age:desc')).toEqual([{ name: 'asc' }, { age: 'desc' }]);
    expect(buildOrderBy('createdAt:desc, title:asc')).toEqual([
      { createdAt: 'desc' },
      { title: 'asc' },
    ]);
  });
});
