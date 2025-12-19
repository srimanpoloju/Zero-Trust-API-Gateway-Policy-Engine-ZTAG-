import dotenv from 'dotenv';
dotenv.config();
export const config = {
    port: parseInt(process.env.GATEWAY_PORT || '3001', 10),
    host: process.env.GATEWAY_HOST || '0.0.0.0',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://ztag_user:ztag_password@localhost:5432/ztag_db',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    policyEngineUrl: process.env.POLICY_ENGINE_URL || 'http://localhost:4000',
    echoServiceUrl: process.env.ECHO_SERVICE_URL || 'http://localhost:7070',
    logLevel: process.env.LOG_LEVEL || 'info',
    // Allow multiple JWT secrets for rotation
    jwtSecret: process.env.JWT_SECRET?.split(',').map(s => s.trim()) || ['default-jwt-secret'],
    nodeEnv: process.env.NODE_ENV || 'development',
    rateLimitWindow: 60000, // 1 minute
    rateLimitDefaultLimit: 100,
    // --- Dynamic Route Configurations ---
    // These define how incoming paths are mapped to downstream services
    routeConfigs: [
        {
            service: 'echo-service',
            pathPattern: '/echo/*',
            targetUrl: process.env.ECHO_SERVICE_URL || 'http://localhost:7070',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            stripHeaders: ['cookie']
        },
        // Add other service routes here as needed
    ]
};
//# sourceMappingURL=config.js.map