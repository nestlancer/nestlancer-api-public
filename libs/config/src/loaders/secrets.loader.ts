import { Logger } from '@nestjs/common';

const logger = new Logger('SecretsLoader');

/**
 * Validates that required secrets are present in environment variables.
 * In production, these are typically injected by the infrastructure (Vault, K8s Secrets, etc.).
 */
export async function loadSecrets(): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};
  const requiredSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];

  for (const key of requiredSecrets) {
    const value = process.env[key];
    if (value) {
      secrets[key] = value;
    } else {
      logger.warn(`Required secret ${key} is not set in environment`);
    }
  }

  logger.log(`Secrets validated (${Object.keys(secrets).length} secrets present)`);

  return secrets;
}
