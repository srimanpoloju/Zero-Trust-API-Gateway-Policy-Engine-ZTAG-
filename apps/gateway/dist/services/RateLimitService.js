import { redis } from '../redis';
import { logger } from '../utils/logger'; // Assuming logger exists or will be created
// Lua script for atomic fixed-window rate limiting
// KEYS[1] = counter key
// KEYS[2] = window start timestamp key (optional, for debugging/visibility)
// ARGV[1] = limit
// ARGV[2] = windowSeconds
// ARGV[3] = current timestamp in milliseconds
const RATE_LIMIT_SCRIPT = `
  local counter_key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window_seconds = tonumber(ARGV[2])
  local current_time_ms = tonumber(ARGV[3])

  local window_start_ms = math.floor(current_time_ms / (window_seconds * 1000)) * (window_seconds * 1000)
  local window_end_ms = window_start_ms + (window_seconds * 1000)

  -- Get current count for the window
  local current_count = tonumber(redis.call('GET', counter_key))
  if not current_count then
      current_count = 0
  end

  local remaining = limit - current_count

  -- If remaining is positive, increment and set expiry
  if remaining > 0 then
      redis.call('INCR', counter_key)
      if current_count == 0 then
          -- Set expiration for the counter key to align with the window end
          redis.call('PEXPIRE', counter_key, window_end_ms - current_time_ms)
      end
      remaining = remaining - 1
      return {1, remaining, window_end_ms} -- 1 for allowed
  else
      return {0, 0, window_end_ms} -- 0 for not allowed
  end
`;
/**
 * Service for handling Redis-based atomic rate limiting.
 */
export class RateLimitService {
    static async checkRateLimit(subject, options, requestId) {
        const defaultKey = `rate_limit:${subject.sub || 'anonymous'}:${subject.tenant || 'default'}`;
        const rateLimitKey = options.key ? this.resolveKeyTemplate(options.key, subject) : defaultKey;
        const counterKey = `rl:counter:${rateLimitKey}`;
        try {
            // Execute Lua script for atomic rate limiting
            // KEYS: [counterKey]
            // ARGV: [limit, windowSeconds, currentTimeMs]
            const scriptResult = await redis.eval(RATE_LIMIT_SCRIPT, [counterKey], [options.limit, options.windowSeconds, Date.now()]);
            // scriptResult is an array: [allowed (0|1), remaining, windowEndMs]
            const allowed = scriptResult[0] === 1;
            const remaining = scriptResult[1];
            const resetTimeMs = scriptResult[2];
            return {
                allowed,
                remaining,
                resetTime: new Date(resetTimeMs).toISOString(),
                limit: options.limit,
                windowSeconds: options.windowSeconds,
                key: rateLimitKey
            };
        }
        catch (error) {
            logger.error({ requestId, err: error }, 'Rate limit check failed, failing open.');
            // Fail open for availability: if Redis is down or script fails, allow request.
            return {
                allowed: true,
                remaining: options.limit,
                resetTime: new Date(Date.now() + options.windowSeconds * 1000).toISOString(),
                limit: options.limit,
                windowSeconds: options.windowSeconds,
                key: rateLimitKey
            };
        }
    }
    /**
     * Resolves a key template string by replacing placeholders with values from JWTClaims.
     * e.g., "user_rl:{subject.sub}" -> "user_rl:user123"
     */
    static resolveKeyTemplate(template, subject) {
        return template.replace(/\{subject\.([^}]+)\}/g, (match, claimKey) => {
            // Basic resolution for now, can be extended for nested properties
            if (claimKey === 'sub')
                return subject.sub;
            if (claimKey === 'role')
                return subject.role;
            if (claimKey === 'tenant')
                return subject.tenant || 'default';
            // Add other relevant claims as needed
            return match; // Return original placeholder if not found
        });
    }
}
//# sourceMappingURL=RateLimitService.js.map