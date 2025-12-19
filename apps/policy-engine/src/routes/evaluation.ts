import type { FastifyInstance, FastifyRequest } from "fastify";
import { PolicyService } from "../services/PolicyService";
import type { DecisionRequest, DecisionResponse } from "@ztag/shared";
import { logger as globalLogger } from "../utils/logger";

export async function evaluationRoutes(fastify: FastifyInstance) {
  const logger = globalLogger.child({ route: "evaluation" });

  // NOTE:
  // index.ts registers this plugin with prefix "/evaluate"
  // so POST "/" here becomes POST "/evaluate"
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: DecisionRequest }>, reply) => {
      try {
        const start = Date.now();

        const decision: DecisionResponse = await PolicyService.evaluate(request.body);

        logger.info(
          {
            requestId: request.body?.context?.requestId,
            decision: decision.decision,
            policyId: decision.policyId,
            latencyMs: Date.now() - start,
          },
          "Policy evaluation completed"
        );

        return reply.send(decision);
      } catch (error) {
        logger.error({ err: error }, "Policy evaluation failed");
        return reply.status(500).send({
          decision: "DENY",
          reason: `Evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`,
          obligations: {},
        });
      }
    }
  );

  // With prefix "/evaluate", this becomes POST "/evaluate/simulate"
  fastify.post(
    "/simulate",
    async (request: FastifyRequest<{ Body: DecisionRequest }>, reply) => {
      try {
        const decision: DecisionResponse = await PolicyService.evaluate(request.body);
        logger.info({ requestId: request.body?.context?.requestId }, "Policy simulation completed");
        return reply.send(decision);
      } catch (error) {
        logger.error({ err: error }, "Policy simulation failed");
        return reply.status(500).send({
          decision: "DENY",
          reason: `Simulation error: ${error instanceof Error ? error.message : "Unknown error"}`,
          obligations: {},
        });
      }
    }
  );
}
