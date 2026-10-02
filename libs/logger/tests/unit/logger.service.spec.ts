import { Test, TestingModule } from '@nestjs/testing';
import { NestlancerLoggerService } from '../../src/logger.service';

describe('NestlancerLoggerService', () => {
  let service: NestlancerLoggerService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'LOGGER_OPTIONS',
          useValue: { level: 'debug' },
        },
        NestlancerLoggerService,
      ],
    }).compile();

    service = module.get<NestlancerLoggerService>(NestlancerLoggerService);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log info messages in JSON format', () => {
    service.log('test log', 'test-context');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"info"'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"test log"'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"context":"test-context"'));
  });

  it('should log error messages in JSON format', () => {
    const errorSpy = jest.spyOn(console, 'error');
    service.error('test error', 'stack trace', 'test-context');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"error"'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"trace":"stack trace"'));
  });

  it('should respect log level for debug', () => {
    const debugSpy = jest.spyOn(console, 'debug');
    service.debug('debug message');
    expect(debugSpy).toHaveBeenCalled();
  });
});
