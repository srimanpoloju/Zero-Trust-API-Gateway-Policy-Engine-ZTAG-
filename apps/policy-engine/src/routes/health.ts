import { FastifyInstance } from 'fastify';
import { db } from '../database';
import { logger as globalLogger } from '../utils/logger';

export async function healthRoutes(fastify: FastifyInstance) {
  const logger = globalLogger.child({ route: 'health' });

  fastify.get('/health', async (request, reply) => {
    try {
      // Check database connectivity
      await db.query('SELECT 1');
      
      logger.info('Health check successful');
      return reply.status(200).send({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ err: error }, 'Health check failed');
      return reply.status(500).send({ status: 'error', reason: 'Database connection failed' });
    }
  });
}