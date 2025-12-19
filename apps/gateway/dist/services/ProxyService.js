import { logger } from '../utils/logger';
import { request as undiciRequest } from 'undici';
/**
 * Service for proxying requests to downstream services.
 */
export class ProxyService {
    static async proxyRequest(targetUrl, proxyRequest, requestId, sourceIp, stripHeaders = []) {
        const { method, path, headers, body, query } = proxyRequest;
        try {
            const url = new URL(targetUrl + path);
            // Add query parameters if any
            if (query) {
                Object.entries(query).forEach(([key, value]) => {
                    url.searchParams.append(key, String(value));
                });
            }
            // Filter and prepare headers for the downstream request
            const filteredHeaders = {};
            for (const key in headers) {
                if (headers.hasOwnProperty(key)) {
                    const lowerCaseKey = key.toLowerCase();
                    // Do not strip `host` or `authorization` by default here, as policy engine handles auth
                    // Sensitive headers passed from RouteConfig can be stripped.
                    if (!stripHeaders.includes(lowerCaseKey)) {
                        filteredHeaders[key] = headers[key];
                    }
                }
            }
            // Propagate request ID and original IP
            filteredHeaders['X-Request-ID'] = requestId;
            filteredHeaders['X-Forwarded-For'] = sourceIp;
            const fetchOptions = {
                method,
                headers: filteredHeaders,
                // undici handles body based on method and content-type
                body: (method === 'POST' || method === 'PUT' || method === 'PATCH') ? body : undefined,
                // duplex: 'half' is required for POST/PUT requests with undici's fetch
                // when body is not a stream.
                ...(body && ['POST', 'PUT', 'PATCH'].includes(method) && { duplex: 'half' }),
                throwOnError: false // Do not throw on non-2xx responses, we want to return them
            };
            const { statusCode, headers: responseHeaders, body: responseBodyStream } = await undiciRequest(url.toString(), fetchOptions);
            // Convert response headers to a simple object
            const downstreamResponseHeaders = {};
            for (const [key, value] of responseHeaders) {
                downstreamResponseHeaders[key] = value;
            }
            const responseBody = await responseBodyStream.text();
            return {
                statusCode,
                headers: downstreamResponseHeaders,
                body: responseBody
            };
        }
        catch (error) {
            logger.error({ err: error, targetUrl, path, requestId }, 'Proxy request failed');
            throw new Error(`Proxy request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
//# sourceMappingURL=ProxyService.js.map