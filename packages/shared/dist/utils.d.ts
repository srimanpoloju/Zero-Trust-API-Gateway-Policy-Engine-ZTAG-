import type { JWTClaims, PolicyCondition } from './types';
export declare class JWTUtils {
    static validateClaims(claims: unknown): JWTClaims;
    static isExpired(claims: JWTClaims): boolean;
    static extractRole(claims: JWTClaims): string;
    static extractTenant(claims: JWTClaims): string | undefined;
    static extractScopes(claims: JWTClaims): string[];
}
export declare class PolicyEvaluator {
    static evaluateCondition(subject: any, condition: PolicyCondition): boolean;
    static getNestedValue(obj: any, path: string): any;
    static matchPath(pattern: string, path: string): boolean;
    static matchMethod(methods: string[], requestMethod: string): boolean;
}
export declare class RequestIdGenerator {
    static generate(): string;
}
export declare class ValidationUtils {
    static isValidEmail(email: string): boolean;
    static isValidUUID(uuid: string): boolean;
    static sanitizeHeader(name: string): string;
    static sanitizePath(path: string): string;
}
export declare class DateTimeUtils {
    static now(): string;
    static addSeconds(date: Date, seconds: number): Date;
    static getWindowStart(windowSeconds: number): Date;
    static getResetTime(windowSeconds: number): string;
}
//# sourceMappingURL=utils.d.ts.map