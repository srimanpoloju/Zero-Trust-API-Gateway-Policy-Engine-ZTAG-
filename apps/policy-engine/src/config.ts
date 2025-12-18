import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.POLICY_ENGINE_PORT || '4000', 10),
  host: process.env.POLICY_ENGINE_HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://ztag_user:ztag_password@localhost:5432/ztag_db',
  logLevel: process.env.LOG_LEVEL || 'info',
};