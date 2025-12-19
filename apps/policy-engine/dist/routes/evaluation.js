import { PolicyService } from '../services/PolicyService';
import { DecisionRequestSchema, DecisionResponseSchema } from '@ztag/shared';
import { logger as globalLogger } from '../utils/logger';
export async function evaluationRoutes(fastify) {
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
            const body = request.body;
            const startTime = Date.now();
            const decision = await PolicyService.evaluate(body);
            const latency = Date.now() - startTime;
            logger.info({
                requestId: body?.context?.requestId,
                decision: decision.decision,
                policyId: decision.policyId,
                latency
            }, 'Policy evaluation completed');
            return reply.send(decision);
        }
        catch (error) {
            logger.error({ err: error }, 'Policy evaluation failed');
            return reply.status(500).send({
                decision: 'DENY',
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
            const body = request.body;
            const decision = await PolicyService.evaluate(body);
            logger.info({ requestId: body?.context?.requestId }, 'Policy simulation completed');
            return reply.send(decision);
        }
        catch (error) {
            logger.error({ err: error }, 'Policy simulation failed');
            return reply.status(500).send({
                decision: 'DENY',
                reason: `Simulation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    });
}
//# sourceMappingURL=evaluation.js.map