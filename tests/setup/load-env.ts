/**
 * Jest setupFiles entry — loads `.env.test` before integration/unit suites run.
 * Parses env file directly (no dotenv dep) so values always apply in child packages.
 */
import * as fs from 'fs';
import * as path from 'path';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

const envPath = path.resolve(__dirname, '../../.env.test');
if (!fs.existsSync(envPath)) {
  process.stderr.write(`[jest setup] Warning: ${envPath} not found\n`);
} else {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
