import { createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';

@Injectable()
export class SignatureVerifierService {
  sign(payload: any, secret: string): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  verify(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.sign(payload, secret);
    return expectedSignature === signature;
  }
}
