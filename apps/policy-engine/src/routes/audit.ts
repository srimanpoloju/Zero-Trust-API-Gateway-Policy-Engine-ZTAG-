import { FastifyInstance } from 'fastify';
import { AuditRepository } from '../database/AuditRepository';
import { logger as globalLogger } from '../utils/logger';
import { z } from 'zod';

export async function auditRoutes(fastify: FastifyInstance) {
  const logger = globalLogger.child({ route: 'audits' });

  const GetAuditsQuerySchema = z.object({
    page: z.preprocess(Number, z.number().int().min(1).default(1)),
    limit: z.preprocess(Number, z.number().int().min(1).max(100).default(20)),
    decision: z.enum(['ALLOW', 'DENY']).optional(),
    service: z.string().optional(),
    path: z.string().optional(),
    subjectSub: z.string().optional(),
  });

  fastify.get('/', {
    schema: {
      querystring: GetAuditsQuerySchema,
    }
  }, async (request, reply) => {
    try {
      const query = request.query as z.infer<typeof GetAuditsQuerySchema>;
      const { logs, total } = await AuditRepository.findAll(query);
      
      return reply.send({
        data: logs,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch audit logs');
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}