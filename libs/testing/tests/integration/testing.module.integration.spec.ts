import { Test, TestingModule as NestTestingModule } from '@nestjs/testing';
import { TestingModule } from '../../src/testing.module';
import { ConfigModule } from '@nestjs/config';

describe('TestingModule (Integration)', () => {
  let module: NestTestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }), TestingModule],
    }).compile();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should compile without errors when combined with other modules', async () => {
    // TestingModule is an empty @Module({}) — the key integration test
    // is that it compiles and initializes cleanly alongside ConfigModule
    const testModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }), TestingModule],
    }).compile();

    expect(testModule).toBeDefined();
    await testModule.close();
  });

  it('should close gracefully', async () => {
    const testModule = await Test.createTestingModule({
      imports: [TestingModule],
    }).compile();

    // Verify close doesn't throw
    await expect(testModule.close()).resolves.toBeUndefined();
  });
});
