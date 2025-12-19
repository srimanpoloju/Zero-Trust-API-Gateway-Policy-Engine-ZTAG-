import 'dotenv/config';

export const config = {
  host: process.env.POLICY_ENGINE_HOST || '0.0.0.0',
  port: Number(process.env.POLICY_ENGINE_PORT || 4000),
};
