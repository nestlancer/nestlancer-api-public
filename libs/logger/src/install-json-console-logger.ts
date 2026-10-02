import { Logger } from '@nestjs/common';

import { writeLog } from '@nestlancer/common';

function asText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Force Nest's Logger (and default NestFactory lines after this call) through
 * the JSON writer so Grafana can parse level / service / correlationId.
 */
export function installJsonConsoleLogger(): void {
  Logger.overrideLogger({
    log: (message, ...optionalParams) =>
      writeLog('info', asText(message), {
        context: optionalParams.map(asText).filter(Boolean).join(' ') || undefined,
      }),
    error: (message, ...optionalParams) =>
      writeLog('error', asText(message), {
        context: optionalParams.map(asText).filter(Boolean).join(' ') || undefined,
      }),
    warn: (message, ...optionalParams) =>
      writeLog('warn', asText(message), {
        context: optionalParams.map(asText).filter(Boolean).join(' ') || undefined,
      }),
    debug: (message, ...optionalParams) =>
      writeLog('debug', asText(message), {
        context: optionalParams.map(asText).filter(Boolean).join(' ') || undefined,
      }),
    verbose: (message, ...optionalParams) =>
      writeLog('verbose', asText(message), {
        context: optionalParams.map(asText).filter(Boolean).join(' ') || undefined,
      }),
  });
}
