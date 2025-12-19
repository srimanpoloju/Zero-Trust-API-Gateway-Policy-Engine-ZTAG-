import { z } from 'zod';
// JWT Claims Schema
export const JWTClaimsSchema = z.object({
    sub: z.string(), // User ID
    email: z.string().email(),
    role: z.string(), // Loosened from enum to allow flexibility
    tenant: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    exp: z.number(),
    iat: z.number(),
    iss: z.string().optional()
});
// --- Policy Schemas (Corrected) ---
export const PolicyConditionSchema = z.object({
    field: z.string(), // e.g., 'subject.role', 'resource.path', 'context.ip'
    operator: z.enum(['eq', 'neq', 'in', 'not_in', 'contains', 'starts_with', 'ends_with', 'gt', 'lt', 'gte', 'lte']),
    value: z.any()
});
export const PolicyRulesSchema = z.object({
    allowIf: z.array(PolicyConditionSchema).optional(),
    denyIf: z.array(PolicyConditionSchema).optional(),
});
export const PolicyObligationSchema = z.object({
    rateLimit: z.object({
        key: z.string(), // Can use claim attributes like 'subject.sub' or 'context.ip'
        limit: z.number(),
        windowSeconds: z.number()
    }).optional(),
    requireMFA: z.boolean().optional(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional()
});
export const PolicyMatchConditionsSchema = z.object({
    service: z.string(),
    pathPattern: z.string(), // e.g., /users/*
    methods: z.array(z.string()).default(['*']), // *, GET, POST, etc.
    tenant: z.string().optional()
});
export const PolicySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    enabled: z.boolean().default(true),
    priority: z.number().int().default(100),
    matchConditions: PolicyMatchConditionsSchema,
    rules: PolicyRulesSchema,
    obligations: PolicyObligationSchema.optional().default({}),
    version: z.number().int().default(1),
    createdAt: z.string(), // Should be a date-time string
    updatedAt: z.string() // Should be a date-time string
});
// Decision Request Schema
export const DecisionRequestSchema = z.object({
    subject: JWTClaimsSchema,
    resource: z.object({
        service: z.string(),
        path: z.string(),
        method: z.string()
    }),
    context: z.object({
        ip: z.string(),
        userAgent: z.string().optional(),
        timestamp: z.string(),
        requestId: z.string(),
        tenant: z.string().optional()
    })
});
// Decision Response Schema
export const DecisionResponseSchema = z.object({
    decision: z.enum(['ALLOW', 'DENY']),
    reason: z.string(),
    policyId: z.string().uuid().optional(),
    obligations: PolicyObligationSchema.optional().default({})
});
// Audit Log Schema
export const AuditLogSchema = z.object({
    id: z.string().uuid().optional(),
    requestId: z.string(),
    timestamp: z.string(),
    subject: z.object({
        sub: z.string(),
        role: z.string(),
        tenant: z.string().optional(),
    }),
    resource: z.object({
        service: z.string(),
        path: z.string(),
        method: z.string(),
    }),
    decision: z.enum(['ALLOW', 'DENY']),
    reason: z.string(),
    policyId: z.string().uuid().optional(),
    latencyMs: z.number(),
    statusCode: z.number(),
    rateLimit: z.object({
        key: z.string(),
        limit: z.number(),
        remaining: z.number(),
        reset: z.number(),
    }).optional(),
    context: z.object({
        ip: z.string(),
        userAgent: z.string().optional(),
    }),
    error: z.string().optional()
});
// Rate Limit Response Schema
export const RateLimitResponseSchema = z.object({
    allowed: z.boolean(),
    remaining: z.number(),
    resetTime: z.string(),
    limit: z.number(),
    windowSeconds: z.number(),
    key: z.string()
});
// Health Check Schema
export const HealthCheckSchema = z.object({
    status: z.enum(['healthy', 'unhealthy', 'degraded']),
    timestamp: z.string(),
    uptime: z.number(),
    services: z.record(z.object({
        status: z.enum(['healthy', 'unhealthy', 'degraded']),
        latency: z.number().optional(),
        error: z.string().optional()
    }))
});
// Metrics Schema
export const MetricsSchema = z.object({
    totalRequests: z.number(),
    allowedRequests: z.number(),
    deniedRequests: z.number(),
    rateLimitedRequests: z.number(),
    averageLatency: z.number(),
    requestsPerService: z.record(z.number()),
    requestsPerMethod: z.record(z.number()),
    policiesEvaluated: z.record(z.number()),
    timestamp: z.string()
});
// API Error Schema
export const APIErrorSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.any()).optional(),
        requestId: z.string()
    })
});
//# sourceMappingURL=types.js.map