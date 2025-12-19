import { RedisClientType } from 'redis';
export declare const redis: {
    initialize(): Promise<void>;
    getClient(): Promise<RedisClientType>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, expireInSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    eval(script: string, keys: string[], args: (string | number)[]): Promise<any>;
    close(): Promise<void>;
};
//# sourceMappingURL=redis.d.ts.map