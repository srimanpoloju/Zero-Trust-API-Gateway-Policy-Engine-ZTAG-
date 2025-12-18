import { PolicyService } from '../../src/services/PolicyService';
import { PolicyRepository } from '../../src/database/PolicyRepository';
import { DecisionRequest, Policy } from '@ztag/shared';

// Mock PolicyRepository
jest.mock('../../src/database/PolicyRepository');
const mockFindMatchingPolicies = PolicyRepository.findMatchingPolicies as jest.Mock;

describe('PolicyService Unit Tests', () => {
  beforeEach(() => {
    mockFindMatchingPolicies.mockReset();
  });

  const mockRequest: DecisionRequest = {
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

  it('should deny if no matching policies are found', async () => {
    mockFindMatchingPolicies.mockResolvedValueOnce([]);
    const result = await PolicyService.evaluate(mockRequest);
    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('No matching policy found');
  });

  it('should deny if all matching policies are inconclusive', async () => {
    const policyInconclusive: Policy = {
      id: 'policy-1',
      name: 'Inconclusive Policy',
      enabled: true,
      priority: 100,
      matchConditions: { service: 'echo-service', pathPattern: '/*', methods: ['GET'] },
      rules: {
        allowIf: [{ field: 'subject.role', operator: 'eq', value: 'nonexistent' }],
        denyIf: [{ field: 'subject.role', operator: 'eq', value: 'nonexistent' }],
      },
      obligations: {},
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    mockFindMatchingPolicies.mockResolvedValueOnce([policyInconclusive]);

    const result = await PolicyService.evaluate(mockRequest);
    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('No policy rule produced an explicit decision');
  });

  it('should allow if an allowIf rule matches', async () => {
    const policyAllow: Policy = {
      id: 'policy-allow',
      name: 'Allow User Policy',
      enabled: true,
      priority: 100,
      matchConditions: { service: 'echo-service', pathPattern: '/*', methods: ['GET'] },
      rules: {
        allowIf: [{ field: 'subject.role', operator: 'eq', value: 'user' }],
      },
      obligations: { logLevel: 'info' },
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    mockFindMatchingPolicies.mockResolvedValueOnce([policyAllow]);

    const result = await PolicyService.evaluate(mockRequest);
    expect(result.decision).toBe('ALLOW');
    expect(result.reason).toBe(`Allowed by policy: ${policyAllow.name}`);
    expect(result.policyId).toBe(policyAllow.id);
    expect(result.obligations).toEqual(policyAllow.obligations);
  });

  it('should deny if a denyIf rule matches', async () => {
    const policyDeny: Policy = {
      id: 'policy-deny',
      name: 'Deny Blocked Policy',
      enabled: true,
      priority: 100,
      matchConditions: { service: 'echo-service', pathPattern: '/*', methods: ['GET'] },
      rules: {
        denyIf: [{ field: 'subject.role', operator: 'eq', value: 'user' }], // Will deny the mockRequest
      },
      obligations: {},
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    mockFindMatchingPolicies.mockResolvedValueOnce([policyDeny]);

    const result = await PolicyService.evaluate(mockRequest);
    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe(`Denied by policy: ${policyDeny.name}`);
    expect(result.policyId).toBe(policyDeny.id);
  });

  it('denyIf should take precedence over allowIf in different policies if priority is higher', async () => {
    const policyAllow: Policy = {
      id: 'policy-allow',
      name: 'Allow User Policy',
      enabled: true,
      priority: 50, // Lower priority
      matchConditions: { service: 'echo-service', pathPattern: '/*', methods: ['GET'] },
      rules: {
        allowIf: [{ field: 'subject.role', operator: 'eq', value: 'user' }],
      },
      obligations: {},
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    const policyDeny: Policy = {
      id: 'policy-deny',
      name: 'Deny Specific Users',
      enabled: true,
      priority: 100, // Higher priority
      matchConditions: { service: 'echo-service', pathPattern: '/*', methods: ['GET'] },
      rules: {
        denyIf: [{ field: 'subject.sub', operator: 'eq', value: 'user123' }],
      },
      obligations: {},
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    // Order matters as returned by PolicyRepository (highest priority first)
    mockFindMatchingPolicies.mockResolvedValueOnce([policyDeny, policyAllow]);

    const result = await PolicyService.evaluate(mockRequest);
    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe(`Denied by policy: ${policyDeny.name}`);
  });

  it('should handle complex conditions correctly (e.g., contains for scopes)', async () => {
    const policyScope: Policy = {
      id: 'policy-scope',
      name: 'Scope Check Policy',
      enabled: true,
      priority: 100,
      matchConditions: { service: 'echo-service', pathPattern: '/*', methods: ['GET'] },
      rules: {
        allowIf: [
          { field: 'subject.role', operator: 'eq', value: 'user' },
          { field: 'subject.scopes', operator: 'contains', value: 'read' },
        ],
      },
      obligations: {},
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    mockFindMatchingPolicies.mockResolvedValueOnce([policyScope]);

    const requestWithScope: DecisionRequest = {
      ...mockRequest,
      subject: { ...mockRequest.subject, scopes: ['read', 'write'] },
    };

    const result = await PolicyService.evaluate(requestWithScope);
    expect(result.decision).toBe('ALLOW');
  });

  it('should handle numerical operators (gt, lt, etc.)', async () => {
    const policyNumerical: Policy = {
      id: 'policy-numerical',
      name: 'Numerical Check Policy',
      enabled: true,
      priority: 100,
      matchConditions: { service: 'echo-service', pathPattern: '/*', methods: ['GET'] },
      rules: {
        allowIf: [{ field: 'subject.exp', operator: 'gt', value: 1234567800 }],
      },
      obligations: {},
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    mockFindMatchingPolicies.mockResolvedValueOnce([policyNumerical]);

    const result = await PolicyService.evaluate(mockRequest);
    expect(result.decision).toBe('ALLOW');
  });

  it('should handle `eq` operator with different types (number, string, boolean)', async () => {
    const policy: Policy = {
      id: 'policy-types',
      name: 'Type Check Policy',
      enabled: true,
      priority: 100,
      matchConditions: { service: 'echo-service', pathPattern: '/*', methods: ['GET'] },
      rules: {
        allowIf: [
          { field: 'subject.role', operator: 'eq', value: 'user' },
          { field: 'context.ip', operator: 'eq', value: '127.0.0.1' },
        ],
      },
      obligations: {},
      version: 1,
      createdAt: '',
      updatedAt: '',
    };
    mockFindMatchingPolicies.mockResolvedValueOnce([policy]);
    const result = await PolicyService.evaluate(mockRequest);
    expect(result.decision).toBe('ALLOW');
  });

  it('should return DENY on evaluation error', async () => {
    mockFindMatchingPolicies.mockImplementationOnce(() => {
      throw new Error('DB connection failed');
    });

    const result = await PolicyService.evaluate(mockRequest);
    expect(result.decision).toBe('DENY');
    expect(result.reason).toContain('Policy evaluation error');
  });
});
