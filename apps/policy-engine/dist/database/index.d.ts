export declare const db: {
    query: (text: string, params?: any[]) => Promise<import("pg").QueryResult<any>>;
    getClient: () => Promise<import("pg").PoolClient>;
};
export declare function initializeDatabase(): Promise<void>;
//# sourceMappingURL=index.d.ts.map