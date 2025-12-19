declare module 'fastify' {
    interface FastifyRequest {
        rawBody: Buffer | undefined;
    }
}
/**
 * A Fastify plugin to parse raw request body.
 * This is useful for proxying requests where the body might be in various formats
 * or needs to be re-streamed to the downstream service.
 */
export declare const rawBodyParser: any;
//# sourceMappingURL=rawBodyParser.d.ts.map