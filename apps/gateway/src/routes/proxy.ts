import { FastifyInstance } from 'fastify';
import { JWTService } from '../services/JWTService';
import { PolicyService } from '../services/PolicyService';
import { RateLimitService } from '../services/RateLimitService';
import { ProxyService } from '../services/ProxyService';
import { RequestContextManager } from '../middleware/RequestContext';
import { DecisionRequestSchema, DecisionResponseSchema } from '@ztag/shared';
import { Logger } from '../utils/logger';

export async function proxyRoutes(fastify: FastifyInstance) {
  const logger = new Logger('proxy');

  // Main proxy route for API requests
  fastify.all('/api/*', async (request, reply) => {
    const startTime = Date.now();
    const context = RequestContextManager.createContext();
    
    try {
      // Extract JWT from Authorization header
      const authHeader = request.headers['authorization'] as string;
      const token = JWTService.extractTokenFromHeader(authHeader);
      
      if (!token) {
        reply.status(401);
        return {
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token required',
            requestId: context.requestId
          }
        };
      }

      // Validate JWT and extract claims
      const claims = JWTService.validateToken(token);
      context.subject = claims;

      // Determine target service based on path
      const path = request.url;
      let targetService = 'echo-service';
      let targetUrl = '';

      if (path.startsWith('/api/echo/')) {
        targetService = 'echo-service';
        targetUrl = 'http://localhost:7070';
      } else {
        reply.status(404);
        return {
          error: {
            code: 'NO_ROUTE',
            message: 'No route configured for this path',
            requestId: context.requestId
          }
        };
      }

      context.service = targetService;
      context.path = path;
      context.method = request.method;

      // Create decision request
      const decisionRequest = {
        subject: claims,
        resource: {
          service: targetService,
          path: path.replace('/api/', ''),
          method: request.method
        },
        context: {
          ip: request.ip || 'unknown',
          userAgent: request.headers['user-agent'] as string,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
          tenant: claims.tenant
        }
      };

      // Evaluate policy
      const decision = await PolicyService.evaluate(decisionRequest);

      if (decision.decision === 'DENY') {
        const latency = Date.now() - startTime;
        logger.warn('Request denied by policy', {
          requestId: context.requestId,
          subject: claims.sub,
          path,
          reason: decision.reason
        });

        reply.status(403);
        return {
          error: {
            code: 'ACCESS_DENIED',
            message: decision.reason,
            requestId: context.requestId
          }
        };
      }

      // Check rate limiting if obligations include rate limits
      if (decision.obligations?.rateLimit) {
        const rateLimitCheck = await RateLimitService.checkRateLimit(claims, {
          limit: decision.obligations.rateLimit.limit,
          windowSeconds: decision.obligations.rateLimit.windowSeconds,
          key: decision.obligations.rateLimit.key
        });

        if (!rateLimitCheck.allowed) {
          const latency = Date.now() - startTime;
          logger.warn('Request rate limited', {
            requestId: context.requestId,
            subject: claims.sub,
            path,
            remaining: rateLimitCheck.remaining
          });

          reply.status(429);
          return {
            error: {
              code: 'RATE_LIMITED',
              message: 'Rate limit exceeded',
              requestId: context.requestId,
              details: {
                resetTime: rateLimitCheck.resetTime,
                remaining: rateLimitCheck.remaining
              }
            }
          };
        }
      }

      // Proxy request to downstream service
      const proxyRequest = {
        method: request.method,
        path: path.replace('/api/', ''),
        headers: request.headers as Record<string, string>,
        body: request.body,
        query: request.query
      };

      const response = await ProxyService.proxyRequest(targetUrl, proxyRequest);
      const latency = Date.now() - startTime;

      logger.info('Request proxied successfully', {
        requestId: context.requestId,
        subject: claims.sub,
        path,
        statusCode: response.statusCode,
        latency
      });

      // Set response headers and send response
      reply.status(response.statusCode);
      Object.entries(response.headers).forEach(([key, value]) => {
        reply.header(key, value);
      });

      return response.body;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('Proxy request failed', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency
      });

      reply.status(500);
      return {
        error: {
          code: 'PROXY_ERROR',
          message: 'Internal proxy error',
          requestId: context.requestId
        }
      };
    } finally {
      RequestContextManager.cleanupContext(context.requestId);
    }
  });
}
