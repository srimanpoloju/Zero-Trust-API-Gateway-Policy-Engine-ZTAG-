import jwt from 'jsonwebtoken';
import { JWTClaimsSchema } from '@ztag/shared';
import type { JWTClaims } from '@ztag/shared';
import { config } from './config';

export class JWTService {
  static validateToken(token: string): JWTClaims {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const claims = JWTClaimsSchema.parse(decoded);
      
      // Check if token is expired
      if (this.isExpired(claims)) {
        throw new Error('Token expired');
      }
      
      return claims;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid token: ${error.message}`);
      }
      throw new Error('Invalid token');
    }
  }

  static isExpired(claims: JWTClaims): boolean {
    return Date.now() / 1000 > claims.exp;
  }

  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
