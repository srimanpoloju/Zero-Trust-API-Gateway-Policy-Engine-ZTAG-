import Fastify from 'fastify';
import { healthRoutes } from '../../src/routes/health';
import { db } from '../../src/database/index';

// Mock the database module
jest.mock('../../src/database/index', () => ({
  db: {
    query: jest.fn(),
  },
}));

describe('Policy Engine - Health API Integration Tests', () => {
  let fastify: FastifyInstance;
  const mockDbQuery = db.query as jest.Mock;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(healthRoutes);
    mockDbQuery.mockReset();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should return 200 with status "ok" if database is connected', async () => {
    mockDbQuery.mockResolvedValueOnce({}); // Simulate successful DB query

    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.status).toBe('ok');
    expect(payload).toHaveProperty('timestamp');
  });

  it('should return 500 with status "error" if database connection fails', async () => {
    mockDbQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(500);
    const payload = JSON.parse(response.payload);
    expect(payload.status).toBe('error');
    expect(payload.reason).toContain('Database connection failed');
  });
});
