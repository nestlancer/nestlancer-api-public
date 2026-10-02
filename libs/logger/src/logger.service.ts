import { Injectable, LoggerService, Inject } from '@nestjs/common';

import { writeLog } from './write-log';

@Injectable()
export class NestlancerLoggerService implements LoggerService {
  constructor(@Inject('LOGGER_OPTIONS') private readonly options: { level?: string }) {}

  log(message: string, context?: string): void {
    writeLog('info', message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    writeLog('error', message, { trace, context });
  }

  warn(message: string, context?: string): void {
    writeLog('warn', message, { context });
  }

  debug(message: string, context?: string): void {
    if (this.options.level === 'debug') writeLog('debug', message, { context });
  }

  verbose(message: string, context?: string): void {
    writeLog('verbose', message, { context });
  }
}
