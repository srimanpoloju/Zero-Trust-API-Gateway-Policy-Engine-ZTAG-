import { config } from '../config';
import type { ProxyRequest, ProxyResponse } from '@ztag/shared';

export class ProxyService {
  static async proxyRequest(
    targetUrl: string, 
    request: ProxyRequest
  ): Promise<ProxyResponse> {
    try {
      const url = new URL(targetUrl + request.path);
      
      // Build headers, removing sensitive ones
      const headers = { ...request.headers };
      const sensitiveHeaders = ['host', 'authorization', 'cookie', 'x-forwarded-for'];
      
      sensitiveHeaders.forEach(header => {
        delete headers[header];
      });

      const fetchOptions: RequestInit = {
        method: request.method,
        headers: {
          'X-Forwarded-For': headers['x-forwarded-for'] || 'unknown',
          'X-Request-ID': headers['x-request-id'] || '',
          ...headers
        }
      };

      if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        fetchOptions.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
      }

      if (request.query) {
        Object.entries(request.query).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString(), fetchOptions);
      
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseBody = await response.text();

      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody
      };
    } catch (error) {
      console.error('Proxy request failed:', error);
      throw new Error(`Proxy request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
