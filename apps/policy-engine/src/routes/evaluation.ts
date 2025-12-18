import { FastifyInstance } from 'fastify';
import { PolicyService } from '../services/PolicyService';
import { DecisionRequestSchema, DecisionResponseSchema } from '@ztag/shared';
import { Logger } from '../utils/logger';

export async function evaluationRoutes(fastify: FastifyInstance) {
  const logger = new Logger('evaluation');

  fastify.post('/', {
    schema: {
      body: DecisionRequestSchema,
      response: {
        200: DecisionResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const startTime = Date.now();
      
      const decision = await PolicyService.evaluate(request.body);
      
      const latency = Date.now() - startTime;
      
      logger.info('Policy evaluation completed', {
        requestId: request.body.context.requestId,
        decision: decision.decision,
        policyId: decision.policyId,
        latency
      });

      return decision;
    } catch (error) {
      logger.error('Policy evaluation failed', error);
      reply.status(500);
      return {
        decision: 'DENY' as const,
        reason: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        obligations: {}
      };
    }
  });

  fastify.post('/simulate', {
    schema: {
      body: DecisionRequestSchema,
      response: {
        200: DecisionResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      // Simulation endpoint for testing policies without actual enforcement
      const decision = await PolicyService.evaluate(request.body);
      
      return {
        ...decision,
        simulated: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Policy simulation failed', error);
      reply.status(500);
      return {
        decision: 'DENY' as const,
        reason: `Simulation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        obligations: {}
      };
    }
  });
}
