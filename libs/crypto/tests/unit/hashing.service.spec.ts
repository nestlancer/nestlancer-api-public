import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from '../../src/hashing.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
  });

  describe('hash', () => {
    it('should call bcrypt hash', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_value');
      const result = await service.hash('password');
      expect(result).toBe('hashed_value');
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
    });
  });

  describe('compare', () => {
    it('should call bcrypt compare', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.compare('password', 'hash');
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hash');
    });
  });

  describe('hashSHA256', () => {
    it('should return sha256 hash', () => {
      const result = service.hashSHA256('test');
      expect(result).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });
});
