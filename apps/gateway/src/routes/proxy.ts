import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { JWTService } from '../services/JWTService';
import { PolicyService } from '../services/PolicyService';
import { RateLimitService } from '../services/RateLimitService';
import { ProxyService } from '../services/ProxyService';
import { AuditService } from '../services/AuditService';
import { config } from '../config';
import { logger } from '../utils/logger';
import { APIError, AuditLog, DecisionRequest, JWTClaims, RateLimitResponse, RouteConfig } from '@ztag/shared';
import { PrometheusService } from '../services/PrometheusService';
import * as url from 'url';

// Extend FastifyRequest to include our custom properties
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTClaims;
    audit: Omit<AuditLog, 'id' | 'timestamp'>; // Audit data collected throughout the request
    routeConfig?: RouteConfig; // Matched route configuration
    rawBody?: Buffer; // For raw body parsing
  }
  interface FastifyReply {
    sendError: (code: string, message: string, statusCode: number, details?: Record<string, any>) => FastifyReply;
  }
}

export async function gatewayRoutes(fastify: FastifyInstance) {
  // Decorate reply with a helper for consistent error responses
  fastify.decorateReply('sendError', function (this: FastifyReply, code: string, message: string, statusCode: number, details?: Record<string, any>) {
    PrometheusService.metrics.deniedRequestsTotal.inc({ code });
    return this.status(statusCode).send({
      error: {
        code,
        message,
        requestId: this.request.id,
        details,
      },
    });
  });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    try {
      // Basic checks for services gateway depends on
      await redis.getClient(); // Check Redis connection
      await db.query('SELECT 1'); // Check Postgres connection

      // Optionally check Policy Engine
      const policyEngineHealth = await fetch(`${config.policyEngineUrl}/health`);
      if (!policyEngineHealth.ok) {
        throw new Error('Policy Engine unhealthy');
      }

      reply.status(200).send({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ err: error, requestId: request.id }, 'Gateway health check failed');
      reply.status(503).send({ status: 'error', message: 'Gateway unhealthy', error: (error as Error).message });
    }
  });

  // Metrics endpoint for Prometheus
  fastify.get('/metrics', async (request, reply) => {
    const metrics = await PrometheusService.getMetrics();
    reply.header('Content-Type', PrometheusService.getMetricsContentType()).send(metrics);
  });


  // Main proxy route for API requests to downstream services
  fastify.all('/api/*', async (request, reply) => {
    const startTime = process.hrtime.bigint(); // High-resolution time for latency
    let statusCode: number = 500; // Default status code
    let auditLogEntry: Omit<AuditLog, 'id' | 'timestamp'>;

    // Initialize audit log structure
    request.audit = {
      requestId: request.id!,
      subject: { sub: 'anonymous', role: 'anonymous' }, // Defaults, updated by JWT
      resource: { service: 'unknown', path: request.url, method: request.method || 'UNKNOWN' },
      context: { ip: request.ip || 'unknown', userAgent: request.headers['user-agent'] },
      decision: 'DENY', // Default to DENY (zero-trust principle)
      reason: 'Unhandled request',
      latencyMs: 0,
      statusCode: 500,
    };

    try {
      PrometheusService.metrics.totalRequestsTotal.inc();

      // 1. JWT Authentication
      const authHeader = request.headers['authorization'];
      const token = JWTService.extractTokenFromHeader(authHeader);

      if (!token) {
        request.audit.reason = 'Authorization token required';
        return reply.sendError('MISSING_TOKEN', 'Authorization token required', 401);
      }

      let claims: JWTClaims;
      try {
        claims = JWTService.validateToken(token);
        request.user = claims;
        request.audit.subject = { sub: claims.sub, role: claims.role, tenant: claims.tenant };
      } catch (error) {
        request.audit.reason = `Invalid token: ${(error as Error).message}`;
        return reply.sendError('INVALID_TOKEN', `Invalid token: ${(error as Error).message}`, 403);
      }

      // 2. Dynamic Routing
      const matchedRoute = config.routeConfigs.find(route => {
        // Match service based on pathPattern and method
        const pathRegex = new RegExp(`^/api${route.pathPattern.replace(/\*/g, '.*').replace(/\//g, '\\/')}$`);
        const methodMatches = route.methods.includes('*') || route.methods.includes(request.method || 'UNKNOWN');
        return pathRegex.test(request.url) && methodMatches;
      });

      if (!matchedRoute) {
        request.audit.reason = 'No route configured for this path';
        return reply.sendError('NO_ROUTE', 'No route configured for this path', 404);
      }
      request.routeConfig = matchedRoute;
      request.audit.resource = {
        service: matchedRoute.service,
        path: request.url,
        method: request.method || 'UNKNOWN',
      };

      // Path for downstream service (remove /api prefix)
      const downstreamPath = request.url.substring(4); // Remove '/api'

      // 3. Policy Evaluation
      const decisionRequest: DecisionRequest = {
        subject: claims,
        resource: {
          service: matchedRoute.service,
          path: downstreamPath, // Path sent to Policy Engine should not have /api prefix
          method: request.method || 'UNKNOWN',
        },
        context: {
          ip: request.ip,
          userAgent: request.headers['user-agent'] || 'unknown',
          timestamp: new Date().toISOString(),
          requestId: request.id!,
          tenant: claims.tenant,
        },
      };

      const decisionResponse = await PolicyService.evaluate(decisionRequest);
      request.audit.decision = decisionResponse.decision;
      request.audit.reason = decisionResponse.reason;
      request.audit.policyId = decisionResponse.policyId;

      if (decisionResponse.decision === 'DENY') {
        return reply.sendError('ACCESS_DENIED', decisionResponse.reason, 403);
      }

      // 4. Rate Limiting (Obligation Enforcement)
      let rateLimitInfo: RateLimitResponse | undefined;
      if (decisionResponse.obligations?.rateLimit) {
        const rlOptions = decisionResponse.obligations.rateLimit;
        rateLimitInfo = await RateLimitService.checkRateLimit(
          claims,
          {
            limit: rlOptions.limit,
            windowSeconds: rlOptions.windowSeconds,
            key: rlOptions.key,
          },
          request.id!
        );

        request.audit.rateLimit = {
          key: rateLimitInfo.key,
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          reset: new Date(rateLimitInfo.resetTime).getTime() / 1000, // Unix timestamp
          windowSeconds: rateLimitInfo.windowSeconds
        };

        if (!rateLimitInfo.allowed) {
          PrometheusService.metrics.rateLimitedRequestsTotal.inc();
          request.audit.reason = 'Rate limit exceeded';
          return reply.sendError('RATE_LIMITED', 'Rate limit exceeded', 429, {
            resetTime: rateLimitInfo.resetTime,
            remaining: rateLimitInfo.remaining,
          });
        }
      }

      // 5. Proxy Request
      const proxyResponse = await ProxyService.proxyRequest(
        matchedRoute.targetUrl,
        {
          method: request.method!,
          path: downstreamPath,
          headers: request.headers as Record<string, string>,
          body: request.rawBody, // Use raw body if available
          query: request.query as Record<string, any>,
        },
        request.id!,
        request.ip!,
        matchedRoute.stripHeaders
      );

      statusCode = proxyResponse.statusCode;
      request.audit.statusCode = statusCode;

      reply.status(statusCode);
      Object.entries(proxyResponse.headers).forEach(([key, value]) => {
        // Avoid setting host header from downstream if already set by Fastify
        if (key.toLowerCase() !== 'host') {
          reply.header(key, value);
        }
      });
      return reply.send(proxyResponse.body);

    } catch (error) {
      logger.error({ err: error, requestId: request.id }, 'Gateway internal error');
      request.audit.error = (error as Error).message;
      statusCode = 500;
      request.audit.statusCode = statusCode;
      return reply.sendError('INTERNAL_GATEWAY_ERROR', 'An internal gateway error occurred', 500);

    } finally {
      // Finalize and record audit log
      const latency = Number(process.hrtime.bigint() - startTime) / 1_000_000; // convert nanoseconds to milliseconds
      request.audit.latencyMs = latency;
      request.audit.statusCode = statusCode; // Ensure final status code is recorded

      // Only record audit log if claims were successfully extracted
      if (request.user) {
        AuditService.recordAudit(request.audit);
      }
      
      // Update metrics
      PrometheusService.metrics.requestDurationHistogram.observe(latency);
      if (request.audit.decision === 'ALLOW') {
        PrometheusService.metrics.allowedRequestsTotal.inc();
      } else {
        PrometheusService.metrics.deniedRequestsTotal.inc({ code: request.audit.reason });
      }
    }
  });
}

// Utility to read raw body for proxying
// This needs to be registered as a Fastify plugin in index.ts
// import fp from 'fastify-plugin';
// export const rawBodyPlugin = fp(async (fastify, opts, next) => {
//   fastify.addContentTypeParser('*', (req, payload, done) => {
//     let body = '';
//     payload.on('data', chunk => { body += chunk; });
//     payload.on('end', () => {
//       req.rawBody = Buffer.from(body);
//       done(null, body);
//     });
//     payload.on('error', done);
//   });
// });
