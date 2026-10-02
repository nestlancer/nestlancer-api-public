import {
  setupTestDatabase,
  teardownTestDatabase,
  resetTestDatabase,
  getTestPrismaClient,
} from '../../../src/helpers/test-database.helper';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        $queryRawUnsafe: jest
          .fn()
          .mockResolvedValue([{ table_name: 'user' }, { table_name: 'post' }]),
        $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('Test Database Helper', () => {
  afterEach(async () => {
    await teardownTestDatabase();
  });

  it('should setup the database client', async () => {
    const client = await setupTestDatabase();
    expect(client).toBeDefined();
    expect(client.$connect).toHaveBeenCalled();
    expect(getTestPrismaClient()).toBe(client);
  });

  it('should teardown the database client', async () => {
    const client = await setupTestDatabase();
    await teardownTestDatabase();

    expect(client.$disconnect).toHaveBeenCalled();
    expect(getTestPrismaClient()).toBeNull();
  });

  it('should reset the database client via truncate', async () => {
    const client = await setupTestDatabase();
    await resetTestDatabase();

    expect(client.$queryRawUnsafe).toHaveBeenCalled();
    expect(client.$executeRawUnsafe).toHaveBeenCalledWith('TRUNCATE TABLE "user", "post" CASCADE');
  });

  it('should do nothing on truncate if no tables are found', async () => {
    const client = await setupTestDatabase();
    (client.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]); // Mock empty tables array
    await resetTestDatabase();

    expect(client.$queryRawUnsafe).toHaveBeenCalled();
    expect(client.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('should ignore reset if client is not set up', async () => {
    await expect(resetTestDatabase()).resolves.toBeUndefined();
  });

  it('should ignore teardown if client is not set up', async () => {
    await expect(teardownTestDatabase()).resolves.toBeUndefined();
  });
});
