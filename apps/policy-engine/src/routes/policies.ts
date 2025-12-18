import { FastifyInstance } from 'fastify';
import { PolicyRepository } from '../database/PolicyRepository';
import { PolicySchema } from '@ztag/shared';
import { Logger } from '../utils/logger';

export async function policyRoutes(fastify: FastifyInstance) {
  const logger = new Logger('policies');

  // Get all policies
  fastify.get('/', async (request, reply) => {
    try {
      const policies = await PolicyRepository.findAll();
      return { policies };
    } catch (error) {
      logger.error('Failed to fetch policies', error);
      reply.status(500);
      return { error: 'Failed to fetch policies' };
    }
  });

  // Get policy by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const policy = await PolicyRepository.findById(id);
      
      if (!policy) {
        reply.status(404);
        return { error: 'Policy not found' };
      }
      
      return { policy };
    } catch (error) {
      logger.error('Failed to fetch policy', error);
      reply.status(500);
      return { error: 'Failed to fetch policy' };
    }
  });

  // Create new policy
  fastify.post('/', async (request, reply) => {
    try {
      const policyData = PolicySchema.parse(request.body);
      const policy = await PolicyRepository.create({
        ...policyData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      logger.info('Policy created', { policyId: policy.id, name: policy.name });
      reply.status(201);
      return { policy };
    } catch (error) {
      logger.error('Failed to create policy', error);
      reply.status(400);
      return { error: 'Invalid policy data' };
    }
  });

  // Update policy
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updates = PolicySchema.partial().parse(request.body);
      const policy = await PolicyRepository.update(id, updates);
      
      if (!policy) {
        reply.status(404);
        return { error: 'Policy not found' };
      }
      
      logger.info('Policy updated', { policyId: policy.id });
      return { policy };
    } catch (error) {
      logger.error('Failed to update policy', error);
      reply.status(400);
      return { error: 'Invalid policy data' };
    }
  });

  // Delete policy
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const deleted = await PolicyRepository.delete(id);
      
      if (!deleted) {
        reply.status(404);
        return { error: 'Policy not found' };
      }
      
      logger.info('Policy deleted', { policyId: id });
      reply.status(204);
    } catch (error) {
      logger.error('Failed to delete policy', error);
      reply.status(500);
      return { error: 'Failed to delete policy' };
    }
  });
}
