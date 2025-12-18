export const config = {
  port: parseInt(process.env.GATEWAY_PORT || '3001', 10),
  host: process.env.GATEWAY_HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://ztag:ztag123@localhost:5432/ztag_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  policyEngineUrl: process.env.POLICY_ENGINE_URL || 'http://localhost:3002',
  echoServiceUrl: process.env.ECHO_SERVICE_URL || 'http://localhost:7070',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  rateLimitWindow: 60000, // 1 minute
  rateLimitDefaultLimit: 100
} as const;
