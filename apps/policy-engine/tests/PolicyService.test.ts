import { PolicyService } from '../src/services/PolicyService';
import type { DecisionRequest, DecisionResponse } from '../packages/shared/src/types';

describe('PolicyService', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluate', () => {
    it('should return ALLOW decision for valid request', async () => {
      const mockResponse: DecisionResponse = {
        decision: 'ALLOW',
        reason: 'Access granted',
        obligations: {},
        policyId: 'policy-123'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: DecisionRequest = {
        subject: {
          sub: 'user-123',
          email: 'user@example.com',
          role: 'user',
          tenant: 'demo',
          scopes: ['read'],
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        resource: {
          service: 'echo-service',
          path: '/test',
          method: 'GET'
        },
        context: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date().toISOString(),
          requestId: 'req-123',
          tenant: 'demo'
        }
      };

      const result = await PolicyService.evaluate(request);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('http://localhost:3002/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
    });

    it('should return DENY decision when policy engine fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const request: DecisionRequest = {
        subject: {
          sub: 'user-123',
          email: 'user@example.com',
          role: 'user',
          tenant: 'demo',
          scopes: ['read'],
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        resource: {
          service: 'echo-service',
          path: '/test',
          method: 'GET'
        },
        context: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date().toISOString(),
          requestId: 'req-123',
          tenant: 'demo'
        }
      };

      const result = await PolicyService.evaluate(request);

      expect(result.decision).toBe('DENY');
      expect(result.reason).toContain('Policy evaluation failed');
    });
  });
});
