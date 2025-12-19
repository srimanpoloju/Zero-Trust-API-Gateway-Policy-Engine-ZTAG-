export async function healthRoutes(fastify) {
    fastify.get('/', async (request, reply) => {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'echo-service',
            version: '1.0.0'
        };
    });
}
//# sourceMappingURL=health.js.map