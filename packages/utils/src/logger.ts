export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(namespace?: string, level: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug"): Logger {
  const shouldLog = (msgLevel: LogLevel) => {
    const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
    return order[msgLevel] >= order[level];
  };

  const prefix = namespace ? `[${namespace}]` : "";

  return {
    debug: (...args) => { if (shouldLog("debug")) console.debug(prefix, ...args); },
    info: (...args) => { if (shouldLog("info")) console.info(prefix, ...args); },
    warn: (...args) => { if (shouldLog("warn")) console.warn(prefix, ...args); },
    error: (...args) => { if (shouldLog("error")) console.error(prefix, ...args); },
  };
}
