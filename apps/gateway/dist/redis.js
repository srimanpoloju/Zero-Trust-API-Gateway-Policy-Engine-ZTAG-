import { config } from './config';
import { createClient } from 'redis';
let redisClient;
export const redis = {
    async initialize() {
        redisClient = createClient({
            url: config.redisUrl
        });
        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
        await redisClient.connect();
    },
    async getClient() {
        if (!redisClient) {
            throw new Error('Redis not initialized');
        }
        return redisClient;
    },
    async get(key) {
        const client = await this.getClient();
        return await client.get(key);
    },
    async set(key, value, expireInSeconds) {
        const client = await this.getClient();
        if (expireInSeconds) {
            await client.setEx(key, expireInSeconds, value);
        }
        else {
            await client.set(key, value);
        }
    },
    async del(key) {
        const client = await this.getClient();
        await client.del(key);
    },
    async eval(script, keys, args) {
        const client = await this.getClient();
        // In node_redis v4, eval takes an array of keys and an array of arguments
        // The script itself defines how many keys (KEYS) vs arguments (ARGV) it expects
        // The library handles mapping the keys and args arrays to Redis's KEYS and ARGV
        return client.eval(script, { keys, arguments: args });
    },
    async close() {
        if (redisClient) {
            await redisClient.quit();
        }
    }
};
//# sourceMappingURL=redis.js.map