



import { JWTClaimsSchema } from './types';
import type { 
  JWTClaims, 
  PolicyCondition,
  PolicyRule
} from './types';

// JWT Token Utilities
export class JWTUtils {
  static validateClaims(claims: unknown): JWTClaims {
    return JWTClaimsSchema.parse(claims);
  }

  static isExpired(claims: JWTClaims): boolean {
    return Date.now() / 1000 > claims.exp;
  }

  static extractRole(claims: JWTClaims): string {
    return claims.role;
  }

  static extractTenant(claims: JWTClaims): string | undefined {
    return claims.tenant;
  }

  static extractScopes(claims: JWTClaims): string[] {
    return claims.scopes || [];
  }
}

// Policy Evaluation Utilities
export class PolicyEvaluator {

  static evaluateCondition(subject: any, condition: PolicyCondition): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getNestedValue(subject, field);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'contains':
        return Array.isArray(fieldValue) && value && fieldValue.includes(value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  static evaluateRule(subject: any, rule: PolicyRule): boolean {
    if (rule.conditions.length === 0) {
      return true;
    }

    const allConditionsMatch = rule.conditions.every(condition => 
      this.evaluateCondition(subject, condition)
    );

    return allConditionsMatch;
  }

  static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  static matchPath(pattern: string, path: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  static matchMethod(methods: string[], requestMethod: string): boolean {
    return methods.includes(requestMethod.toUpperCase());
  }
}

// Path Matching Utilities
export class PathMatcher {
  static matches(pattern: string, path: string): boolean {
    return PolicyEvaluator.matchPath(pattern, path);
  }

  static extractParams(pattern: string, path: string): Record<string, string> {
    const params: Record<string, string> = {};
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].substring(1);
        params[paramName] = pathParts[i];
      }
    }

    return params;
  }
}

// Request ID Generator
export class RequestIdGenerator {
  static generate(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Rate Limit Key Generator
export class RateLimitKeyGenerator {
  static generate(subject: JWTClaims, obligation: any): string {
    const baseKey = obligation.rateLimit?.key || 'default';
    const tenant = subject.tenant || 'default';
    const role = subject.role || 'default';
    
    return `rate_limit:${tenant}:${role}:${baseKey}`;
  }
}

// Validation Utilities
export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static sanitizeHeader(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  static sanitizePath(path: string): string {
    // Remove any path traversal attempts
    return path.replace(/\.\./g, '').replace(/\/+/g, '/');
  }
}

// Logger Utilities
export class LoggerUtils {
  static createRequestLogger(requestId: string, method: string, path: string) {
    return {
      info: (message: string, meta?: any) => {
        console.log(JSON.stringify({
          level: 'info',
          message,
          requestId,
          method,
          path,
          timestamp: new Date().toISOString(),
          ...meta
        }));
      },
      warn: (message: string, meta?: any) => {
        console.warn(JSON.stringify({
          level: 'warn',
          message,
          requestId,
          method,
          path,
          timestamp: new Date().toISOString(),
          ...meta
        }));
      },
      error: (message: string, error?: any) => {
        console.error(JSON.stringify({
          level: 'error',
          message,
          requestId,
          method,
          path,
          timestamp: new Date().toISOString(),
          error: error?.message || error
        }));
      }
    };
  }
}

// Date/Time Utilities
export class DateTimeUtils {
  static now(): string {
    return new Date().toISOString();
  }

  static addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
  }

  static getWindowStart(windowSeconds: number): Date {
    const now = new Date();
    const windowMs = windowSeconds * 1000;
    return new Date(now.getTime() - (now.getTime() % windowMs));
  }

  static getResetTime(windowSeconds: number): string {
    const windowStart = this.getWindowStart(windowSeconds);
    const resetTime = this.addSeconds(windowStart, windowSeconds);
    return resetTime.toISOString();
  }
}

export { JWTClaimsSchema } from './types';
