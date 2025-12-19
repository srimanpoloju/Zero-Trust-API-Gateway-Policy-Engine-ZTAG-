import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';
const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
});
export const db = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
};
export async function initializeDatabase() {
    try {
        await db.query('SELECT NOW()');
        logger.info('Gateway Database connection established');
    }
    catch (error) {
        logger.error({ err: error }, 'Gateway Database connection failed');
        throw error;
    }
}
//# sourceMappingURL=index.js.map