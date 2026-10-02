/** Raw SQL helpers for AuthConfig.mustChangePassword (works before Prisma client is regenerated). */

type PrismaRaw = {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

export async function readMustChangePassword(prisma: PrismaRaw, userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ mustChangePassword: boolean }[]>`
    SELECT COALESCE("mustChangePassword", false) AS "mustChangePassword"
    FROM "AuthConfig"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  return rows[0]?.mustChangePassword === true;
}

export async function setMustChangePassword(
  prisma: PrismaRaw,
  userId: string,
  mustChangePassword: boolean,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "AuthConfig"
    SET "mustChangePassword" = ${mustChangePassword}, "updatedAt" = NOW()
    WHERE "userId" = ${userId}
  `;
}
