import { OutboxPrismaInitializer } from '../../src/outbox-prisma.initializer';
import { OutboxRepository } from '../../src/outbox.repository';

describe('OutboxPrismaInitializer', () => {
  it('wires PrismaWriteService into OutboxRepository on module init', () => {
    const repository = new OutboxRepository();
    const prisma = { outbox: { create: jest.fn() } };
    const setPrisma = jest.spyOn(repository, 'setPrisma');

    const initializer = new OutboxPrismaInitializer(repository, prisma as any);
    initializer.onModuleInit();

    expect(setPrisma).toHaveBeenCalledWith(prisma);
  });
});
