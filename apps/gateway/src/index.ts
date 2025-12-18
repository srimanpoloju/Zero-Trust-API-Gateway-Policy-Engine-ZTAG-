import Fastify from 'fastify';
import { config } from './config';
import { redis } from './redis';
import { Logger } from './utils/logger';

const logger = new Logger('gateway');

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  // Register routes
  await fastify.register(import('./routes/health'));
  await fastify.register(import('./routes/proxy'));

  return fastify;
}

async function start() {
  try {
    // Initialize Redis
    await redis.initialize();

    const server = await buildServer();
    
    await server.listen({
      host: config.host,
      port: config.port
    });

    logger.info(`Gateway running on ${config.host}:${config.port}`);
  } catch (err) {
    logger.error('Failed to start gateway', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redis.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redis.close();
  process.exit(0);
});

start();
