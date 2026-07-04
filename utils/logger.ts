// utils/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private level: LogLevel;
  private prefix: string;
  private enabled: boolean;

  constructor(config: LoggerConfig = { level: LogLevel.INFO }) {
    this.level = config.level;
    this.prefix = config.prefix || "[POS]";
    this.enabled = config.enabled !== undefined ? config.enabled : __DEV__;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  private format(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} ${this.prefix} ${level}: ${message}`;
  }

  debug(message: string, ...args: any[]) {
    if (this.enabled && this.level <= LogLevel.DEBUG) {
      console.debug(this.format("DEBUG", message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.enabled && this.level <= LogLevel.INFO) {
      console.log(this.format("INFO", message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.enabled && this.level <= LogLevel.WARN) {
      console.warn(this.format("WARN", message), ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.enabled && this.level <= LogLevel.ERROR) {
      console.error(this.format("ERROR", message), ...args);
    }
  }

  // For analytics/remote logging
  captureException(error: Error, context?: Record<string, any>) {
    if (this.enabled) {
      console.error(this.format("EXCEPTION", error.message), {
        error,
        context,
      });
      // Send to analytics service
      // analytics.logError(error, context);
    }
  }
}

export const logger = new Logger({
  level: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
  prefix: "[POS]",
});
