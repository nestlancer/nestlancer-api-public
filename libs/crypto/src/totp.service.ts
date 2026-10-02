import { Injectable } from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';

@Injectable()
export class TotpService {
  private readonly PERIOD = 30; // seconds
  private readonly DIGITS = 6;
  private readonly WINDOW = 1; // ±1 period tolerance

  generateSecret(): { secret: string; otpauthUrl: string } {
    const secret = randomBytes(20).toString('hex');
    const otpauthUrl = `otpauth://totp/Nestlancer?secret=${secret}&issuer=Nestlancer`;
    return { secret, otpauthUrl };
  }

  verifyToken(secret: string, token: string): boolean {
    const now = Math.floor(Date.now() / 1000);

    // Check current time step and ±WINDOW around it
    for (let i = -this.WINDOW; i <= this.WINDOW; i++) {
      const timeStep = Math.floor(now / this.PERIOD) + i;
      const expectedToken = this.generateToken(secret, timeStep);
      if (this.timingSafeCompare(expectedToken, token)) {
        return true;
      }
    }

    return false;
  }

  generateBackupCodes(count: number = 10): string[] {
    return Array.from({ length: count }, () =>
      randomBytes(4).toString('hex').toUpperCase().match(/.{4}/g)!.join('-'),
    );
  }

  private generateToken(secret: string, timeStep: number): string {
    // Convert time step to 8-byte big-endian buffer
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(timeStep));

    // HMAC-SHA1
    const secretBuffer = Buffer.from(secret, 'hex');
    const hmac = createHmac('sha1', secretBuffer).update(buffer).digest();

    // Dynamic truncation (RFC 4226)
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return String(code % Math.pow(10, this.DIGITS)).padStart(this.DIGITS, '0');
  }

  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
