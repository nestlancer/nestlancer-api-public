export interface IHashingService {
  hash(data: string, rounds?: number): Promise<string>;
  compare(data: string, hash: string): Promise<boolean>;
}
export interface IEncryptionService {
  encrypt(plaintext: string): string;
  decrypt(encrypted: string): string;
}
export interface IHmacService {
  sign(payload: string, secret: string): string;
  verify(payload: string, signature: string, secret: string): boolean;
}
export interface ITotpService {
  generateSecret(): { secret: string; otpauthUrl: string };
  verifyToken(secret: string, token: string): boolean;
}
export interface TotpSecret {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl?: string;
}
