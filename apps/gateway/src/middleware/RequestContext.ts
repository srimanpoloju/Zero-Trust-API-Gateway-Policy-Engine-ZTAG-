import { RequestIdGenerator } from '@ztag/shared';

export interface RequestContext {
  requestId: string;
  startTime: number;
  subject?: any;
  service?: string;
  path?: string;
  method?: string;
}

export class RequestContextManager {
  private static contexts = new Map<string, RequestContext>();

  static createContext(): RequestContext {
    const requestId = RequestIdGenerator.generate();
    const context: RequestContext = {
      requestId,
      startTime: Date.now()
    };

    this.contexts.set(requestId, context);
    return context;
  }

  static getContext(requestId: string): RequestContext | undefined {
    return this.contexts.get(requestId);
  }

  static updateContext(requestId: string, updates: Partial<RequestContext>): void {
    const context = this.contexts.get(requestId);
    if (context) {
      Object.assign(context, updates);
    }
  }

  static cleanupContext(requestId: string): void {
    this.contexts.delete(requestId);
  }

  static getLatency(requestId: string): number {
    const context = this.contexts.get(requestId);
    return context ? Date.now() - context.startTime : 0;
  }
}
