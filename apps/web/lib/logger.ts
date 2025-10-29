type LogLevel = "debug" | "info" | "warn" | "error";

function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return "";
  }
}

export function createLogger(namespace?: string) {
  const isProd = process.env.NODE_ENV === "production";
  const ns = namespace ? `[${namespace}]` : "";

  const write = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (!isProd) {
      const args: unknown[] = [ns, message];
      if (context) args.push(context);
      if (level === "debug") console.debug(...args);
      else if (level === "info") console.info(...args);
      else if (level === "warn") console.warn(...args);
      else console.error(...args);
      return;
    }
    const payload = {
      timestamp: nowIso(),
      level,
      message,
      namespace,
      context,
    };
    // Shape for log shippers (Logtail/OTEL) — wiring to be added later
    console.log(JSON.stringify(payload));
  };

  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => write("debug", msg, ctx),
    info: (msg: string, ctx?: Record<string, unknown>) => write("info", msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>) => write("warn", msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => write("error", msg, ctx),
  };
}


