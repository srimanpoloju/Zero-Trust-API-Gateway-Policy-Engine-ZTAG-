import { RequestIdGenerator } from '@ztag/shared';
export class RequestContextManager {
    static contexts = new Map();
    static createContext() {
        const requestId = RequestIdGenerator.generate();
        const context = {
            requestId,
            startTime: Date.now()
        };
        this.contexts.set(requestId, context);
        return context;
    }
    static getContext(requestId) {
        return this.contexts.get(requestId);
    }
    static updateContext(requestId, updates) {
        const context = this.contexts.get(requestId);
        if (context) {
            Object.assign(context, updates);
        }
    }
    static cleanupContext(requestId) {
        this.contexts.delete(requestId);
    }
    static getLatency(requestId) {
        const context = this.contexts.get(requestId);
        return context ? Date.now() - context.startTime : 0;
    }
}
//# sourceMappingURL=RequestContext.js.map