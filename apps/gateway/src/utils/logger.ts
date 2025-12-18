export class Logger {
  constructor(private context: string) {}

  info(message: string, meta?: any): void {
    console.log(JSON.stringify({
      level: 'info',
      message,
      context: this.context,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }

  warn(message: string, meta?: any): void {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      context: this.context,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }

  error(message: string, error?: any): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      context: this.context,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    }));
  }

  debug(message: string, meta?: any): void {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      context: this.context,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
}
