import { FastifyInstance } from 'fastify';
import { AuditRepository } from '../database/AuditRepository';
import { logger as globalLogger } from '../utils/logger';

export async function auditRoutes(fastify: FastifyInstance) {
  const logger = globalLogger.child({ route: 'audits' });

  // GET /audits  (list audits)
  // NOTE: Do NOT attach Zod schemas to Fastify `schema` here.
  // Fastify expects JSON Schema; Zod objects will crash schema build.
  fastify.get('/', async (request, reply) => {
    try {
      const audits = await AuditRepository.findAll();
      return reply.send(audits);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch audits');
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // GET /audits/:id (single audit)
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const audit = await AuditRepository.findById(id);
      if (!audit) {
        return reply.status(404).send({ message: 'Audit not found' });
      }
      return reply.send(audit);
    } catch (error) {
      logger.error({ err: error, auditId: id }, 'Failed to fetch audit');
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}
