export function buildPrismaSkipTake(pagination: any) {
  const page = Number(pagination?.page || 1);
  const limit = Number(pagination?.limit || 10);
  return { skip: (page - 1) * limit, take: limit };
}
