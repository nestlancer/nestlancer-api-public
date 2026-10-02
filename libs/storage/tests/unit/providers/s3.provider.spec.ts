import { S3Provider } from '../../../src/providers/s3.provider';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Provider', () => {
  let provider: S3Provider;
  const mockConfig = {
    region: 'us-west-2',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new S3Provider(mockConfig);
  });

  it('should upload a file and return result', async () => {
    const mockSend = jest.fn().mockResolvedValue({ ETag: '"test-etag"' });
    (S3Client.prototype.send as jest.Mock) = mockSend;

    const result = await provider.upload(
      'test-bucket',
      'test-key.txt',
      Buffer.from('hello'),
      'text/plain',
    );

    expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(result.key).toBe('test-key.txt');
    expect(result.etag).toBe('test-etag');
    expect(result.size).toBe(5);
    expect(result.url).toContain('test-bucket.s3.us-west-2.amazonaws.com');
  });

  it('should download a file', async () => {
    // Mock an async iterable for the stream
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('hello');
        yield Buffer.from(' world');
      },
    };

    const mockSend = jest.fn().mockResolvedValue({ Body: mockStream });
    (S3Client.prototype.send as jest.Mock) = mockSend;

    const buffer = await provider.download('test-bucket', 'test-key.txt');

    expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    expect(buffer.toString()).toBe('hello world');
  });

  it('should delete a file', async () => {
    const mockSend = jest.fn().mockResolvedValue({});
    (S3Client.prototype.send as jest.Mock) = mockSend;

    await provider.delete('test-bucket', 'test-key.txt');

    expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });

  it('should generate a signed url for put', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com');

    const url = await provider.getSignedUrl({
      bucket: 'test-bucket',
      key: 'test-key.txt',
      operation: 'put',
      contentType: 'text/plain',
      expiresIn: 3600,
    });

    expect(getSignedUrl).toHaveBeenCalled();
    expect(url).toBe('https://signed-url.com');
  });

  it('should sign presigned URLs against publicEndpoint', async () => {
    (S3Client as unknown as jest.Mock).mockClear();
    const publicProvider = new S3Provider({
      ...mockConfig,
      endpoint: 'http://internal:9000',
      publicEndpoint: 'https://storage.example.com',
    });

    expect((S3Client as unknown as jest.Mock).mock.calls.map((call) => call[0]?.endpoint)).toEqual([
      'http://internal:9000',
      'https://storage.example.com',
    ]);

    const url = await publicProvider.getSignedUrl({
      bucket: 'test-bucket',
      key: 'test-key.txt',
      operation: 'get',
    });

    expect(url.startsWith('https://storage.example.com/test-bucket/test-key.txt?')).toBe(true);
    expect(url).toContain('X-Amz-Signature=');
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('should build object URLs with publicEndpoint when configured', async () => {
    const publicProvider = new S3Provider({
      ...mockConfig,
      endpoint: 'http://internal:9000',
      publicEndpoint: 'https://storage.example.com',
    });

    const mockSend = jest.fn().mockResolvedValue({ ETag: '"test-etag"' });
    (S3Client.prototype.send as jest.Mock) = mockSend;

    const result = await publicProvider.upload(
      'test-bucket',
      'test-key.txt',
      Buffer.from('hello'),
      'text/plain',
    );

    expect(result.url).toBe('https://storage.example.com/test-bucket/test-key.txt');
  });

  it('should check if file exists', async () => {
    const mockSend = jest
      .fn()
      .mockResolvedValueOnce({}) // exists
      .mockRejectedValueOnce(new Error('Not found')); // doesn't exist

    (S3Client.prototype.send as jest.Mock) = mockSend;

    expect(await provider.exists('test-bucket', 'exists.txt')).toBe(true);
    expect(await provider.exists('test-bucket', 'missing.txt')).toBe(false);
  });
});
