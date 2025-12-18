import Fastify from 'fastify';
import { echoRoutes } from '../../src/routes/echo';

describe('Echo Service Routes', () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    fastify = Fastify();
    fastify.register(echoRoutes, { prefix: '/echo' });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should respond to GET /echo with request details', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/echo/test-path?query=param',
      headers: {
        'x-test-header': 'test-value',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('message', 'Echo service response');
    expect(body.request.method).toBe('GET');
    expect(body.request.url).toBe('/echo/test-path?query=param');
    expect(body.request.headers['x-test-header']).toBe('test-value');
    expect(body.request.query).toEqual({ query: 'param' });
  });

  it('should respond to POST /echo with request details and body', async () => {
    const testBody = { data: 'hello' };
    const response = await fastify.inject({
      method: 'POST',
      url: '/echo',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify(testBody),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.request.method).toBe('POST');
    expect(body.request.body).toEqual(testBody);
  });

  it('should respond to other methods on /echo/* with request details', async () => {
    const response = await fastify.inject({
      method: 'PUT',
      url: '/echo/another-path',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.request.method).toBe('PUT');
    expect(body.request.url).toBe('/echo/another-path');
  });
});
