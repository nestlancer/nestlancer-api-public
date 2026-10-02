import { createHash, createHmac } from 'crypto';

export interface PresignS3GetInput {
  endpoint: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  expiresIn: number;
  now?: Date;
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Path-style SigV4 GET URL for the public S3 host.
 * The AWS SDK presigner was spending hundreds of milliseconds under tracing;
 * this signs locally and MinIO accepts the result.
 */
export function presignS3Get(input: PresignS3GetInput): string {
  const url = new URL(input.endpoint);
  const now = input.now ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${input.region}/s3/aws4_request`;
  const credential = `${input.accessKeyId}/${credentialScope}`;
  const canonicalUri = `/${encodeRfc3986(input.bucket)}/${input.key
    .split('/')
    .map(encodeRfc3986)
    .join('/')}`;
  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(input.expiresIn),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((name) => `${encodeRfc3986(name)}=${encodeRfc3986(params[name])}`)
    .join('&');
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    `host:${url.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest, 'utf8').digest('hex'),
  ].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, dateStamp), input.region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
  return `${url.protocol}//${url.host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
