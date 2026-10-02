export function formatJson(data: Record<string, unknown>): string {
  return JSON.stringify({ ...data, timestamp: new Date().toISOString() });
}
