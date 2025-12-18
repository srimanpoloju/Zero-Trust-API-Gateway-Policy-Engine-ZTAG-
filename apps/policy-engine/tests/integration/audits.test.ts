import Fastify from 'fastify';
import { auditRoutes } from '../../src/routes/audit';
import { AuditRepository } from '../../src/database/AuditRepository';
import { AuditLog } from '@ztag/shared';

// Mock the AuditRepository
jest.mock('../../src/database/AuditRepository');
const mockAuditRepository = AuditRepository as jest.Mocked<typeof AuditRepository>;

describe('Policy Engine - Audits API Integration Tests', () => {
  let fastify: FastifyInstance;
  const mockToken = 'mock-jwt-token';

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(auditRoutes, { prefix: '/audits' });
    mockAuditRepository.findAll.mockReset();
  });

  afterEach(async () => {
    await fastify.close();
  });

  const sampleAuditLog: AuditLog = {
    id: 'audit-1',
    requestId: 'req-1',
    timestamp: new Date().toISOString(),
    subject: { sub: 'user1', role: 'user' },
    resource: { service: 'echo', path: '/echo/hello', method: 'GET' },
    decision: 'ALLOW',
    reason: 'Matched policy "Allow User"',
    policyId: 'policy-1',
    latencyMs: 50,
    statusCode: 200,
    context: { ip: '127.0.0.1' },
  };

  describe('GET /audits', () => {
    it('should return paginated audit logs', async () => {
      mockAuditRepository.findAll.mockResolvedValueOnce({
        logs: [sampleAuditLog],
        total: 1,
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/audits?page=1&limit=10',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data).toEqual([sampleAuditLog]);
      expect(payload.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockAuditRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should apply filters correctly', async () => {
      mockAuditRepository.findAll.mockResolvedValueOnce({
        logs: [sampleAuditLog],
        total: 1,
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/audits?decision=ALLOW&service=echo&path=/echo/hello&subjectSub=user1',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockAuditRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20, // Default limit
        decision: 'ALLOW',
        service: 'echo',
        path: '/echo/hello',
        subjectSub: 'user1',
      });
    });

    it('should return 500 if AuditRepository throws an error', async () => {
      mockAuditRepository.findAll.mockRejectedValueOnce(new Error('DB error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/audits',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.payload)).toEqual({ message: 'Internal Server Error' });
    });
  });
});
