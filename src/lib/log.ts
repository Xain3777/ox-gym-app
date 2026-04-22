/** Structured JSON logger — output captured by Vercel Function Logs. */
export function logInfo(source: string, message: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", source, message, ...meta, ts: new Date().toISOString() }));
}

export function logError(source: string, error: unknown, meta?: Record<string, unknown>) {
  const err = error instanceof Error
    ? { message: error.message, stack: error.stack }
    : { message: String(error) };
  console.error(JSON.stringify({ level: "error", source, error: err, ...meta, ts: new Date().toISOString() }));
}

export function logWarn(source: string, message: string, meta?: Record<string, unknown>) {
  console.warn(JSON.stringify({ level: "warn", source, message, ...meta, ts: new Date().toISOString() }));
}
