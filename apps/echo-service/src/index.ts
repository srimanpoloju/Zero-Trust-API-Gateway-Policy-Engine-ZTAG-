import Fastify from 'fastify';
import { config } from './config';
import { Logger } from './utils/logger';

const logger = new Logger('echo-service');

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  // Echo endpoint - returns request data
  fastify.get('/echo', async (request, reply) => {
    return {
      message: 'Echo service response',
      timestamp: new Date().toISOString(),
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        query: request.query,
        params: request.params,
        ip: request.ip
      }
    };
  });

  // Health endpoint
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'echo-service',
      version: '1.0.0'
    };
  });

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    
    await server.listen({
      host: config.host,
      port: config.port
    });

    logger.info(`Echo service running on ${config.host}:${config.port}`);
  } catch (err) {
    logger.error('Failed to start echo service', err);
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
