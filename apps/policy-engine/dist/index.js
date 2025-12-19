import Fastify from 'fastify';
import { config } from './config';
import { initializeDatabase } from './database';
import { logger } from './utils/logger';
import { healthRoutes } from './routes/health';
import { evaluationRoutes } from './routes/evaluation';
import { policyRoutes } from './routes/policies';
import { auditRoutes } from './routes/audit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
async function buildServer() {
    const fastify = Fastify({
        logger: {
            level: process.env.LOG_LEVEL ?? 'info',
        },
        requestIdHeader: 'x-request-id',
    });
    await fastify.register(fastifyCors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    });
    await fastify.register(fastifySwagger, {
        swagger: {
            info: {
                title: 'ZTAG Policy Engine API',
                description: 'API documentation for the ZTAG Policy Engine service',
                version: '1.0.0'
            },
            host: `${config.host}:${config.port}`,
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json'],
            tags: [
                { name: 'Evaluation', description: 'Policy evaluation endpoints' },
                { name: 'Policies', description: 'Policy management (CRUD) endpoints' },
                { name: 'Audit', description: 'Audit log viewing endpoints' },
                { name: 'Health', description: 'Health check endpoint' }
            ]
        }
    });
    await fastify.register(fastifySwaggerUi, {
        routePrefix: '/documentation',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: false
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
        transformSpecification: (swaggerObject) => swaggerObject,
        transformSpecificationClone: true
    });
    fastify.register(healthRoutes);
    fastify.register(evaluationRoutes, { prefix: '/evaluate' });
    fastify.register(policyRoutes, { prefix: '/policies' });
    fastify.register(auditRoutes, { prefix: '/audits' });
    return fastify;
}
async function start() {
    try {
        logger.info('Initializing database connection...');
        await initializeDatabase();
        logger.info('Database connection established.');
        const server = await buildServer();
        await server.listen({
            host: config.host,
            port: config.port
        });
        logger.info(`Policy engine running on http://${config.host}:${config.port}`);
        logger.info(`Docs available at http://${config.host}:${config.port}/documentation`);
    }
    catch (err) {
        logger.error({ err }, 'Failed to start policy engine');
        process.exit(1);
    }
}
process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
start();
//# sourceMappingURL=index.js.map