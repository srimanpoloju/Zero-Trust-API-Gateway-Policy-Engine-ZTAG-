import { ProxyRequest, ProxyResponse } from '@ztag/shared';
/**
 * Service for proxying requests to downstream services.
 */
export declare class ProxyService {
    static proxyRequest(targetUrl: string, proxyRequest: ProxyRequest, requestId: string, sourceIp: string, stripHeaders?: string[]): Promise<ProxyResponse>;
}
//# sourceMappingURL=ProxyService.d.ts.map