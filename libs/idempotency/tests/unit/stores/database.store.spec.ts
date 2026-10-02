import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseIdempotencyStore } from '../../../src/stores/database.store';
import { Logger } from '@nestjs/common';

describe('DatabaseIdempotencyStore', () => {
  let store: DatabaseIdempotencyStore;
  let mockPrisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseIdempotencyStore],
    }).compile();

    store = module.get<DatabaseIdempotencyStore>(DatabaseIdempotencyStore);

    mockPrisma = {
      idempotencyKey: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };
  });

  it('should be defined', () => {
    expect(store).toBeDefined();
  });

  it('should return null and warn if prisma is not set', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
    const result = await store.get('key1');

    expect(result).toBeNull();
    expect(loggerSpy).toHaveBeenCalledWith(
      'PrismaService not available for DatabaseIdempotencyStore',
    );
  });

  it('should get record from database', async () => {
    store.setPrisma(mockPrisma);
    const record = {
      responseCode: 200,
      responseBody: { foo: 'bar' },
      expiresAt: new Date(Date.now() + 10000),
    };
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue(record);

    const result = await store.get('key1');

    expect(result).toEqual({
      responseCode: record.responseCode,
      responseBody: record.responseBody,
    });
  });

  it('should return null and delete if record is expired', async () => {
    store.setPrisma(mockPrisma);
    const record = {
      responseCode: 200,
      responseBody: { foo: 'bar' },
      expiresAt: new Date(Date.now() - 10000),
    };
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue(record);

    const result = await store.get('key1');

    expect(result).toBeNull();
    expect(mockPrisma.idempotencyKey.delete).toHaveBeenCalledWith({ where: { key: 'key1' } });
  });

  it('should upsert record in database', async () => {
    store.setPrisma(mockPrisma);
    const response = { responseCode: 201, responseBody: { ok: true } };

    await store.set('key1', response, 60);

    expect(mockPrisma.idempotencyKey.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'key1' },
        create: expect.objectContaining({
          key: 'key1',
          responseCode: 201,
        }),
      }),
    );
  });
});
