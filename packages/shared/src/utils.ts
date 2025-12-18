



import { JWTClaimsSchema } from './types';
import type { 
  JWTClaims, 
  PolicyCondition
} from './types'; // Removed PolicyRule

// JWT Token Utilities
export class JWTUtils {
  static validateClaims(claims: unknown): JWTClaims {
    return JWTClaimsSchema.parse(claims);
  }

  static isExpired(claims: JWTClaims): boolean {
    // Note: jsonwebtoken.verify usually handles exp automatically,
    // but this explicit check can be useful for pre-validation or custom logic.
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

    // Handle cases where fieldValue is undefined or null early for certain operators
    if (fieldValue === undefined || fieldValue === null) {
      return operator === 'neq' || operator === 'not_in';
    }

    switch (operator) {
      case 'eq':
        // Use loose equality for flexibility in type comparison (e.g., string "1" == number 1)
        return fieldValue == value;
      case 'neq':
        return fieldValue != value;
      case 'in':
        // Check if fieldValue is present in the 'value' array
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        // Check if fieldValue is NOT present in the 'value' array
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'contains':
        // Check if fieldValue (array) contains 'value'
        return Array.isArray(fieldValue) && fieldValue.includes(value);
      case 'starts_with':
        return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.startsWith(value);
      case 'ends_with':
        return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.endsWith(value);
      case 'gt':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
      case 'lt':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
      case 'gte':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
      case 'lte':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
      default:
        return false;
    }
  }

  // evaluateRule is moved to policy-engine as it depends on policy structure

  static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => (current ? current[key] : undefined), obj);
  }

  static matchPath(pattern: string, path: string): boolean {
    // Handle exact match for root
    if (pattern === '/' && path === '/') return true;

    // Convert glob pattern to regex:
    // * matches any characters except / (within a segment)
    // ? matches any single character except / (within a segment)
    const regexPattern = pattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\//g, '\\/') // Escape slashes
      .replace(/\*\*/g, '.*') // Support ** for matching across segments (if needed, but for now * means one segment)
      .replace(/\*/g, '[^/]*') // * matches any characters except /
      .replace(/\?/g, '[^/]'); // ? matches any single character except /
    
    // Ensure it matches the whole path
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  static matchMethod(methods: string[], requestMethod: string): boolean {
    // If methods array contains '*', it matches any method
    if (methods.includes('*')) {
      return true;
    }
    return methods.includes(requestMethod.toUpperCase());
  }
}

// Request ID Generator
export class RequestIdGenerator {
  static generate(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Rate Limit Key Generator (moved to gateway service as it's specific)

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

// Logger Utilities (moved to individual services)

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
    // Calculate start of the current window
    return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  }

  static getResetTime(windowSeconds: number): string {
    const windowStart = this.getWindowStart(windowSeconds);
    const resetTime = this.addSeconds(windowStart, windowSeconds);
    return resetTime.toISOString();
  }
}

// Removed duplicate export { JWTClaimsSchema } from './types';
