import { redis } from '../redis';
import { config } from '../config';
import type { JWTClaims } from '@ztag/shared';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  key?: string;
}

export class RateLimitService {
  static async checkRateLimit(
    subject: JWTClaims, 
    options: RateLimitOptions
  ): Promise<{ allowed: boolean; remaining: number; resetTime: string }> {
    const key = options.key || `rate_limit:${subject.role}:${subject.tenant || 'default'}`;
    const windowKey = `window:${key}`;
    
    try {
      const current = await redis.get(key);
      const windowStart = await redis.get(windowKey);
      
      const now = Date.now();
      const windowStartTime = now - (now % (options.windowSeconds * 1000));
      

      // Reset window if needed
      if (parseInt(windowStart || '0') !== windowStartTime) {
        await redis.set(windowKey, windowStartTime.toString(), options.windowSeconds);
        await redis.set(key, '0', options.windowSeconds);
        return {
          allowed: true,
          remaining: options.limit - 1,
          resetTime: new Date(windowStartTime + options.windowSeconds * 1000).toISOString()
        };
      }
      
      const count = parseInt(current || '0');
      
      if (count >= options.limit) {
        const resetTime = new Date(windowStartTime + options.windowSeconds * 1000).toISOString();
        return {
          allowed: false,
          remaining: 0,
          resetTime
        };
      }
      
      // Increment counter
      await redis.set(key, (count + 1).toString(), options.windowSeconds);
      
      return {
        allowed: true,
        remaining: options.limit - count - 1,
        resetTime: new Date(windowStartTime + options.windowSeconds * 1000).toISOString()
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open for availability
      return {
        allowed: true,
        remaining: options.limit,
        resetTime: new Date(Date.now() + options.windowSeconds * 1000).toISOString()
      };
    }
  }
}
