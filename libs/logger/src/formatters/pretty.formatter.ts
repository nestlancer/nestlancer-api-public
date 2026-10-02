export function formatPretty(data: Record<string, unknown>): string {
  const { level, message, context } = data;
  return `[${new Date().toISOString()}] [${String(level).toUpperCase()}] ${context ? `[${context}] ` : ''}${message}`;
}
