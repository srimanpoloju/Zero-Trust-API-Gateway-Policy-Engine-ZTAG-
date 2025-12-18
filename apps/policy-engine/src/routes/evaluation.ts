import { FastifyInstance } from 'fastify';
import { PolicyService } from '../services/PolicyService';
import { DecisionRequestSchema, DecisionResponseSchema } from '@ztag/shared';
import { logger as globalLogger } from '../utils/logger';

export async function evaluationRoutes(fastify: FastifyInstance) {
  const logger = globalLogger.child({ route: 'evaluation' });

  fastify.post('/evaluate', {
    schema: {
      description: 'Evaluate a request against the policy set.',
      tags: ['Evaluation'],
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

      logger.info({
        requestId: request.body.context.requestId,
        decision: decision.decision,
        policyId: decision.policyId,
        latency
      }, 'Policy evaluation completed');
      
      return reply.send(decision);

    } catch (error) {
      logger.error({ err: error }, 'Policy evaluation failed');
      return reply.status(500).send({
        decision: 'DENY' as const,
        reason: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  fastify.post('/simulate', {
    schema: {
      description: 'Simulate a policy evaluation without enforcing the decision.',
      tags: ['Evaluation'],
      body: DecisionRequestSchema,
      response: {
        200: DecisionResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      // Simulation endpoint for testing policies from the control plane
      const decision = await PolicyService.evaluate(request.body);
      logger.info({ requestId: request.body.context.requestId }, 'Policy simulation completed');
      
      // The response must conform to DecisionResponseSchema
      return reply.send(decision);

    } catch (error) {
      logger.error({ err: error },'Policy simulation failed');
      return reply.status(500).send({
        decision: 'DENY' as const,
        reason: `Simulation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });
}
