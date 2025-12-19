import { FastifyInstance } from 'fastify';
import { AuditLog, JWTClaims, RouteConfig } from '@ztag/shared';
declare module 'fastify' {
    interface FastifyRequest {
        user?: JWTClaims;
        audit: Omit<AuditLog, 'id' | 'timestamp'>;
        routeConfig?: RouteConfig;
        rawBody?: Buffer;
    }
    interface FastifyReply {
        sendError: (code: string, message: string, statusCode: number, details?: Record<string, any>) => FastifyReply;
    }
}
export declare function gatewayRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=proxy.d.ts.map