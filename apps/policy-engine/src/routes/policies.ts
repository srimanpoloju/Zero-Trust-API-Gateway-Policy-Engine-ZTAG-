import { FastifyInstance } from 'fastify';
import { PolicyRepository } from '../database/PolicyRepository';
import { PolicySchema } from '@ztag/shared';
import { logger as globalLogger } from '../utils/logger';

export async function policyRoutes(fastify: FastifyInstance) {
  const logger = globalLogger.child({ route: 'policies' });

  // Get all policies
  fastify.get('/', async (request, reply) => {
    try {
      const policies = await PolicyRepository.findAll();
      return reply.send(policies);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch policies');
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Get a single policy by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const policy = await PolicyRepository.findById(id);
      if (!policy) {
        return reply.status(404).send({ message: 'Policy not found' });
      }
      return reply.send(policy);
    } catch (error) {
      logger.error({ err: error, policyId: id }, 'Failed to fetch policy');
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Create a new policy
  fastify.post('/', {
    schema: {
      body: PolicySchema.omit({ id: true, createdAt: true, updatedAt: true }),
    },
  }, async (request, reply) => {
    try {
      const newPolicy = await PolicyRepository.create(request.body as any);
      return reply.status(201).send(newPolicy);
    } catch (error) {
      logger.error({ err: error, body: request.body }, 'Failed to create policy');
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Update a policy
  fastify.put('/:id', {
    schema: {
      body: PolicySchema.partial().omit({ id: true, createdAt: true, updatedAt: true }),
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const updatedPolicy = await PolicyRepository.update(id, request.body as any);
      if (!updatedPolicy) {
        return reply.status(404).send({ message: 'Policy not found' });
      }
      return reply.send(updatedPolicy);
    } catch (error) {
      logger.error({ err: error, policyId: id, body: request.body }, 'Failed to update policy');
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Delete a policy
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const success = await PolicyRepository.delete(id);
      if (!success) {
        return reply.status(404).send({ message: 'Policy not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      logger.error({ err: error, policyId: id }, 'Failed to delete policy');
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}