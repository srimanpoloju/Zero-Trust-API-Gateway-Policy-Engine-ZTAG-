import Fastify from 'fastify';
import { policyRoutes } from '../../src/routes/policies';
import { PolicyRepository } from '../../src/database/PolicyRepository';
import { Policy } from '@ztag/shared';

// Mock the PolicyRepository
jest.mock('../../src/database/PolicyRepository');
const mockPolicyRepository = PolicyRepository as jest.Mocked<typeof PolicyRepository>;

describe('Policy Engine - Policies API Integration Tests', () => {
  let fastify: FastifyInstance;
  const mockToken = 'mock-jwt-token'; // Token won't be validated here, just passed along

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(policyRoutes, { prefix: '/policies' });
    mockPolicyRepository.findAll.mockReset();
    mockPolicyRepository.findById.mockReset();
    mockPolicyRepository.create.mockReset();
    mockPolicyRepository.update.mockReset();
    mockPolicyRepository.delete.mockReset();
  });

  afterEach(async () => {
    await fastify.close();
  });

  const samplePolicy: Policy = {
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
    },
    obligations: {},
    version: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  describe('GET /policies', () => {
    it('should return all policies', async () => {
      mockPolicyRepository.findAll.mockResolvedValueOnce([samplePolicy]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/policies',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual([samplePolicy]);
      expect(mockPolicyRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no policies', async () => {
      mockPolicyRepository.findAll.mockResolvedValueOnce([]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/policies',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual([]);
    });
  });

  describe('GET /policies/:id', () => {
    it('should return a policy by ID', async () => {
      mockPolicyRepository.findById.mockResolvedValueOnce(samplePolicy);

      const response = await fastify.inject({
        method: 'GET',
        url: `/policies/${samplePolicy.id}`,
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(samplePolicy);
      expect(mockPolicyRepository.findById).toHaveBeenCalledWith(samplePolicy.id);
    });

    it('should return 404 if policy not found', async () => {
      mockPolicyRepository.findById.mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/policies/non-existent-id',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toEqual({ message: 'Policy not found' });
    });
  });

  describe('POST /policies', () => {
    it('should create a new policy', async () => {
      const newPolicyData = {
        name: 'New Policy',
        enabled: true,
        priority: 50,
        matchConditions: { service: 'new-service', pathPattern: '/*', methods: ['POST'] },
        rules: { allowIf: [] },
        obligations: {},
      };
      const createdPolicy = { ...samplePolicy, id: 'new-id', ...newPolicyData };
      mockPolicyRepository.create.mockResolvedValueOnce(createdPolicy);

      const response = await fastify.inject({
        method: 'POST',
        url: '/policies',
        headers: { authorization: `Bearer ${mockToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify(newPolicyData),
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual(createdPolicy);
      expect(mockPolicyRepository.create).toHaveBeenCalledWith(newPolicyData);
    });

    it('should return 500 if creation fails', async () => {
      mockPolicyRepository.create.mockRejectedValueOnce(new Error('DB error'));

      const response = await fastify.inject({
        method: 'POST',
        url: '/policies',
        headers: { authorization: `Bearer ${mockToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify({
          name: 'New Policy',
          enabled: true,
          priority: 50,
          matchConditions: { service: 'new-service', pathPattern: '/*', methods: ['POST'] },
          rules: { allowIf: [] },
          obligations: {},
        }),
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.payload)).toEqual({ message: 'Internal Server Error' });
    });
  });

  describe('PUT /policies/:id', () => {
    it('should update an existing policy', async () => {
      const updates = { name: 'Updated Policy', enabled: false };
      const updatedPolicy = { ...samplePolicy, ...updates };
      mockPolicyRepository.update.mockResolvedValueOnce(updatedPolicy);

      const response = await fastify.inject({
        method: 'PUT',
        url: `/policies/${samplePolicy.id}`,
        headers: { authorization: `Bearer ${mockToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify(updates),
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(updatedPolicy);
      expect(mockPolicyRepository.update).toHaveBeenCalledWith(samplePolicy.id, updates);
    });

    it('should return 404 if policy not found for update', async () => {
      mockPolicyRepository.update.mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/policies/non-existent-id',
        headers: { authorization: `Bearer ${mockToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify({ name: 'Update' }),
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toEqual({ message: 'Policy not found' });
    });
  });

  describe('DELETE /policies/:id', () => {
    it('should delete a policy', async () => {
      mockPolicyRepository.delete.mockResolvedValueOnce(true);

      const response = await fastify.inject({
        method: 'DELETE',
        url: `/policies/${samplePolicy.id}`,
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(204);
      expect(response.payload).toBe('');
      expect(mockPolicyRepository.delete).toHaveBeenCalledWith(samplePolicy.id);
    });

    it('should return 404 if policy not found for deletion', async () => {
      mockPolicyRepository.delete.mockResolvedValueOnce(false);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/policies/non-existent-id',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toEqual({ message: 'Policy not found' });
    });
  });
});
