import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../../src/encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const MOCK_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 chars hex = 32 bytes

  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = MOCK_KEY;
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should encrypt and decrypt correctly', () => {
    const plaintext = 'sensitive information';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).toContain(':');

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw error if decryption fails (tampered data)', () => {
    const encrypted = service.encrypt('test');
    const tampered =
      encrypted.substring(0, encrypted.length - 1) + (encrypted.endsWith('0') ? '1' : '0');
    expect(() => service.decrypt(tampered)).toThrow();
  });
});
