import { z } from 'zod';

// JWT Claims Schema
export const JWTClaimsSchema = z.object({
  sub: z.string(), // User ID
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'blocked']),
  tenant: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  exp: z.number(),
  iat: z.number(),
  iss: z.string().optional()
});

export type JWTClaims = z.infer<typeof JWTClaimsSchema>;

// Policy Schemas
export const PolicyConditionSchema = z.object({
  field: z.string(), // e.g., 'role', 'email', 'scopes'
  operator: z.enum(['equals', 'not_equals', 'in', 'not_in', 'contains', 'exists', 'not_exists']),
  value: z.union([z.string(), z.array(z.string()), z.number(), z.boolean()]).optional()
});

export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;

export const PolicyRuleSchema = z.object({
  conditions: z.array(PolicyConditionSchema).default([]),
  action: z.enum(['allow', 'deny']),
  priority: z.number().default(100)
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicyObligationSchema = z.object({
  rateLimit: z.object({
    key: z.string(),
    limit: z.number(),
    windowSeconds: z.number()
  }).optional(),
  requireMFA: z.boolean().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional()
});

export type PolicyObligation = z.infer<typeof PolicyObligationSchema>;

export const PolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  enabled: z.boolean().default(true),
  priority: z.number().default(100),
  matchConditions: z.object({
    service: z.string(),
    pathPattern: z.string(),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE']),
    tenant: z.string().optional()
  }),
  rules: z.array(PolicyRuleSchema),
  obligations: PolicyObligationSchema.default({}),
  version: z.number().default(1),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Policy = z.infer<typeof PolicySchema>;

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

export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;

// Decision Response Schema
export const DecisionResponseSchema = z.object({
  decision: z.enum(['ALLOW', 'DENY']),
  reason: z.string(),
  policyId: z.string().optional(),
  obligations: PolicyObligationSchema.default({})
});

export type DecisionResponse = z.infer<typeof DecisionResponseSchema>;

// Audit Log Schema
export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string(),
  timestamp: z.string(),
  subjectSub: z.string(),
  role: z.string(),
  tenant: z.string().optional(),
  method: z.string(),
  path: z.string(),
  service: z.string(),
  decision: z.enum(['ALLOW', 'DENY']),
  reason: z.string(),
  policyId: z.string().optional(),
  latencyMs: z.number(),
  statusCode: z.number(),
  rateLimitInfo: z.object({
    key: z.string().optional(),
    limit: z.number().optional(),
    windowSeconds: z.number().optional(),
    remaining: z.number().optional(),
    resetTime: z.string().optional()
  }).optional(),
  ip: z.string(),
  userAgent: z.string().optional(),
  error: z.string().optional()
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// Rate Limit Response Schema
export const RateLimitResponseSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number(),
  resetTime: z.string(),
  limit: z.number(),
  windowSeconds: z.number(),
  key: z.string()
});

export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;

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

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

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

export type Metrics = z.infer<typeof MetricsSchema>;

// API Error Schema
export const APIErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    requestId: z.string()
  })
});

export type APIError = z.infer<typeof APIErrorSchema>;

// Request/Response Types
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

// Route Configuration
export interface RouteConfig {
  service: string;
  pathPattern: string;
  targetUrl: string;
  methods: string[];
  stripHeaders?: string[];
}
