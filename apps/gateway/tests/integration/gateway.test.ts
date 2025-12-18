import Fastify from 'fastify';
import { gatewayRoutes } from '../../src/routes/proxy';
import { JWTService } from '../../src/services/JWTService';
import { PolicyService } from '../../src/services/PolicyService';
import { RateLimitService } from '../../src/services/RateLimitService';
import { ProxyService } from '../../src/services/ProxyService';
import { AuditService } from '../../src/services/AuditService';
import { PrometheusService } from '../../src/services/PrometheusService';
import { config } from '../../src/config'; // Import config for jwtSecret
import { JWTClaims, DecisionResponse, PolicyObligation } from '@ztag/shared';
import jwt from 'jsonwebtoken';
import { rawBodyParser } from '../../src/plugins/rawBodyParser';
import fastifySensible from '@fastify/sensible';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';

// --- Mocks ---
jest.mock('../../src/services/JWTService');
jest.mock('../../src/services/PolicyService');
jest.mock('../../src/services/RateLimitService');
jest.mock('../../src/services/ProxyService');
jest.mock('../../src/services/AuditService');
jest.mock('../../src/redis'); // Mock redis for the actual eval/get/set calls
jest.mock('../../src/database'); // Mock database for audit logging

const mockJWTService = JWTService as jest.Mocked<typeof JWTService>;
const mockPolicyService = PolicyService as jest.Mocked<typeof PolicyService>;
const mockRateLimitService = RateLimitService as jest.Mocked<typeof RateLimitService>;
const mockProxyService = ProxyService as jest.Mocked<typeof ProxyService>;
const mockAuditService = AuditService as jest.Mocked<typeof AuditService>;

describe('Gateway Integration Tests', () => {
  let fastify: Fastify.FastifyInstance;
  const adminClaims: JWTClaims = {
    sub: 'admin123', email: 'admin@ztag.com', role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000)
  };
  const userClaims: JWTClaims = {
    sub: 'user123', email: 'user@ztag.com', role: 'user', tenant: 'default',
    exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000)
  };
  const blockedClaims: JWTClaims = {
    sub: 'blocked123', email: 'blocked@ztag.com', role: 'blocked',
    exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000)
  };

  const generateToken = (claims: JWTClaims) => jwt.sign(claims, config.jwtSecret[0]);

  beforeEach(async () => {
    fastify = Fastify({ logger: false, requestIdHeader: 'x-request-id' });
    
    // Decorate request/reply objects (as done in index.ts)
    fastify.decorateRequest('user', null);
    fastify.decorateRequest('audit', null);
    fastify.decorateRequest('routeConfig', null);
    fastify.decorateReply('sendError', function (this: Fastify.FastifyReply, code: string, message: string, statusCode: number, details?: Record<string, any>) {
      return this.status(statusCode).send({ error: { code, message, requestId: this.request.id, details } });
    });

    // Register plugins
    await fastify.register(fastifySensible);
    await fastify.register(fastifyCors, { origin: '*' });
    await fastify.register(fastifyHelmet);
    await fastify.register(rawBodyParser);

    // Register routes
    await fastify.register(gatewayRoutes);

    // Reset mocks before each test
    jest.clearAllMocks();
    mockAuditService.recordAudit.mockResolvedValue(undefined); // Audit service is fire-and-forget
    
    // Clear Prometheus metrics
    PrometheusService.metrics.totalRequestsTotal.reset();
    PrometheusService.metrics.allowedRequestsTotal.reset();
    PrometheusService.metrics.deniedRequestsTotal.reset();
    PrometheusService.metrics.rateLimitedRequestsTotal.reset();
    PrometheusService.metrics.requestDurationHistogram.reset();
  });

  afterEach(async () => {
    await fastify.close();
  });

  // Helper to get audit log args from mock call
  const getAuditLogCall = () => mockAuditService.recordAudit.mock.calls[0][0];

  it('should allow a request if policy allows and proxy successfully', async () => {
    mockJWTService.extractTokenFromHeader.mockReturnValue(generateToken(adminClaims));
    mockJWTService.validateToken.mockReturnValue(adminClaims);
    
    const allowDecision: DecisionResponse = { decision: 'ALLOW', reason: 'Admin access', policyId: 'policy-admin' };
    mockPolicyService.evaluate.mockResolvedValueOnce(allowDecision);

    mockRateLimitService.checkRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 9, resetTime: new Date().toISOString(), limit: 10, windowSeconds: 60, key: '' });
    
    const proxyResponse = { statusCode: 200, headers: { 'content-type': 'text/plain' }, body: 'Echo response' };
    mockProxyService.proxyRequest.mockResolvedValueOnce(proxyResponse);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/echo/test',
      headers: { authorization: `Bearer ${generateToken(adminClaims)}`, 'x-request-id': 'test-req-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe('Echo response');
    expect(mockAuditService.recordAudit).toHaveBeenCalledTimes(1);
    expect(getAuditLogCall().decision).toBe('ALLOW');
    expect(getAuditLogCall().policyId).toBe('policy-admin');
    expect(PrometheusService.metrics.totalRequestsTotal.get().values[0].value).toBe(1);
    expect(PrometheusService.metrics.allowedRequestsTotal.get().values[0].value).toBe(1);
  });

  it('should deny a request if JWT is missing', async () => {
    mockJWTService.extractTokenFromHeader.mockReturnValue(null);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/echo/test',
      headers: { 'x-request-id': 'test-req-2' },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload).error.code).toBe('MISSING_TOKEN');
    // Audit log should still be recorded even if JWT is missing, but with anonymous subject
    expect(mockAuditService.recordAudit).toHaveBeenCalledTimes(1);
    expect(getAuditLogCall().decision).toBe('DENY');
    expect(getAuditLogCall().reason).toBe('Authorization token required');
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].value).toBe(1);
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].labels.code).toBe('MISSING_TOKEN');
  });

  it('should deny a request if JWT is invalid', async () => {
    mockJWTService.extractTokenFromHeader.mockReturnValue('invalid-token');
    mockJWTService.validateToken.mockImplementationOnce(() => { throw new Error('invalid signature'); });

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/echo/test',
      headers: { authorization: `Bearer invalid-token`, 'x-request-id': 'test-req-3' },
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.payload).error.code).toBe('INVALID_TOKEN');
    expect(getAuditLogCall().decision).toBe('DENY');
    expect(getAuditLogCall().reason).toContain('Invalid token');
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].value).toBe(1);
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].labels.code).toBe('INVALID_TOKEN');
  });

  it('should deny a request if policy denies', async () => {
    mockJWTService.extractTokenFromHeader.mockReturnValue(generateToken(userClaims));
    mockJWTService.validateToken.mockReturnValue(userClaims);
    
    const denyDecision: DecisionResponse = { decision: 'DENY', reason: 'Blocked by policy', policyId: 'policy-blocked' };
    mockPolicyService.evaluate.mockResolvedValueOnce(denyDecision);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/echo/test',
      headers: { authorization: `Bearer ${generateToken(userClaims)}`, 'x-request-id': 'test-req-4' },
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.payload).error.code).toBe('ACCESS_DENIED');
    expect(JSON.parse(response.payload).error.message).toBe('Blocked by policy');
    expect(mockAuditService.recordAudit).toHaveBeenCalledTimes(1);
    expect(getAuditLogCall().decision).toBe('DENY');
    expect(getAuditLogCall().reason).toBe('Blocked by policy');
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].value).toBe(1);
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].labels.code).toBe('ACCESS_DENIED');
  });

  it('should rate limit a request if policy specifies obligation', async () => {
    mockJWTService.extractTokenFromHeader.mockReturnValue(generateToken(userClaims));
    mockJWTService.validateToken.mockReturnValue(userClaims);
    
    const rateLimitObligation: PolicyObligation = { rateLimit: { key: '{subject.sub}', limit: 10, windowSeconds: 60 } };
    const allowDecision: DecisionResponse = { decision: 'ALLOW', reason: 'User allowed', obligations: rateLimitObligation };
    mockPolicyService.evaluate.mockResolvedValueOnce(allowDecision);

    mockRateLimitService.checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetTime: new Date().toISOString(), limit: 10, windowSeconds: 60, key: 'user123' });

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/echo/test',
      headers: { authorization: `Bearer ${generateToken(userClaims)}`, 'x-request-id': 'test-req-5' },
    });

    expect(response.statusCode).toBe(429);
    expect(JSON.parse(response.payload).error.code).toBe('RATE_LIMITED');
    expect(mockAuditService.recordAudit).toHaveBeenCalledTimes(1);
    expect(getAuditLogCall().decision).toBe('DENY'); // Rate limited is effectively a deny
    expect(getAuditLogCall().reason).toBe('Rate limit exceeded');
    expect(PrometheusService.metrics.rateLimitedRequestsTotal.get().values[0].value).toBe(1);
  });

  it('should return 404 if no matching route config found', async () => {
    mockJWTService.extractTokenFromHeader.mockReturnValue(generateToken(adminClaims));
    mockJWTService.validateToken.mockReturnValue(adminClaims);
    
    // Request a path not defined in config.routeConfigs
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/unknown/path',
      headers: { authorization: `Bearer ${generateToken(adminClaims)}`, 'x-request-id': 'test-req-6' },
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.payload).error.code).toBe('NO_ROUTE');
    expect(mockAuditService.recordAudit).toHaveBeenCalledTimes(1);
    expect(getAuditLogCall().decision).toBe('DENY');
    expect(getAuditLogCall().reason).toBe('No route configured for this path');
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].value).toBe(1);
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].labels.code).toBe('NO_ROUTE');
  });

  it('should handle internal proxy errors gracefully', async () => {
    mockJWTService.extractTokenFromHeader.mockReturnValue(generateToken(adminClaims));
    mockJWTService.validateToken.mockReturnValue(adminClaims);
    
    const allowDecision: DecisionResponse = { decision: 'ALLOW', reason: 'Admin access' };
    mockPolicyService.evaluate.mockResolvedValueOnce(allowDecision);

    mockRateLimitService.checkRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 9, resetTime: new Date().toISOString(), limit: 10, windowSeconds: 60, key: '' });
    
    mockProxyService.proxyRequest.mockRejectedValueOnce(new Error('Downstream service unreachable'));

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/echo/test',
      headers: { authorization: `Bearer ${generateToken(adminClaims)}`, 'x-request-id': 'test-req-7' },
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.payload).error.code).toBe('INTERNAL_GATEWAY_ERROR');
    expect(mockAuditService.recordAudit).toHaveBeenCalledTimes(1);
    expect(getAuditLogCall().decision).toBe('DENY'); // Internal error is a deny for the request
    expect(getAuditLogCall().reason).toContain('Downstream service unreachable');
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].value).toBe(1);
    expect(PrometheusService.metrics.deniedRequestsTotal.get().values[0].labels.code).toBe('INTERNAL_GATEWAY_ERROR');
  });

  it('should expose metrics at /metrics endpoint', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/metrics',
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.payload).toContain('ztag_gateway_total_requests_total');
  });

  it('should respond with 200 to /health endpoint', async () => {
    // Mock db.query and redis.getClient for health checks
    const { db } = require('../../src/database');
    const { redis } = require('../../src/redis');
    db.query.mockResolvedValueOnce({});
    redis.getClient.mockResolvedValueOnce({});
    
    // Mock fetch for policyEngine health
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      })
    ) as jest.Mock;

    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(expect.objectContaining({ status: 'ok' }));
  });
});
