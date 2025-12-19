import { Pool } from 'pg';
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
export const db = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
};
export async function initializeDatabase() {
    try {
        await db.query('SELECT NOW()');
        console.log('Database connection established');
    }
    catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}
//# sourceMappingURL=index.js.map