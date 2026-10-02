import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Service handling Two-Factor Authentication (2FA) operations.
 * Manages TOTP secret generation, verification, backup codes, and 2FA lifecycle.
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Initiates 2FA setup by generating a TOTP secret and QR code URI.
   * The secret is stored in AuthConfig but 2FA is not yet enabled until verified.
   *
   * @param userId - The ID of the user enabling 2FA
   * @param dto - Contains the user's current password for verification
   * @returns The TOTP secret and otpauth URI for QR code generation
   */
  async enable2FA(userId: string, dto: { password: string }): Promise<any> {
    const user = await this.prismaRead.user.findUnique({
      where: { id: userId },
      include: { authConfig: true },
    });
    if (!user) throw new BusinessLogicException('User not found', 'USER_001');

    if (user.authConfig?.twoFactorEnabled) {
      throw new BusinessLogicException('2FA is already enabled', 'USER_016');
    }

    // Verify password before proceeding
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BusinessLogicException('Invalid password', 'USER_003');
    }

    // Generate a cryptographically secure TOTP secret (base32 encoded)
    const secretBuffer = crypto.randomBytes(20);
    const secret = this.encodeBase32(secretBuffer);

    // Store the secret in AuthConfig (not yet enabled)
    await this.prismaWrite.authConfig.upsert({
      where: { userId },
      create: {
        userId,
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
      update: {
        twoFactorSecret: secret,
      },
    });

    const issuer = 'Nestlancer';
    const qrCodeUrl = `otpauth://totp/${issuer}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret,
      qrCodeUrl,
      message: '2FA setup initiated. Verify with a code from your authenticator app.',
    };
  }

  /**
   * Verifies the TOTP code and completes 2FA setup.
   * Generates and stores hashed backup codes upon successful verification.
   *
   * @param userId - The ID of the user verifying 2FA setup
   * @param dto - Contains the TOTP code from the authenticator app
   * @returns Confirmation with backup codes (shown only once)
   */
  async verify2FASetup(userId: string, dto: { code: string }): Promise<any> {
    const user = await this.prismaRead.user.findUnique({
      where: { id: userId },
      include: { authConfig: true },
    });
    if (!user) throw new BusinessLogicException('User not found', 'USER_001');

    const authConfig = (user as any).authConfig;
    if (!authConfig?.twoFactorSecret) {
      throw new BusinessLogicException(
        '2FA setup not initiated. Call enable2FA first.',
        'USER_017',
      );
    }

    // Verify the TOTP code against the stored secret
    const isValidCode = this.verifyTOTP(authConfig.twoFactorSecret, dto.code);
    if (!isValidCode) {
      throw new BusinessLogicException('Invalid verification code', 'USER_018');
    }

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    // Hash backup codes for storage
    const hashedCodes = backupCodes.map((code) => ({
      hash: crypto.createHash('sha256').update(code).digest('hex'),
      used: false,
    }));

    // Enable 2FA and store hashed backup codes
    await this.prismaWrite.authConfig.update({
      where: { userId },
      data: {
        twoFactorEnabled: true,
        backupCodes: hashedCodes,
      },
    });

    return {
      enabled: true,
      backupCodes,
      message: '2FA enabled successfully. Save your backup codes securely.',
    };
  }

  /**
   * Disables 2FA after verifying the user's password and a valid TOTP code.
   *
   * @param userId - The ID of the user disabling 2FA
   * @param dto - Contains password and TOTP code for verification
   * @returns Confirmation that 2FA has been disabled
   */
  async disable2FA(userId: string, dto: { password: string; code: string }): Promise<any> {
    const user = await this.prismaRead.user.findUnique({
      where: { id: userId },
      include: { authConfig: true },
    });
    if (!user) throw new BusinessLogicException('User not found', 'USER_001');

    const authConfig = user.authConfig;
    if (!authConfig?.twoFactorEnabled) {
      throw new BusinessLogicException('2FA is not enabled', 'USER_019');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BusinessLogicException('Invalid password', 'USER_003');
    }

    // Verify TOTP code
    if (authConfig?.twoFactorSecret) {
      const isValidCode = this.verifyTOTP(authConfig.twoFactorSecret, dto.code);
      if (!isValidCode) {
        throw new BusinessLogicException('Invalid 2FA code', 'USER_018');
      }
    }

    // Disable 2FA and clear secrets
    await this.prismaWrite.authConfig.update({
      where: { userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });

    return { enabled: false, message: '2FA disabled successfully.' };
  }

  /**
   * Retrieves the current 2FA status for a user.
   *
   * @param userId - The ID of the user
   * @returns 2FA status and method
   */
  async get2FAStatus(userId: string): Promise<any> {
    const authConfig = await this.prismaRead.authConfig.findUnique({
      where: { userId },
      select: { twoFactorEnabled: true },
    });
    if (!authConfig) {
      const user = await this.prismaRead.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) throw new BusinessLogicException('User not found', 'USER_001');
    }

    const enabled = authConfig?.twoFactorEnabled ?? false;
    return {
      enabled,
      method: enabled ? 'totp' : null,
    };
  }

  /**
   * Retrieves masked backup codes and remaining count for the user.
   *
   * @param userId - The ID of the user
   * @returns Masked backup codes and metadata
   */
  async getBackupCodes(userId: string): Promise<any> {
    const user = await this.prismaRead.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessLogicException('User not found', 'USER_001');

    const authConfig = await this.prismaRead.authConfig.findUnique({
      where: { userId },
    });

    const codes = (authConfig?.backupCodes as any[]) || [];
    const unusedCodes = codes.filter((c: any) => !c.used);

    return {
      totalCodes: codes.length,
      remainingCount: unusedCodes.length,
      usedCount: codes.length - unusedCodes.length,
      generatedAt: authConfig?.updatedAt || null,
    };
  }

  /**
   * Regenerates backup codes, invalidating all previous codes.
   * Requires password verification.
   *
   * @param userId - The ID of the user
   * @param dto - Contains the user's password for verification
   * @returns New plaintext backup codes (shown only once)
   */
  async regenerateBackupCodes(userId: string, dto: { password: string }): Promise<any> {
    const user = await this.prismaRead.user.findUnique({
      where: { id: userId },
      include: { authConfig: true },
    });
    if (!user) throw new BusinessLogicException('User not found', 'USER_001');

    if (!user.authConfig?.twoFactorEnabled) {
      throw new BusinessLogicException(
        '2FA must be enabled to regenerate backup codes',
        'USER_019',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BusinessLogicException('Invalid password', 'USER_003');
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    // Hash and store
    const hashedCodes = backupCodes.map((code) => ({
      hash: crypto.createHash('sha256').update(code).digest('hex'),
      used: false,
    }));

    await this.prismaWrite.authConfig.update({
      where: { userId },
      data: { backupCodes: hashedCodes },
    });

    return {
      codes: backupCodes,
      backupCodes,
      remainingCount: backupCodes.length,
      generatedAt: new Date().toISOString(),
      message: 'Backup codes regenerated. Previous codes are now invalid.',
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Encodes a buffer into base32 format (RFC 4648).
   */
  private encodeBase32(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Decodes a base32 string back to a Buffer.
   */
  private decodeBase32(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const lookup: Record<string, number> = {};
    for (let i = 0; i < alphabet.length; i++) {
      lookup[alphabet[i]] = i;
    }

    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of encoded.toUpperCase()) {
      if (lookup[char] === undefined) continue;
      value = (value << 5) | lookup[char];
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Generates a TOTP code for a given secret and time counter.
   */
  private generateTOTP(secret: string, counter: number): string {
    const secretBuffer = this.decodeBase32(secret);
    const counterBuffer = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
      counterBuffer[i] = counter & 0xff;
      counter = counter >> 8;
    }

    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const code =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Verifies a TOTP code against the given secret.
   * Allows a window of ±1 time step to account for clock drift.
   */
  private verifyTOTP(secret: string, code: string): boolean {
    const timeStep = 30;
    const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

    // Check current and ±1 time windows for clock drift tolerance
    for (let i = -1; i <= 1; i++) {
      const expectedCode = this.generateTOTP(secret, currentCounter + i);
      if (crypto.timingSafeEqual(Buffer.from(expectedCode), Buffer.from(code))) {
        return true;
      }
    }

    return false;
  }
}
