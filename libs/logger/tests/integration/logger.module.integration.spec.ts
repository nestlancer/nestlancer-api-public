import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '../../src/logger.module';
import { NestlancerLoggerService } from '../../src/logger.service';
import { ConfigModule } from '@nestjs/config';

describe('LoggerModule (Integration)', () => {
  let module: TestingModule;
  let service: NestlancerLoggerService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        LoggerModule.forRoot({ level: 'debug' }),
      ],
    }).compile();

    service = module.get<NestlancerLoggerService>(NestlancerLoggerService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log()', () => {
    it('should write JSON to console.log with correct structure', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      service.log('Test info message', 'TestContext');

      expect(spy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(spy.mock.calls[0][0]);
      expect(output.level).toBe('info');
      expect(output.message).toBe('Test info message');
      expect(output.context).toBe('TestContext');
      expect(output.timestamp).toBeDefined();
      spy.mockRestore();
    });
  });

  describe('error()', () => {
    it('should write JSON to console.error with trace', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      service.error('Something broke', 'Error stack trace', 'ErrorContext');

      expect(spy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(spy.mock.calls[0][0]);
      expect(output.level).toBe('error');
      expect(output.message).toBe('Something broke');
      expect(output.trace).toBe('Error stack trace');
      expect(output.context).toBe('ErrorContext');
      spy.mockRestore();
    });
  });

  describe('warn()', () => {
    it('should write JSON to console.warn', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      service.warn('Deprecation notice', 'WarnContext');

      expect(spy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(spy.mock.calls[0][0]);
      expect(output.level).toBe('warn');
      expect(output.message).toBe('Deprecation notice');
      expect(output.context).toBe('WarnContext');
      spy.mockRestore();
    });
  });

  describe('debug()', () => {
    it('should write JSON to console.debug when level is debug', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      service.debug('Debug data', 'DebugContext');

      expect(spy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(spy.mock.calls[0][0]);
      expect(output.level).toBe('debug');
      expect(output.message).toBe('Debug data');
      expect(output.context).toBe('DebugContext');
      spy.mockRestore();
    });
  });

  describe('debug() gating', () => {
    let nonDebugService: NestlancerLoggerService;
    let nonDebugModule: TestingModule;

    beforeAll(async () => {
      nonDebugModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
          LoggerModule.forRoot({ level: 'info' }),
        ],
      }).compile();

      nonDebugService = nonDebugModule.get<NestlancerLoggerService>(NestlancerLoggerService);
    });

    afterAll(async () => {
      if (nonDebugModule) {
        await nonDebugModule.close();
      }
    });

    it('should NOT write to console.debug when level is not debug', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      nonDebugService.debug('This should be suppressed', 'DebugContext');

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('verbose()', () => {
    it('should write JSON to console.log with verbose level', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      service.verbose('Verbose data', 'VerboseContext');

      expect(spy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(spy.mock.calls[0][0]);
      expect(output.level).toBe('verbose');
      expect(output.message).toBe('Verbose data');
      expect(output.context).toBe('VerboseContext');
      spy.mockRestore();
    });
  });
});
