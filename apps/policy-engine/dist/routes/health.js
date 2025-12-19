export async function healthRoutes(fastify) {
    fastify.get('/health', async () => {
        return { status: 'ok' };
    });
}
//# sourceMappingURL=health.js.map