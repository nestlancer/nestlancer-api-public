import { Test, TestingModule } from '@nestjs/testing';
import { VirusScanProcessor } from '../../../src/processors/virus-scan.processor';
import { StorageService } from '@nestlancer/storage';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@nestlancer/logger';
import clamav from 'clamav.js';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('clamav.js', () => ({
  __esModule: true,
  default: {
    createScanner: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  createWriteStream: jest.fn(),
  promises: {
    unlink: jest.fn(),
  },
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  basename: jest.fn((p) => 'testfile.txt'),
  join: jest.fn((p1, p2) => `${p1}/${p2}`),
}));

describe('VirusScanProcessor', () => {
  let processor: VirusScanProcessor;
  let storage: jest.Mocked<StorageService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;

  // Save original Date.now
  const originalDateNow = Date.now;

  beforeEach(async () => {
    jest.useFakeTimers();
    // Mock Date.now to have predictable paths
    Date.now = jest.fn(() => 1234567890);

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirusScanProcessor,
        {
          provide: StorageService,
          useValue: { downloadStream: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockImplementation((key, defaultValue) => defaultValue) },
        },
        {
          provide: LoggerService,
          useValue: {
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<VirusScanProcessor>(VirusScanProcessor);
    storage = module.get(StorageService);
    configService = module.get(ConfigService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    Date.now = originalDateNow;
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('constructor', () => {
    it('should create temp directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      // recreate module to trigger constructor again
      await Test.createTestingModule({
        providers: [
          VirusScanProcessor,
          { provide: StorageService, useValue: {} },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('/tmp/test') } },
          { provide: LoggerService, useValue: {} },
        ],
      }).compile();

      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/test', { recursive: true });
    });
  });

  describe('scanFile', () => {
    it('should download file, scan it, and find it clean', async () => {
      const mockWriteStream = {
        on: jest.fn((event: string, cb: () => void) => {
          if (event === 'finish') cb();
          return mockWriteStream;
        }),
      };
      (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream as any);
      const stream = { pipe: jest.fn(), on: jest.fn() };
      storage.downloadStream.mockResolvedValue(stream as any);

      const mockScanner = {
        scan: jest.fn((path, callback) => callback(null, null, { status: 'OK' })),
      };
      (clamav.createScanner as jest.Mock).mockReturnValue(mockScanner);
      (fs.existsSync as jest.Mock).mockReturnValue(true); // file exists before unlink

      const result = await processor.scanFile('testfile.txt');
      jest.runAllTimers();

      expect(storage.downloadStream).toHaveBeenCalledWith('nestlancer-private', 'testfile.txt');
      expect(stream.pipe).toHaveBeenCalled();
      expect(clamav.createScanner).toHaveBeenCalledWith(3310, 'localhost');
      expect(mockScanner.scan).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/media-worker/1234567890-testfile.txt');

      expect(result).toEqual({ isInfected: false });
      expect(logger.debug).toHaveBeenCalledWith(
        '[VirusScan] File testfile.txt passed security check.',
      );
    });

    it('should handle virus found (clamav.js string result)', async () => {
      const mockWriteStream = {
        on: jest.fn((event: string, cb: () => void) => {
          if (event === 'finish') cb();
          return mockWriteStream;
        }),
      };
      (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream as any);
      const stream = { pipe: jest.fn(), on: jest.fn() };
      storage.downloadStream.mockResolvedValue(stream as any);
      const mockScanner = {
        scan: jest.fn((path, callback) => callback(null, path, 'EICAR-Test-Signature')),
      };
      (clamav.createScanner as jest.Mock).mockReturnValue(mockScanner);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await processor.scanFile('testfile.txt');

      expect(result).toEqual({ isInfected: true, virusName: 'EICAR-Test-Signature' });
    });

    it('should handle virus found (legacy object result)', async () => {
      const mockWriteStream = {
        on: jest.fn((event: string, cb: () => void) => {
          if (event === 'finish') cb();
          return mockWriteStream;
        }),
      };
      (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream as any);
      const stream = { pipe: jest.fn(), on: jest.fn() };
      storage.downloadStream.mockResolvedValue(stream as any);
      const mockScanner = {
        scan: jest.fn((path, callback) =>
          callback(null, null, { status: 'FOUND', virus: 'EICAR-Test-Signature' }),
        ),
      };
      (clamav.createScanner as jest.Mock).mockReturnValue(mockScanner);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await processor.scanFile('testfile.txt');

      expect(result).toEqual({ isInfected: true, virusName: 'EICAR-Test-Signature' });
      expect(logger.warn).toHaveBeenCalledWith(
        '[VirusScan] CRITICAL: Virus detected in testfile.txt (EICAR-Test-Signature)',
      );
    });

    it('should handle clamav scan error', async () => {
      const mockWriteStream = {
        on: jest.fn((event: string, cb: () => void) => {
          if (event === 'finish') cb();
          return mockWriteStream;
        }),
      };
      (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream as any);
      const stream = { pipe: jest.fn(), on: jest.fn() };
      storage.downloadStream.mockResolvedValue(stream as any);
      const mockScanner = {
        scan: jest.fn((path, callback) => callback(new Error('Scanner offline'), null, null)),
      };
      (clamav.createScanner as jest.Mock).mockReturnValue(mockScanner);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await processor.scanFile('testfile.txt');

      expect(result).toEqual({
        isInfected: false,
        scanUnavailable: true,
        details: 'Security scan unavailable: Scanner offline',
      });
      expect(logger.error).toHaveBeenCalledWith(
        '[VirusScan] ClamAV service error: Scanner offline',
      );
    });

    it('should handle caught error during processing', async () => {
      storage.downloadStream.mockRejectedValue(new Error('S3 Download Failed'));

      const result = await processor.scanFile('testfile.txt');
      jest.runAllTimers();

      expect(result).toEqual({
        isInfected: false,
        scanUnavailable: true,
        details: 'Internal Error: S3 Download Failed',
      });
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/media-worker/1234567890-testfile.txt');
    });

    it('should fail-closed when MEDIA_SKIP_VIRUS_SCAN is enabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'media-worker.skipVirusScan') return true;
        return undefined;
      });

      const result = await processor.scanFile('eicar.com');

      expect(result).toEqual({
        isInfected: false,
        scanUnavailable: true,
        details: 'Virus scan skipped by configuration (fail-closed quarantine)',
      });
      expect(storage.downloadStream).not.toHaveBeenCalled();
    });
  });
});
