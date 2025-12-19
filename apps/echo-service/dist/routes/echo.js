export async function echoRoutes(fastify) {
    fastify.all('/', async (request, reply) => {
        return {
            message: 'Echo service response',
            timestamp: new Date().toISOString(),
            request: {
                method: request.method,
                url: request.url,
                headers: request.headers,
                query: request.query,
                params: request.params,
                ip: request.ip,
                body: request.body,
            }
        };
    });
    fastify.all('/*', async (request, reply) => {
        return {
            message: 'Echo service response',
            timestamp: new Date().toISOString(),
            request: {
                method: request.method,
                url: request.url,
                headers: request.headers,
                query: request.query,
                params: request.params,
                ip: request.ip,
                body: request.body,
            }
        };
    });
}
//# sourceMappingURL=echo.js.map