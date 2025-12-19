export interface RequestContext {
    requestId: string;
    startTime: number;
    subject?: any;
    service?: string;
    path?: string;
    method?: string;
}
export declare class RequestContextManager {
    private static contexts;
    static createContext(): RequestContext;
    static getContext(requestId: string): RequestContext | undefined;
    static updateContext(requestId: string, updates: Partial<RequestContext>): void;
    static cleanupContext(requestId: string): void;
    static getLatency(requestId: string): number;
}
//# sourceMappingURL=RequestContext.d.ts.map