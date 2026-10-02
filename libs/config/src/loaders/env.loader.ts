import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export function loadEnvConfig(): Record<string, string> {
  const envFile = resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);
  const fallbackFile = resolve(process.cwd(), '.env');

  const file = existsSync(envFile) ? envFile : existsSync(fallbackFile) ? fallbackFile : null;

  const logMsg = `[LOADER] NODE_ENV: ${process.env.NODE_ENV}, File used: ${file}\n`;
  writeFileSync('/tmp/loader_debug.log', logMsg, { flag: 'a' });

  if (!file) {
    writeFileSync('/tmp/loader_debug.log', `[LOADER] No file found!\n`, { flag: 'a' });
    return {};
  }

  const content = readFileSync(file, 'utf-8');
  const config: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      const k = key.trim();
      config[k] = valueParts
        .join('=')
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }

  writeFileSync(
    '/tmp/loader_debug.log',
    `[LOADER] Keys found: ${Object.keys(config)
      .filter((k) => k.includes('JWT'))
      .join(', ')}\n`,
    { flag: 'a' },
  );

  return config;
}
