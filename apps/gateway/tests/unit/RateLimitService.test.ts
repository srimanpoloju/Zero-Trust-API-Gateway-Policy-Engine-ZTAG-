import { RateLimitService } from '../../src/services/RateLimitService';
import { redis } from '../../src/redis';
import { logger } from '../../src/utils/logger';
import { JWTClaims } from '@ztag/shared';

// Mock Redis client
jest.mock('../../src/redis', () => ({
  redis: {
    eval: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockRedisEval = redis.eval as jest.Mock;
const mockLoggerError = logger.error as jest.Mock;

describe('RateLimitService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-10-26T10:00:00.000Z')); // Fixed time for consistent results
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockClaims: JWTClaims = {
    sub: 'user123',
    email: 'user@example.com',
    role: 'user',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };
  const requestId = 'test-request-id';

  it('should return allowed if rate limit is not exceeded', async () => {
    mockRedisEval.mockResolvedValueOnce([1, 9, 1698307260000]); // Allowed, 9 remaining, resetTime (ms)

    const result = await RateLimitService.checkRateLimit(
      mockClaims,
      { limit: 10, windowSeconds: 60, key: 'test_key' },
      requestId
    );

    expect(result).toEqual({
      allowed: true,
      remaining: 9,
      resetTime: new Date(1698307260000).toISOString(),
      limit: 10,
      windowSeconds: 60,
      key: 'test_key'
    });
    expect(mockRedisEval).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('should return not allowed if rate limit is exceeded', async () => {
    mockRedisEval.mockResolvedValueOnce([0, 0, 1698307260000]); // Not allowed, 0 remaining, resetTime (ms)

    const result = await RateLimitService.checkRateLimit(
      mockClaims,
      { limit: 10, windowSeconds: 60, key: 'test_key' },
      requestId
    );

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      resetTime: new Date(1698307260000).toISOString(),
      limit: 10,
      windowSeconds: 60,
      key: 'test_key'
    });
    expect(mockRedisEval).toHaveBeenCalledTimes(1);
  });

  it('should fail open if redis eval throws an error', async () => {
    mockRedisEval.mockRejectedValueOnce(new Error('Redis connection lost'));

    const result = await RateLimitService.checkRateLimit(
      mockClaims,
      { limit: 10, windowSeconds: 60, key: 'test_key' },
      requestId
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10); // Returns original limit when failing open
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ requestId, err: expect.any(Error) }),
      'Rate limit check failed, failing open.'
    );
  });

  it('should resolve key template for subject.sub', async () => {
    mockRedisEval.mockResolvedValueOnce([1, 9, 1698307260000]);
    await RateLimitService.checkRateLimit(
      mockClaims,
      { limit: 10, windowSeconds: 60, key: '{subject.sub}:api_calls' },
      requestId
    );
    // Check if the script was called with the correct key based on template resolution
    expect(mockRedisEval).toHaveBeenCalledWith(
      expect.any(String),
      [`rl:counter:user123:api_calls`], // Expected key generated from template
      [10, 60, expect.any(Number)]
    );
  });

  it('should resolve key template for subject.tenant', async () => {
    const claimsWithTenant = { ...mockClaims, tenant: 'my-tenant' };
    mockRedisEval.mockResolvedValueOnce([1, 9, 1698307260000]);
    await RateLimitService.checkRateLimit(
      claimsWithTenant,
      { limit: 10, windowSeconds: 60, key: '{subject.tenant}:api_calls' },
      requestId
    );
    expect(mockRedisEval).toHaveBeenCalledWith(
      expect.any(String),
      [`rl:counter:my-tenant:api_calls`],
      [10, 60, expect.any(Number)]
    );
  });
});
