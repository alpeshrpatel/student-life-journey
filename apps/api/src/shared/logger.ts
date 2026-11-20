export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  event: string;
  requestId?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface Logger {
  log(level: LogLevel, fields: LogFields): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Keys that must never reach a log line (privacy rules). Matching is case-insensitive. */
const FORBIDDEN_FIELDS = new Set([
  "body",
  "email",
  "name",
  "token",
  "authorization",
  "cookie",
  "message",
  "prompt",
]);

export function createLogger(sink: (line: string) => void, minLevel: LogLevel): Logger {
  return {
    log(level, fields) {
      if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) {
        return;
      }
      const kept: Record<string, string | number | boolean | null | undefined> = {};
      let redacted = false;
      for (const [key, value] of Object.entries(fields)) {
        if (FORBIDDEN_FIELDS.has(key.toLowerCase())) {
          redacted = true;
        } else {
          kept[key] = value;
        }
      }
      sink(JSON.stringify({ level, ...kept, ...(redacted ? { redacted: true } : {}) }));
    },
  };
}

/** The only place `console.*` is allowed (see the `no-console` rule). */
export function createConsoleLogger(environment: string): Logger {
  return createLogger(
    (line) => {
      console.log(line);
    },
    environment === "dev" ? "debug" : "info",
  );
}

export const consoleLogger: Logger = createLogger((line) => {
  console.log(line);
}, "info");
