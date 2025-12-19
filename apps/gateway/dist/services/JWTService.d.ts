import type { JWTClaims } from '@ztag/shared';
export declare class JWTService {
    static validateToken(token: string): JWTClaims;
    static isExpired(claims: JWTClaims): boolean;
    static extractTokenFromHeader(authHeader: string | undefined): string | null;
}
//# sourceMappingURL=JWTService.d.ts.map