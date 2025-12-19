import { RouteConfig } from '@ztag/shared';
export declare const config: {
    readonly port: number;
    readonly host: string;
    readonly databaseUrl: string;
    readonly redisUrl: string;
    readonly policyEngineUrl: string;
    readonly echoServiceUrl: string;
    readonly logLevel: string;
    readonly jwtSecret: string[];
    readonly nodeEnv: string;
    readonly rateLimitWindow: 60000;
    readonly rateLimitDefaultLimit: 100;
    readonly routeConfigs: RouteConfig[];
};
//# sourceMappingURL=config.d.ts.map