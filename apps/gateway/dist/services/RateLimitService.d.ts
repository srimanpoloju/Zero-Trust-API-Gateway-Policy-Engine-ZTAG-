import type { JWTClaims, RateLimitResponse } from '@ztag/shared';
export interface RateLimitOptions {
    limit: number;
    windowSeconds: number;
    key?: string;
}
/**
 * Service for handling Redis-based atomic rate limiting.
 */
export declare class RateLimitService {
    static checkRateLimit(subject: JWTClaims, options: RateLimitOptions, requestId: string): Promise<RateLimitResponse>;
    /**
     * Resolves a key template string by replacing placeholders with values from JWTClaims.
     * e.g., "user_rl:{subject.sub}" -> "user_rl:user123"
     */
    private static resolveKeyTemplate;
}
//# sourceMappingURL=RateLimitService.d.ts.map