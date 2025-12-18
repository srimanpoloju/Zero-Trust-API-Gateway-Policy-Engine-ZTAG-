import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { config } from './config';
import { redis } from './redis';
import { initializeDatabase as initializeGatewayDatabase, db } from './database'; // Gateway's own DB connection
import { logger } from './utils/logger';
import { gatewayRoutes } from './routes/proxy'; // Renamed from proxyRoutes to gatewayRoutes for clarity
import { PrometheusService } from './services/PrometheusService';
import { rawBodyParser } from './plugins/rawBodyParser';
import { AuditLog, JWTClaims, RouteConfig, APIError } from '@ztag/shared';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible'; // Provides some common decorators like .notFound()

async function buildServer() {
  const fastify = Fastify({
    logger: logger,
    requestIdHeader: 'x-request-id',
    // Ensure rawBody is available for proxying
    return500AsHtml: false, // Return JSON for errors
  });

  // --- Decorators for Request/Reply objects ---
  // Store JWT claims
  fastify.decorateRequest('user', null);
  // Store audit log data throughout the request lifecycle
  fastify.decorateRequest('audit', null);
  // Store matched route configuration
  fastify.decorateRequest('routeConfig', null);

  // Helper for consistent error responses
  fastify.decorateReply('sendError', function (this: FastifyReply, code: string, message: string, statusCode: number, details?: Record<string, any>) {
    return this.status(statusCode).send({
      error: {
        code,
        message,
        requestId: this.request.id,
        details,
      },
    } as APIError);
  });

  // --- Plugins ---
  await fastify.register(fastifySensible); // For .notFound(), .badRequest(), etc.
  await fastify.register(fastifyCors, {
    origin: '*', // Allow all origins for development/demo, tighten in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });
  await fastify.register(fastifyHelmet); // Security headers
  await fastify.register(rawBodyParser); // Custom raw body parser

  // Swagger/OpenAPI for documentation
  await fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'ZTAG API Gateway',
        description: 'API documentation for the ZTAG Gateway service',
        version: '1.0.0'
      },
      host: `${config.host}:${config.port}`,
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Gateway', description: 'Core API Gateway functionality' },
        { name: 'Health', description: 'Health check endpoint' },
        { name: 'Metrics', description: 'Prometheus metrics endpoint' }
      ]
    }
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next() },
      preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
    transformSpecificationClone: true
  });

  // --- Routes ---
  // All gateway routes, including /api/* proxy, /health, /metrics
  fastify.register(gatewayRoutes);

  // --- Error Handling ---
  fastify.setErrorHandler((error, request, reply) => {
    logger.error({ err: error, requestId: request.id }, 'Fastify error handler caught an error');
    if (reply.sent) {
      return;
    }
    // Attempt to parse validation errors from Zod/Fastify
    if (error.validation) {
      return reply.sendError('VALIDATION_ERROR', 'Request validation failed', 400, error.validation);
    }
    // Default to internal server error
    return reply.sendError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred', 500);
  });

  // Handle 404 Not Found
  fastify.setNotFoundHandler((request, reply) => {
    reply.sendError('NOT_FOUND', `Route ${request.method}:${request.url} not found`, 404);
  });


  return fastify;
}

async function start() {
  try {
    // Initialize services
    logger.info('Initializing Redis...');
    await redis.initialize();
    logger.info('Redis initialized.');

    logger.info('Initializing Gateway database connection...');
    await initializeGatewayDatabase();
    logger.info('Gateway database connection established.');

    // Initialize Prometheus metrics (already done on import of PrometheusService)
    PrometheusService.initialize();

    const server = await buildServer();
    
    await server.listen({
      host: config.host,
      port: config.port
    });

    logger.info(`Gateway running on http://${config.host}:${config.port}`);
    logger.info(`Gateway documentation available at http://${config.host}:${config.port}/documentation`);

  } catch (err) {
    logger.error({ err }, 'Failed to start gateway');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redis.close();
  // No need to close pg pool explicitly, it will be managed by process exit
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redis.close();
  process.exit(0);
});

start();
