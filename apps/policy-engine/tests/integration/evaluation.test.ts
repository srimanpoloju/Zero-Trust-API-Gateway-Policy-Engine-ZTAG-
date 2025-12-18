import Fastify from 'fastify';
import { evaluationRoutes } from '../../src/routes/evaluation';
import { PolicyService } from '../../src/services/PolicyService';
import { DecisionRequest, DecisionResponse } from '@ztag/shared';

// Mock the PolicyService
jest.mock('../../src/services/PolicyService');
const mockPolicyService = PolicyService as jest.Mocked<typeof PolicyService>;

describe('Policy Engine - Evaluation API Integration Tests', () => {
  let fastify: FastifyInstance;
  const mockToken = 'mock-jwt-token'; // Token won't be validated here, just passed along

  beforeEach(async () => {
    fastify = Fastify({ logger: false }); // Disable logger for tests
    await fastify.register(evaluationRoutes);
    mockPolicyService.evaluate.mockReset();
  });

  afterEach(async () => {
    await fastify.close();
  });

  const mockDecisionRequest: DecisionRequest = {
    subject: {
      sub: 'user123',
      email: 'user@example.com',
      role: 'user',
      exp: 1234567890,
      iat: 1234567890,
    },
    resource: {
      service: 'echo-service',
      path: '/echo/hello',
      method: 'GET',
    },
    context: {
      ip: '127.0.0.1',
      userAgent: 'jest-test',
      timestamp: new Date().toISOString(),
      requestId: 'test-req-id',
    },
  };

  describe('POST /evaluate', () => {
    it('should return ALLOW decision from PolicyService', async () => {
      const mockDecisionResponse: DecisionResponse = {
        decision: 'ALLOW',
        reason: 'Policy matched',
        policyId: 'policy-1',
        obligations: { logLevel: 'debug' },
      };
      mockPolicyService.evaluate.mockResolvedValueOnce(mockDecisionResponse);

      const response = await fastify.inject({
        method: 'POST',
        url: '/evaluate',
        headers: { authorization: `Bearer ${mockToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify(mockDecisionRequest),
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockDecisionResponse);
      expect(mockPolicyService.evaluate).toHaveBeenCalledWith(mockDecisionRequest);
    });

    it('should return DENY decision from PolicyService', async () => {
      const mockDecisionResponse: DecisionResponse = {
        decision: 'DENY',
        reason: 'No policy matched',
        obligations: {},
      };
      mockPolicyService.evaluate.mockResolvedValueOnce(mockDecisionResponse);

      const response = await fastify.inject({
        method: 'POST',
        url: '/evaluate',
        headers: { authorization: `Bearer ${mockToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify(mockDecisionRequest),
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockDecisionResponse);
    });

    it('should return 500 if PolicyService throws an error', async () => {
      mockPolicyService.evaluate.mockRejectedValueOnce(new Error('Internal evaluation error'));

      const response = await fastify.inject({
        method: 'POST',
        url: '/evaluate',
        headers: { authorization: `Bearer ${mockToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify(mockDecisionRequest),
      });

      expect(response.statusCode).toBe(500);
      const payload = JSON.parse(response.payload);
      expect(payload.decision).toBe('DENY');
      expect(payload.reason).toContain('Evaluation error');
    });
  });

  describe('POST /simulate', () => {
    it('should return simulation decision from PolicyService', async () => {
      const mockSimulationResponse: DecisionResponse = {
        decision: 'ALLOW',
        reason: 'Simulation successful',
        policyId: 'policy-simulated',
        obligations: { logLevel: 'debug' },
      };
      mockPolicyService.evaluate.mockResolvedValueOnce(mockSimulationResponse);

      const response = await fastify.inject({
        method: 'POST',
        url: '/simulate',
        headers: { authorization: `Bearer ${mockToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify(mockDecisionRequest),
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockSimulationResponse);
      expect(mockPolicyService.evaluate).toHaveBeenCalledWith(mockDecisionRequest);
    });
  });
});
