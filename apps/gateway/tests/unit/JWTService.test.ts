import { JWTService } from '../../src/services/JWTService';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';
import { JWTClaimsSchema } from '@ztag/shared';

// Mock the jsonwebtoken library
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

// Mock the config module
jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: ['test-secret'],
  },
}));

describe('JWTService Unit Tests', () => {
  const mockJwtVerify = jwt.verify as jest.Mock;

  beforeEach(() => {
    mockJwtVerify.mockReset();
  });

  describe('validateToken', () => {
    const validClaims = {
      sub: 'user123',
      email: 'test@example.com',
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
    };
    const validToken = 'valid.jwt.token';

    it('should validate a token and return claims', () => {
      mockJwtVerify.mockReturnValueOnce(validClaims);

      const claims = JWTService.validateToken(validToken);
      expect(mockJwtVerify).toHaveBeenCalledWith(validToken, config.jwtSecret);
      expect(claims).toEqual(JWTClaimsSchema.parse(validClaims));
    });

    it('should throw an error for an invalid token (jwt.verify fails)', () => {
      mockJwtVerify.mockImplementationOnce(() => {
        throw new Error('invalid signature');
      });

      expect(() => JWTService.validateToken(validToken)).toThrow('Invalid token: invalid signature');
    });

    it('should throw an error for claims that do not match schema', () => {
      const invalidClaims = { ...validClaims, role: 'invalid-role' }; // Not in enum
      mockJwtVerify.mockReturnValueOnce(invalidClaims);

      expect(() => JWTService.validateToken(validToken)).toThrow(/Invalid token/);
    });

    it('should throw an error for an expired token', () => {
      const expiredClaims = { ...validClaims, exp: Math.floor(Date.now() / 1000) - 3600 };
      mockJwtVerify.mockReturnValueOnce(expiredClaims);

      // jsonwebtoken.verify should handle this directly, but our custom check
      // would also catch it if verify somehow didn't throw for exp.
      // For this test, we'll assume jwt.verify will throw if token is actually expired.
      mockJwtVerify.mockImplementationOnce(() => {
        const error = new Error('jwt expired');
        (error as any).name = 'TokenExpiredError'; // Simulate specific JWT error type
        throw error;
      });

      expect(() => JWTService.validateToken(validToken)).toThrow('Invalid token: jwt expired');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from "Bearer" header', () => {
      const header = 'Bearer abc.def.ghi';
      expect(JWTService.extractTokenFromHeader(header)).toBe('abc.def.ghi');
    });

    it('should return null if header is undefined', () => {
      expect(JWTService.extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should return null if header does not start with "Bearer "', () => {
      const header = 'Token abc.def.ghi';
      expect(JWTService.extractTokenFromHeader(header)).toBeNull();
    });

    it('should return null if header is just "Bearer"', () => {
      const header = 'Bearer';
      expect(JWTService.extractTokenFromHeader(header)).toBeNull();
    });
  });
});
