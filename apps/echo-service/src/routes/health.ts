import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'echo-service',
      version: '1.0.0'
    };
  });
}
