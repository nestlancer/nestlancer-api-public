import { Test, TestingModule } from '@nestjs/testing';
import { CryptoModule } from '../../src/crypto.module';
import { HashingService } from '../../src/hashing.service';
import { EncryptionService } from '../../src/encryption.service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.test') });
process.env.ENCRYPTION_KEY ||= '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('CryptoModule (Integration)', () => {
  let module: TestingModule;
  let hashingService: HashingService;
  let encryptionService: EncryptionService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CryptoModule],
    }).compile();

    hashingService = module.get<HashingService>(HashingService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(hashingService).toBeDefined();
    expect(encryptionService).toBeDefined();
  });

  it('should hash and compare passwords', async () => {
    const password = 'my-secure-password';
    const hash = await hashingService.hash(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isMatch = await hashingService.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  it('should encrypt and decrypt symmetric data', () => {
    const secret = 'nestlancer-super-secret';
    const encrypted = encryptionService.encrypt(secret);

    expect(encrypted).toContain(':'); // IV:AuthTag:Ciphertext

    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });
});
