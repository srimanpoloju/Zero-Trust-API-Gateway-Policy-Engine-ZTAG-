import { PolicyRepository } from '../../src/database/PolicyRepository';
import { db } from '../../src/database/index';
import type { Policy } from '@ztag/shared';

// Mock the database module
jest.mock('../../src/database/index', () => ({
  db: {
    query: jest.fn(),
  },
}));

describe('PolicyRepository Unit Tests', () => {
  const mockDbQuery = db.query as jest.Mock;

  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  const mockPolicy: Policy = {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    name: 'Test Policy',
    enabled: true,
    priority: 100,
    matchConditions: {
      service: 'test-service',
      pathPattern: '/test/*',
      methods: ['GET'],
      tenant: 'test-tenant',
    },
    rules: {
      allowIf: [{ field: 'subject.role', operator: 'eq', value: 'admin' }],
      denyIf: [],
    },
    obligations: {},
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dbRowFromPolicy = (policy: Policy) => ({
    ...policy,
    match_conditions: JSON.stringify(policy.matchConditions),
    rules: JSON.stringify(policy.rules),
    obligations: JSON.stringify(policy.obligations),
    created_at: policy.createdAt,
    updated_at: policy.updatedAt,
  });

  describe('create', () => {
    it('should create a new policy', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [dbRowFromPolicy(mockPolicy)] });
      const newPolicy = await PolicyRepository.create(mockPolicy);
      expect(mockDbQuery).toHaveBeenCalledWith(expect.any(String), [
        mockPolicy.name,
        mockPolicy.enabled,
        mockPolicy.priority,
        JSON.stringify(mockPolicy.matchConditions),
        JSON.stringify(mockPolicy.rules),
        JSON.stringify(mockPolicy.obligations),
        1,
      ]);
      expect(newPolicy).toEqual(mockPolicy);
    });
  });

  describe('findAll', () => {
    it('should return all policies', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [dbRowFromPolicy(mockPolicy)] });
      const policies = await PolicyRepository.findAll();
      expect(mockDbQuery).toHaveBeenCalledWith('SELECT * FROM policies ORDER BY priority DESC, name ASC');
      expect(policies).toEqual([mockPolicy]);
    });
  });

  describe('findById', () => {
    it('should return a policy by ID', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [dbRowFromPolicy(mockPolicy)] });
      const policy = await PolicyRepository.findById(mockPolicy.id);
      expect(mockDbQuery).toHaveBeenCalledWith('SELECT * FROM policies WHERE id = $1', [mockPolicy.id]);
      expect(policy).toEqual(mockPolicy);
    });

    it('should return null if policy not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      const policy = await PolicyRepository.findById('non-existent-id');
      expect(policy).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an existing policy', async () => {
      const updates = { name: 'Updated Policy Name', enabled: false };
      const updatedPolicy = { ...mockPolicy, ...updates };
      mockDbQuery.mockResolvedValueOnce({ rows: [dbRowFromPolicy(updatedPolicy)] });

      const result = await PolicyRepository.update(mockPolicy.id, updates);
      expect(mockDbQuery).toHaveBeenCalledWith(expect.any(String), [
        updates.name,
        updates.enabled,
        undefined, // priority
        null,      // matchConditions
        null,      // rules
        null,      // obligations
        undefined, // version
        mockPolicy.id
      ]);
      expect(result).toEqual(updatedPolicy);
    });
  });

  describe('delete', () => {
    it('should delete a policy', async () => {
      mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });
      const success = await PolicyRepository.delete(mockPolicy.id);
      expect(mockDbQuery).toHaveBeenCalledWith('DELETE FROM policies WHERE id = $1', [mockPolicy.id]);
      expect(success).toBe(true);
    });

    it('should return false if policy not found for deletion', async () => {
      mockDbQuery.mockResolvedValueOnce({ rowCount: 0 });
      const success = await PolicyRepository.delete('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('findMatchingPolicies', () => {
    it('should return policies matching service, path, method, and tenant', async () => {
      const candidatePolicy: Policy = {
        ...mockPolicy,
        matchConditions: {
          service: 'test-service',
          pathPattern: '/test/path',
          methods: ['GET'],
          tenant: 'test-tenant',
        },
      };
      mockDbQuery.mockResolvedValueOnce({ rows: [dbRowFromPolicy(candidatePolicy)] });

      const policies = await PolicyRepository.findMatchingPolicies(
        'test-service',
        '/test/path',
        'GET',
        'test-tenant'
      );
      expect(policies).toEqual([candidatePolicy]);
    });

    it('should handle wildcard service match', async () => {
      const wildcardPolicy: Policy = {
        ...mockPolicy,
        id: 'wildcard-id',
        matchConditions: {
          service: '*',
          pathPattern: '/any/path',
          methods: ['GET'],
          tenant: undefined,
        },
      };
      mockDbQuery.mockResolvedValueOnce({ rows: [dbRowFromPolicy(wildcardPolicy)] });

      const policies = await PolicyRepository.findMatchingPolicies(
        'some-service',
        '/any/path',
        'GET'
      );
      expect(policies).toEqual([wildcardPolicy]);
    });

    it('should handle wildcard method match', async () => {
      const wildcardMethodPolicy: Policy = {
        ...mockPolicy,
        id: 'wildcard-method-id',
        matchConditions: {
          service: 'another-service',
          pathPattern: '/another/path',
          methods: ['*'],
          tenant: undefined,
        },
      };
      mockDbQuery.mockResolvedValueOnce({ rows: [dbRowFromPolicy(wildcardMethodPolicy)] });

      const policies = await PolicyRepository.findMatchingPolicies(
        'another-service',
        '/another/path',
        'POST' // Should match due to wildcard method
      );
      expect(policies).toEqual([wildcardMethodPolicy]);
    });

    it('should filter out policies that do not match path pattern in-memory', async () => {
      const candidatePolicy: Policy = {
        ...mockPolicy,
        id: 'no-match-path',
        matchConditions: {
          service: 'test-service',
          pathPattern: '/wrong/path',
          methods: ['GET'],
          tenant: 'test-tenant',
        },
      };
      mockDbQuery.mockResolvedValueOnce({ rows: [dbRowFromPolicy(candidatePolicy)] });

      const policies = await PolicyRepository.findMatchingPolicies(
        'test-service',
        '/test/path',
        'GET',
        'test-tenant'
      );
      expect(policies).toEqual([]); // Should be filtered out
    });
  });
});
