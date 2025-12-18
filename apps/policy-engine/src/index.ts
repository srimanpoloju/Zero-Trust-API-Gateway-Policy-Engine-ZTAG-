import Fastify from 'fastify';
import { config } from './config';
import { initializeDatabase } from './database';
import { logger } from './utils/logger'; // Correct import for singleton logger
import { healthRoutes } from './routes/health';
import { evaluationRoutes } from './routes/evaluation';
import { policyRoutes } from './routes/policies';
import { auditRoutes } from './routes/audit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';

async function buildServer() {
  const fastify = Fastify({
    logger: logger, // Use the singleton pino logger
    requestIdHeader: 'x-request-id',
  });

  // Register CORS
  await fastify.register(fastifyCors, {
    origin: '*', // Allow all origins for development/demo, tighten in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Register Swagger/OpenAPI for documentation
  await fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'ZTAG Policy Engine API',
        description: 'API documentation for the ZTAG Policy Engine service',
        version: '1.0.0'
      },
      host: `${config.host}:${config.port}`,
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Evaluation', description: 'Policy evaluation endpoints' },
        { name: 'Policies', description: 'Policy management (CRUD) endpoints' },
        { name: 'Audit', description: 'Audit log viewing endpoints' },
        { name: 'Health', description: 'Health check endpoint' }
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

  // Register routes
  fastify.register(healthRoutes); // No prefix needed, as /health is root
  fastify.register(evaluationRoutes, { prefix: '/evaluate' });
  fastify.register(policyRoutes, { prefix: '/policies' });
  fastify.register(auditRoutes, { prefix: '/audits' });

  return fastify;
}

async function start() {
  try {
    // Initialize database
    logger.info('Initializing database connection...');
    await initializeDatabase();
    logger.info('Database connection established.');

    const server = await buildServer();
    
    await server.listen({
      host: config.host,
      port: config.port
    });

    logger.info(`Policy engine running on http://${config.host}:${config.port}`);
    logger.info(`Policy engine documentation available at http://${config.host}:${config.port}/documentation`);
  } catch (err) {
    logger.error({ err }, 'Failed to start policy engine');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

start();
