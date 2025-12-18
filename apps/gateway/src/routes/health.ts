import { FastifyInstance } from 'fastify';
import { Logger } from '../utils/logger';

export async function healthRoutes(fastify: FastifyInstance) {
  const logger = new Logger('health');

  fastify.get('/', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'gateway',
      version: '1.0.0'
    };
  });

  fastify.get('/ready', async (request, reply) => {
    try {
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          redis: 'checking',
          policyEngine: 'checking'
        }
      };
    } catch (error) {
      logger.error('Health check failed', error);
      reply.status(503);
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}
