/** Builds Prisma orderBy from sort string (e.g., "createdAt:desc,title:asc") */
export function buildOrderBy(sort?: string): Record<string, 'asc' | 'desc'>[] {
  if (!sort) return [{ createdAt: 'desc' }];
  return sort.split(',').map((s) => {
    const [field, order] = s.trim().split(':');
    return {
      [field.trim()]: (order?.trim().toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
    };
  });
}
