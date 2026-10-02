import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

@Injectable()
export class HashingService {
  private readonly SALT_ROUNDS = 12;

  async hash(data: string, rounds: number = this.SALT_ROUNDS): Promise<string> {
    return bcrypt.hash(data, rounds);
  }

  async compare(data: string, hash: string): Promise<boolean> {
    return bcrypt.compare(data, hash);
  }

  hashSHA256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
