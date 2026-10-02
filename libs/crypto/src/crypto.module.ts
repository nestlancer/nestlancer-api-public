import { Module, Global } from '@nestjs/common';
import { HashingService } from './hashing.service';
import { EncryptionService } from './encryption.service';
import { HmacService } from './hmac.service';
import { TotpService } from './totp.service';

@Global()
@Module({
  providers: [HashingService, EncryptionService, HmacService, TotpService],
  exports: [HashingService, EncryptionService, HmacService, TotpService],
})
export class CryptoModule {}
