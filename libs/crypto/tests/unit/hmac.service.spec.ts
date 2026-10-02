import { Test, TestingModule } from '@nestjs/testing';
import { HmacService } from '../../src/hmac.service';

describe('HmacService', () => {
  let service: HmacService;
  const SECRET = 'test-secret';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HmacService],
    }).compile();

    service = module.get<HmacService>(HmacService);
  });

  it('should sign a payload', () => {
    const payload = 'test-payload';
    const signature = service.sign(payload, SECRET);
    expect(signature).toBeDefined();
    expect(signature).toHaveLength(64);
  });

  it('should verify a valid signature', () => {
    const payload = 'test-payload';
    const signature = service.sign(payload, SECRET);
    const isValid = service.verify(payload, signature, SECRET);
    expect(isValid).toBe(true);
  });

  it('should reject an invalid signature', () => {
    const isValid = service.verify('payload', 'invalid-sig', SECRET);
    expect(isValid).toBe(false);
  });

  it('should reject signature with wrong secret', () => {
    const payload = 'test-payload';
    const signature = service.sign(payload, SECRET);
    const isValid = service.verify(payload, signature, 'wrong-secret');
    expect(isValid).toBe(false);
  });
});
