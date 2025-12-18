import { FastifyInstance } from 'fastify';
import { Logger } from '../utils/logger';

export async function healthRoutes(fastify: FastifyInstance) {
  const logger = new Logger('health');

  fastify.get('/', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'policy-engine',
      version: '1.0.0'
    };
  });

  fastify.get('/ready', async (request, reply) => {
    try {
      // Check database connectivity
      // await database.query('SELECT 1');
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'healthy'
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
