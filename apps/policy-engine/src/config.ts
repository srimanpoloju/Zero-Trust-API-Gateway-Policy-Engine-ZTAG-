export const config = {
  port: parseInt(process.env.POLICY_ENGINE_PORT || '3002', 10),
  host: process.env.POLICY_ENGINE_HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://ztag:ztag123@localhost:5432/ztag_db',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  nodeEnv: process.env.NODE_ENV || 'development'
} as const;
