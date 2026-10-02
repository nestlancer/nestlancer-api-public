import { Test, TestingModule } from '@nestjs/testing';
import { SignatureVerifierService } from '../../../src/services/signature-verifier.service';
import { createHmac } from 'crypto';

describe('SignatureVerifierService', () => {
  let service: SignatureVerifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignatureVerifierService],
    }).compile();

    service = module.get<SignatureVerifierService>(SignatureVerifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sign', () => {
    it('should correctly sign a string payload', () => {
      const secret = 'super-secret';
      const payload = 'string-payload';
      const expected = createHmac('sha256', secret).update(payload).digest('hex');

      expect(service.sign(payload, secret)).toBe(expected);
    });

    it('should correctly sign an object payload by stringifying it', () => {
      const secret = 'super-secret';
      const payload = { a: 1 };
      const expected = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

      expect(service.sign(payload, secret)).toBe(expected);
    });
  });

  describe('verify', () => {
    it('should return true for valid signature', () => {
      const secret = 'my-secret';
      const payload = { test: true };
      const correctSignature = service.sign(payload, secret);

      expect(service.verify(payload, correctSignature, secret)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const secret = 'my-secret';
      const payload = { test: true };

      expect(service.verify(payload, 'invalid-signature', secret)).toBe(false);
    });
  });
});
