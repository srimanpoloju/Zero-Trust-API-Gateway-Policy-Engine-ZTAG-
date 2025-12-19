import { z } from 'zod';
export declare const JWTClaimsSchema: z.ZodObject<{
    sub: z.ZodString;
    email: z.ZodString;
    role: z.ZodString;
    tenant: z.ZodOptional<z.ZodString>;
    scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exp: z.ZodNumber;
    iat: z.ZodNumber;
    iss: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sub: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
    tenant?: string | undefined;
    scopes?: string[] | undefined;
    iss?: string | undefined;
}, {
    sub: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
    tenant?: string | undefined;
    scopes?: string[] | undefined;
    iss?: string | undefined;
}>;
export type JWTClaims = z.infer<typeof JWTClaimsSchema>;
export declare const PolicyConditionSchema: z.ZodObject<{
    field: z.ZodString;
    operator: z.ZodEnum<["eq", "neq", "in", "not_in", "contains", "starts_with", "ends_with", "gt", "lt", "gte", "lte"]>;
    value: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    field: string;
    operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
    value?: any;
}, {
    field: string;
    operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
    value?: any;
}>;
export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;
export declare const PolicyRulesSchema: z.ZodObject<{
    allowIf: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodEnum<["eq", "neq", "in", "not_in", "contains", "starts_with", "ends_with", "gt", "lt", "gte", "lte"]>;
        value: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        field: string;
        operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
        value?: any;
    }, {
        field: string;
        operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
        value?: any;
    }>, "many">>;
    denyIf: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodEnum<["eq", "neq", "in", "not_in", "contains", "starts_with", "ends_with", "gt", "lt", "gte", "lte"]>;
        value: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        field: string;
        operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
        value?: any;
    }, {
        field: string;
        operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
        value?: any;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    allowIf?: {
        field: string;
        operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
        value?: any;
    }[] | undefined;
    denyIf?: {
        field: string;
        operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
        value?: any;
    }[] | undefined;
}, {
    allowIf?: {
        field: string;
        operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
        value?: any;
    }[] | undefined;
    denyIf?: {
        field: string;
        operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
        value?: any;
    }[] | undefined;
}>;
export type PolicyRules = z.infer<typeof PolicyRulesSchema>;
export declare const PolicyObligationSchema: z.ZodObject<{
    rateLimit: z.ZodOptional<z.ZodObject<{
        key: z.ZodString;
        limit: z.ZodNumber;
        windowSeconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        key: string;
        limit: number;
        windowSeconds: number;
    }, {
        key: string;
        limit: number;
        windowSeconds: number;
    }>>;
    requireMFA: z.ZodOptional<z.ZodBoolean>;
    logLevel: z.ZodOptional<z.ZodEnum<["debug", "info", "warn", "error"]>>;
}, "strip", z.ZodTypeAny, {
    rateLimit?: {
        key: string;
        limit: number;
        windowSeconds: number;
    } | undefined;
    requireMFA?: boolean | undefined;
    logLevel?: "debug" | "info" | "warn" | "error" | undefined;
}, {
    rateLimit?: {
        key: string;
        limit: number;
        windowSeconds: number;
    } | undefined;
    requireMFA?: boolean | undefined;
    logLevel?: "debug" | "info" | "warn" | "error" | undefined;
}>;
export type PolicyObligation = z.infer<typeof PolicyObligationSchema>;
export declare const PolicyMatchConditionsSchema: z.ZodObject<{
    service: z.ZodString;
    pathPattern: z.ZodString;
    methods: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tenant: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    service: string;
    pathPattern: string;
    methods: string[];
    tenant?: string | undefined;
}, {
    service: string;
    pathPattern: string;
    tenant?: string | undefined;
    methods?: string[] | undefined;
}>;
export type PolicyMatchConditions = z.infer<typeof PolicyMatchConditionsSchema>;
export declare const PolicySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
    matchConditions: z.ZodObject<{
        service: z.ZodString;
        pathPattern: z.ZodString;
        methods: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tenant: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        service: string;
        pathPattern: string;
        methods: string[];
        tenant?: string | undefined;
    }, {
        service: string;
        pathPattern: string;
        tenant?: string | undefined;
        methods?: string[] | undefined;
    }>;
    rules: z.ZodObject<{
        allowIf: z.ZodOptional<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodEnum<["eq", "neq", "in", "not_in", "contains", "starts_with", "ends_with", "gt", "lt", "gte", "lte"]>;
            value: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }, {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }>, "many">>;
        denyIf: z.ZodOptional<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodEnum<["eq", "neq", "in", "not_in", "contains", "starts_with", "ends_with", "gt", "lt", "gte", "lte"]>;
            value: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }, {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        allowIf?: {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }[] | undefined;
        denyIf?: {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }[] | undefined;
    }, {
        allowIf?: {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }[] | undefined;
        denyIf?: {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }[] | undefined;
    }>;
    obligations: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        rateLimit: z.ZodOptional<z.ZodObject<{
            key: z.ZodString;
            limit: z.ZodNumber;
            windowSeconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            key: string;
            limit: number;
            windowSeconds: number;
        }, {
            key: string;
            limit: number;
            windowSeconds: number;
        }>>;
        requireMFA: z.ZodOptional<z.ZodBoolean>;
        logLevel: z.ZodOptional<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    }, "strip", z.ZodTypeAny, {
        rateLimit?: {
            key: string;
            limit: number;
            windowSeconds: number;
        } | undefined;
        requireMFA?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
    }, {
        rateLimit?: {
            key: string;
            limit: number;
            windowSeconds: number;
        } | undefined;
        requireMFA?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
    }>>>;
    version: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    enabled: boolean;
    priority: number;
    matchConditions: {
        service: string;
        pathPattern: string;
        methods: string[];
        tenant?: string | undefined;
    };
    rules: {
        allowIf?: {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }[] | undefined;
        denyIf?: {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }[] | undefined;
    };
    obligations: {
        rateLimit?: {
            key: string;
            limit: number;
            windowSeconds: number;
        } | undefined;
        requireMFA?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
    };
    version: number;
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    name: string;
    matchConditions: {
        service: string;
        pathPattern: string;
        tenant?: string | undefined;
        methods?: string[] | undefined;
    };
    rules: {
        allowIf?: {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }[] | undefined;
        denyIf?: {
            field: string;
            operator: "eq" | "neq" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "gt" | "lt" | "gte" | "lte";
            value?: any;
        }[] | undefined;
    };
    createdAt: string;
    updatedAt: string;
    enabled?: boolean | undefined;
    priority?: number | undefined;
    obligations?: {
        rateLimit?: {
            key: string;
            limit: number;
            windowSeconds: number;
        } | undefined;
        requireMFA?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
    } | undefined;
    version?: number | undefined;
}>;
export type Policy = z.infer<typeof PolicySchema>;
export declare const DecisionRequestSchema: z.ZodObject<{
    subject: z.ZodObject<{
        sub: z.ZodString;
        email: z.ZodString;
        role: z.ZodString;
        tenant: z.ZodOptional<z.ZodString>;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exp: z.ZodNumber;
        iat: z.ZodNumber;
        iss: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sub: string;
        email: string;
        role: string;
        exp: number;
        iat: number;
        tenant?: string | undefined;
        scopes?: string[] | undefined;
        iss?: string | undefined;
    }, {
        sub: string;
        email: string;
        role: string;
        exp: number;
        iat: number;
        tenant?: string | undefined;
        scopes?: string[] | undefined;
        iss?: string | undefined;
    }>;
    resource: z.ZodObject<{
        service: z.ZodString;
        path: z.ZodString;
        method: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        service: string;
        method: string;
    }, {
        path: string;
        service: string;
        method: string;
    }>;
    context: z.ZodObject<{
        ip: z.ZodString;
        userAgent: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodString;
        requestId: z.ZodString;
        tenant: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ip: string;
        timestamp: string;
        requestId: string;
        tenant?: string | undefined;
        userAgent?: string | undefined;
    }, {
        ip: string;
        timestamp: string;
        requestId: string;
        tenant?: string | undefined;
        userAgent?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    subject: {
        sub: string;
        email: string;
        role: string;
        exp: number;
        iat: number;
        tenant?: string | undefined;
        scopes?: string[] | undefined;
        iss?: string | undefined;
    };
    resource: {
        path: string;
        service: string;
        method: string;
    };
    context: {
        ip: string;
        timestamp: string;
        requestId: string;
        tenant?: string | undefined;
        userAgent?: string | undefined;
    };
}, {
    subject: {
        sub: string;
        email: string;
        role: string;
        exp: number;
        iat: number;
        tenant?: string | undefined;
        scopes?: string[] | undefined;
        iss?: string | undefined;
    };
    resource: {
        path: string;
        service: string;
        method: string;
    };
    context: {
        ip: string;
        timestamp: string;
        requestId: string;
        tenant?: string | undefined;
        userAgent?: string | undefined;
    };
}>;
export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;
export declare const DecisionResponseSchema: z.ZodObject<{
    decision: z.ZodEnum<["ALLOW", "DENY"]>;
    reason: z.ZodString;
    policyId: z.ZodOptional<z.ZodString>;
    obligations: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        rateLimit: z.ZodOptional<z.ZodObject<{
            key: z.ZodString;
            limit: z.ZodNumber;
            windowSeconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            key: string;
            limit: number;
            windowSeconds: number;
        }, {
            key: string;
            limit: number;
            windowSeconds: number;
        }>>;
        requireMFA: z.ZodOptional<z.ZodBoolean>;
        logLevel: z.ZodOptional<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    }, "strip", z.ZodTypeAny, {
        rateLimit?: {
            key: string;
            limit: number;
            windowSeconds: number;
        } | undefined;
        requireMFA?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
    }, {
        rateLimit?: {
            key: string;
            limit: number;
            windowSeconds: number;
        } | undefined;
        requireMFA?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    obligations: {
        rateLimit?: {
            key: string;
            limit: number;
            windowSeconds: number;
        } | undefined;
        requireMFA?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
    };
    decision: "ALLOW" | "DENY";
    reason: string;
    policyId?: string | undefined;
}, {
    decision: "ALLOW" | "DENY";
    reason: string;
    obligations?: {
        rateLimit?: {
            key: string;
            limit: number;
            windowSeconds: number;
        } | undefined;
        requireMFA?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
    } | undefined;
    policyId?: string | undefined;
}>;
export type DecisionResponse = z.infer<typeof DecisionResponseSchema>;
export declare const AuditLogSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    requestId: z.ZodString;
    timestamp: z.ZodString;
    subject: z.ZodObject<{
        sub: z.ZodString;
        role: z.ZodString;
        tenant: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sub: string;
        role: string;
        tenant?: string | undefined;
    }, {
        sub: string;
        role: string;
        tenant?: string | undefined;
    }>;
    resource: z.ZodObject<{
        service: z.ZodString;
        path: z.ZodString;
        method: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        service: string;
        method: string;
    }, {
        path: string;
        service: string;
        method: string;
    }>;
    decision: z.ZodEnum<["ALLOW", "DENY"]>;
    reason: z.ZodString;
    policyId: z.ZodOptional<z.ZodString>;
    latencyMs: z.ZodNumber;
    statusCode: z.ZodNumber;
    rateLimit: z.ZodOptional<z.ZodObject<{
        key: z.ZodString;
        limit: z.ZodNumber;
        remaining: z.ZodNumber;
        reset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        key: string;
        limit: number;
        remaining: number;
        reset: number;
    }, {
        key: string;
        limit: number;
        remaining: number;
        reset: number;
    }>>;
    context: z.ZodObject<{
        ip: z.ZodString;
        userAgent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ip: string;
        userAgent?: string | undefined;
    }, {
        ip: string;
        userAgent?: string | undefined;
    }>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    subject: {
        sub: string;
        role: string;
        tenant?: string | undefined;
    };
    resource: {
        path: string;
        service: string;
        method: string;
    };
    context: {
        ip: string;
        userAgent?: string | undefined;
    };
    timestamp: string;
    requestId: string;
    decision: "ALLOW" | "DENY";
    reason: string;
    latencyMs: number;
    statusCode: number;
    rateLimit?: {
        key: string;
        limit: number;
        remaining: number;
        reset: number;
    } | undefined;
    error?: string | undefined;
    id?: string | undefined;
    policyId?: string | undefined;
}, {
    subject: {
        sub: string;
        role: string;
        tenant?: string | undefined;
    };
    resource: {
        path: string;
        service: string;
        method: string;
    };
    context: {
        ip: string;
        userAgent?: string | undefined;
    };
    timestamp: string;
    requestId: string;
    decision: "ALLOW" | "DENY";
    reason: string;
    latencyMs: number;
    statusCode: number;
    rateLimit?: {
        key: string;
        limit: number;
        remaining: number;
        reset: number;
    } | undefined;
    error?: string | undefined;
    id?: string | undefined;
    policyId?: string | undefined;
}>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export declare const RateLimitResponseSchema: z.ZodObject<{
    allowed: z.ZodBoolean;
    remaining: z.ZodNumber;
    resetTime: z.ZodString;
    limit: z.ZodNumber;
    windowSeconds: z.ZodNumber;
    key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    key: string;
    limit: number;
    windowSeconds: number;
    remaining: number;
    allowed: boolean;
    resetTime: string;
}, {
    key: string;
    limit: number;
    windowSeconds: number;
    remaining: number;
    allowed: boolean;
    resetTime: string;
}>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;
export declare const HealthCheckSchema: z.ZodObject<{
    status: z.ZodEnum<["healthy", "unhealthy", "degraded"]>;
    timestamp: z.ZodString;
    uptime: z.ZodNumber;
    services: z.ZodRecord<z.ZodString, z.ZodObject<{
        status: z.ZodEnum<["healthy", "unhealthy", "degraded"]>;
        latency: z.ZodOptional<z.ZodNumber>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "healthy" | "unhealthy" | "degraded";
        error?: string | undefined;
        latency?: number | undefined;
    }, {
        status: "healthy" | "unhealthy" | "degraded";
        error?: string | undefined;
        latency?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "healthy" | "unhealthy" | "degraded";
    timestamp: string;
    uptime: number;
    services: Record<string, {
        status: "healthy" | "unhealthy" | "degraded";
        error?: string | undefined;
        latency?: number | undefined;
    }>;
}, {
    status: "healthy" | "unhealthy" | "degraded";
    timestamp: string;
    uptime: number;
    services: Record<string, {
        status: "healthy" | "unhealthy" | "degraded";
        error?: string | undefined;
        latency?: number | undefined;
    }>;
}>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export declare const MetricsSchema: z.ZodObject<{
    totalRequests: z.ZodNumber;
    allowedRequests: z.ZodNumber;
    deniedRequests: z.ZodNumber;
    rateLimitedRequests: z.ZodNumber;
    averageLatency: z.ZodNumber;
    requestsPerService: z.ZodRecord<z.ZodString, z.ZodNumber>;
    requestsPerMethod: z.ZodRecord<z.ZodString, z.ZodNumber>;
    policiesEvaluated: z.ZodRecord<z.ZodString, z.ZodNumber>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    totalRequests: number;
    allowedRequests: number;
    deniedRequests: number;
    rateLimitedRequests: number;
    averageLatency: number;
    requestsPerService: Record<string, number>;
    requestsPerMethod: Record<string, number>;
    policiesEvaluated: Record<string, number>;
}, {
    timestamp: string;
    totalRequests: number;
    allowedRequests: number;
    deniedRequests: number;
    rateLimitedRequests: number;
    averageLatency: number;
    requestsPerService: Record<string, number>;
    requestsPerMethod: Record<string, number>;
    policiesEvaluated: Record<string, number>;
}>;
export type Metrics = z.infer<typeof MetricsSchema>;
export declare const APIErrorSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        requestId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        requestId: string;
        details?: Record<string, any> | undefined;
    }, {
        code: string;
        message: string;
        requestId: string;
        details?: Record<string, any> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        requestId: string;
        details?: Record<string, any> | undefined;
    };
}, {
    error: {
        code: string;
        message: string;
        requestId: string;
        details?: Record<string, any> | undefined;
    };
}>;
export type APIError = z.infer<typeof APIErrorSchema>;
export interface ProxyRequest {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
    query?: Record<string, any>;
}
export interface ProxyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
}
export interface RouteConfig {
    service: string;
    pathPattern: string;
    targetUrl: string;
    methods: string[];
    stripHeaders?: string[];
}
//# sourceMappingURL=types.d.ts.map