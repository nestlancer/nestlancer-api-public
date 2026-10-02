/** Retry a function with exponential backoff */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number; backoffMultiplier?: number } = {},
): Promise<T> {
  const { attempts = 3, delayMs = 500, backoffMultiplier = 2 } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < attempts) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
