import Fastify from 'fastify';
import { config } from './config';
import { redis } from './redis';
import { initializeDatabase } from './database';
import { Logger } from './utils/logger';

const logger = new Logger('policy-engine');

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  // Register routes
  await fastify.register(import('./routes/health'));
  await fastify.register(import('./routes/evaluation'));
  await fastify.register(import('./routes/policies'));
  await fastify.register(import('./routes/audit'));

  return fastify;
}

async function start() {
  try {
    // Initialize database
    await initializeDatabase();

    const server = await buildServer();
    
    await server.listen({
      host: config.host,
      port: config.port
    });

    logger.info(`Policy engine running on ${config.host}:${config.port}`);
  } catch (err) {
    logger.error('Failed to start policy engine', err);
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
