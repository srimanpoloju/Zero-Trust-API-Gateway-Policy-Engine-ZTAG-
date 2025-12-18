import Fastify from 'fastify';
import { healthRoutes } from '../../src/routes/health';

describe('Health Routes', () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    fastify = Fastify();
    fastify.register(healthRoutes, { prefix: '/health' });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should return a healthy status', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('status', 'healthy');
    expect(body).toHaveProperty('service', 'echo-service');
    expect(body).toHaveProperty('version', '1.0.0');
    expect(body).toHaveProperty('timestamp');
  });
});
