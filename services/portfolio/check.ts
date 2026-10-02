import { PrismaClient } from '../../prisma/generated';
const prisma = new PrismaClient();
console.log(
  'Keys:',
  Object.keys(prisma).filter(
    (k) => k.toLowerCase().includes('portfolio') || k.toLowerCase().includes('blog'),
  ),
);
