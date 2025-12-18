# ZTAG Architecture Documentation

## Overview

ZTAG (Zero-Trust API Gateway & Policy Engine) is a production-grade zero-trust security platform that provides dynamic policy enforcement, authentication, and authorization for API traffic. The platform follows a microservices architecture with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client/API Layer                        │
│                    (Mobile, Web, Services)                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Gateway (3001)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ JWT Validation  │  │ Policy Client   │  │ Rate Limiting   │ │
│  │ Service         │  │                 │  │ Service         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Proxy Service   │  │ Audit Logger    │  │ Metrics         │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Policy Engine (4000)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Policy          │  │ Decision        │  │ Policy          │ │
│  │ Repository      │  │ Engine          │  │ API (CRUD)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Control Plane (3000)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Policy CRUD     │  │ Audit Dashboard │  │ Policy          │ │
│  │ Interface       │  │                 │  │ Simulator       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│       Postgres          │  │        Redis            │
│       (5432)            │  │        (6379)           │
│  ┌─────────────────┐    │  │  ┌─────────────────┐    │
│  │ Policies        │    │  │  │ Rate Limits     │    │
│  │ Audits          │    │  │  │ Cache           │    │
│  └─────────────────┘    │  │  └─────────────────┘    │
└─────────────────────────┘  └─────────────────────────┘
```

## Core Components

### 1. Gateway Service (Port 3001)

**Responsibilities:**
- JWT token validation and claim extraction
- Policy decision requests to the Policy Engine
- Rate limiting enforcement using Redis
- Request proxying to downstream services based on configurable routes
- Comprehensive audit logging to PostgreSQL
- Prometheus metrics generation

**Key Features:**
- Dynamic request routing based on `RouteConfig`
- Request context management
- Security header management (stripping sensitive headers)
- Consistent error handling and response formatting
- Performance monitoring and metrics

**Data Flow:**
1. Receive API request
2. Extract and validate JWT token; extract claims
3. Match request to a configured `RouteConfig`
4. Construct and send `DecisionRequest` to Policy Engine
5. If ALLOW from Policy Engine:
    a. Check and enforce rate limits based on obligations (Redis)
    b. Proxy request to downstream service
    c. Record audit log to Postgres
6. If DENY from Policy Engine: Return 403 with reason, record audit log
7. If Rate Limited: Return 429, record audit log
8. Update metrics and return response to client

### 2. Policy Engine (Port 4000)

**Responsibilities:**
- Policy storage and retrieval from PostgreSQL
- Dynamic policy evaluation based on request context and subject claims
- Decision engine with priority-based policy matching and `allowIf`/`denyIf` rules
- Expose API for querying audit logs (Gateway writes audit logs, Policy Engine provides read API)
- Policy simulation and testing via API

**Key Features:**
- JSON-based policy rules stored in `policies` table
- Configurable match conditions (service, path pattern, methods, tenant)
- Flexible rule definitions based on `subject`, `resource`, `context` fields
- Priority-based decision making (first matching policy wins, highest priority first)
- Default deny-all behavior (zero trust)
- Comprehensive audit trail (queryable via API)
- OpenAPI/Swagger documentation at `/documentation`

**Policy Structure Example (JSON stored in DB):**
```json
{
  "id": "uuid",
  "name": "Policy Name",
  "enabled": true,
  "priority": 100,
  "matchConditions": {
    "service": "echo-service",
    "pathPattern": "/api/*",
    "methods": ["GET", "POST"],
    "tenant": "optional-tenant"
  },
  "rules": {
    "allowIf": [
      {
        "field": "subject.role",
        "operator": "eq",
        "value": "admin"
      },
      {
        "field": "subject.scopes",
        "operator": "contains",
        "value": "write"
      }
    ],
    "denyIf": [
      {
        "field": "subject.role",
        "operator": "eq",
        "value": "blocked"
      }
    ]
  },
  "obligations": {
    "rateLimit": {
      "key": "subject.sub",
      "limit": 10,
      "windowSeconds": 60
    },
    "requireMFA": true
  },
  "version": 1,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 3. Control Plane (Port 3000)

**Responsibilities:**
- Web-based policy management interface (CRUD policies)
- Visual audit log dashboard with filtering and pagination
- Interactive policy simulation tool
- Administrative authentication (demo local JWT)

**Key Features:**
- Next.js-based responsive UI with React and Tailwind CSS
- Secure API communication with Policy Engine
- Form-based and JSON editing for policies
- Comprehensive audit log viewer
- Interactive policy testing with simulated requests

### 4. Database Layer

**PostgreSQL:**
- **Policies Table**: Stores policy configurations (`id`, `name`, `enabled`, `priority`, `match_conditions` (JSONB), `rules` (JSONB), `obligations` (JSONB), `version`, `timestamps`).
- **Audits Table**: Stores comprehensive audit logs for all gateway requests (`id`, `request_id`, `timestamp`, `decision`, `reason`, `latency_ms`, `status_code`, `subject` (JSONB), `resource` (JSONB), `context` (JSONB), `rate_limit` (JSONB), `error`).
- Transactional integrity for policy updates
- Indexing for fast policy matching and audit log queries

**Redis:**
- High-performance rate limiting counters
- Atomic rate limiting using Lua scripts
- Cache for frequently accessed data (e.g., policy evaluations, if implemented)
- Distributed rate limiting across gateway instances

## Security Model

### Zero-Trust Principles

1. **Never Trust, Always Verify**: Every request must be authenticated and authorized.
2. **Least Privilege**: Policies grant minimum necessary access.
3. **Assume Breach**: All requests are monitored and logged.
4. **Continuous Verification**: Policies can be updated in real-time and applied dynamically.

### Authentication Flow

```
Client Request with JWT
    │
    ▼
Gateway (JWT Token Validation)
    │
    ▼
Claim Extraction (sub, email, role, tenant, scopes)
    │
    ▼
Policy Engine (Policy Evaluation Request)
    │
    ▼
Decision + Obligations (from Policy Engine)
    │
    ├── ALLOW → Rate Limit Check (Gateway) → Proxy Request (Gateway)
    │
    └── DENY → Return 403 (Gateway)
```

### Policy Evaluation Logic (within Policy Engine)

1.  **Match Selection**: Identify enabled policies whose `matchConditions` (service, path pattern, method, tenant) align with the incoming request.
2.  **Priority Sorting**: Sort matched policies by their `priority` (highest first).
3.  **Iterative Evaluation**: Iterate through sorted policies:
    a.  Evaluate `denyIf` rules first. If all conditions in any `denyIf` rule set are met, the policy explicitly DENIES.
    b.  If no `denyIf` rules are met, evaluate `allowIf` rules. If all conditions in any `allowIf` rule set are met, the policy explicitly ALLOWS.
    c.  If a policy makes a definitive ALLOW or DENY decision, that decision is returned immediately (First Match Wins).
4.  **Default Deny**: If no policies produce an explicit ALLOW decision, and no DENY decision was made, the default behavior is to DENY (zero trust).
5.  **Obligation Assignment**: If a policy ALLOWS, its associated `obligations` are returned with the decision.

## Deployment Architecture

### Development Environment
- All services run locally within Docker containers.
- Docker Compose orchestrates service startup and networking.
- `pnpm dev` commands can be used to run individual services locally for hot-reloading (outside Docker, connected to Dockerized DB/Redis).
- Shared PostgreSQL and Redis instances for all services.

### Production Environment
- Multi-container deployment on a container orchestration platform (e.g., Kubernetes).
- Load balancer in front of Gateway instances for traffic distribution.
- Horizontal scaling of Gateway, Policy Engine, and Echo Service instances.
- Database clustering (e.g., PostgreSQL with replication) for high availability and fault tolerance.
- Redis clustering for distributed rate limiting and caching.

### Infrastructure Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 20GB storage
- Docker & Docker Compose

**Recommended:**
- 4+ CPU cores
- 8GB+ RAM
- 100GB+ SSD storage
- PostgreSQL 15+
- Redis 7+

## Monitoring and Observability

### Metrics (Prometheus Format)
Access Prometheus metrics for the Gateway at: `http://localhost:3001/metrics`

Key metrics exposed by the Gateway:
- `ztag_gateway_total_requests_total`: Total number of requests handled.
- `ztag_gateway_allowed_requests_total`: Total requests allowed by policies.
- `ztag_gateway_denied_requests_total`: Total requests denied by policies (labeled by denial code: `MISSING_TOKEN`, `INVALID_TOKEN`, `ACCESS_DENIED`, `NO_ROUTE`, `INTERNAL_GATEWAY_ERROR`).
- `ztag_gateway_rate_limited_requests_total`: Total requests blocked by rate limits.
- `ztag_gateway_request_duration_seconds_bucket/sum/count`: Histogram of request processing duration in seconds.

### Health Checks
- **Gateway**: `http://localhost:3001/health` (Checks Redis, Postgres, Policy Engine connectivity)
- **Policy Engine**: `http://localhost:4000/health` (Checks Postgres connectivity)
- **Echo Service**: `http://localhost:7070/health`

### Logging
- Structured JSON logging using `pino` for all backend services.
- Configurable log levels.
- Request/response correlation using `X-Request-ID`.
- Security event highlighting.
- Audit trail preservation.

## Scalability Considerations

### Gateway Scaling
- Stateless design (session state managed externally by JWT/Redis) enables horizontal scaling.
- Redis for distributed rate limiting across multiple Gateway instances.
- Load balancers effectively distribute incoming traffic.

### Policy Engine Scaling
- Efficient database queries with appropriate indexes for policies.
- Policies can be cached in memory (if frequently accessed) to reduce database load (future enhancement).
- Read replicas can offload evaluation requests from the primary database instance.

### Database Scaling
- PostgreSQL read replicas for audit log querying and policy evaluation read operations.
- Connection pooling to manage database connections efficiently.
- Query optimization and proper indexing (especially for JSONB fields).
- Partitioning for large audit tables (future consideration).

## Security Best Practices

### Token Security
- JWTs signed with strong HS256 secrets.
- Support for multiple `JWT_SECRET`s for seamless rotation.
- Short expiration times for JWTs (e.g., 24h).
- Secure token transmission enforced via HTTPS (in production deployments).

### API Security
- Comprehensive input validation and sanitization using `zod`.
- Protection against SQL injection through parameterized queries.
- Implementation of security headers (e.g., CORS, Helmet) on services.
- Consistent error handling to avoid leaking sensitive information.

### Infrastructure Security
- Network segmentation for isolation of services (e.g., Docker networks).
- TLS encryption for all inter-service communication and external access (in production).
- Regular application and dependency security updates.
- Strict access control and auditing for all infrastructure components.

## Extensibility

### Adding New Services
1.  Add a new `RouteConfig` entry in `apps/gateway/src/config.ts` mapping an API path pattern to the new downstream service's URL and methods.
2.  Define new policies in the Policy Engine (via UI or API) that grant/deny access to the new service based on business rules.
3.  Deploy the new downstream service.
4.  Update documentation and monitoring as needed.

### Custom Policy Rules
1.  The flexible JSON-based `rules` structure (`allowIf`, `denyIf`) allows for defining a wide array of conditions.
2.  Extend the `PolicyCondition` schema in `@ztag/shared` and the `PolicyService.evaluateCondition` logic in the Policy Engine to support new operators or field types.
3.  Add corresponding UI components to the Control Plane for new rule types (if needed).
4.  Write comprehensive unit and integration tests for new rule logic.

### External Integrations
The modular design allows for integrating with:
-   External authentication providers (e.g., OAuth2/OIDC) by extending the Gateway's `JWTService` or adding new auth middleware.
-   Custom audit sinks (e.g., SIEM systems) by extending the Gateway's `AuditService`.
-   Advanced monitoring systems beyond Prometheus by plugging in additional metric exporters.

## Performance Characteristics

### Gateway Performance
-   Expected latency for policy decisions: < 10ms.
-   99th percentile total response time (excluding downstream service latency): < 100ms.
-   Capable of handling 10,000+ requests per second per instance (hardware dependent).
-   Sub-millisecond rate limiting checks via Redis Lua scripts.

### Policy Engine Performance
-   Expected latency for policy evaluation: < 5ms.
-   Sub-millisecond database queries for policies (with proper indexing).
-   Capable of 50,000+ policy evaluations per second per instance.
-   Efficient priority-based matching algorithm.

### Database Performance
-   < 1ms for policy lookups by ID or match conditions.
-   Efficient audit log queries with appropriate indexing on JSONB fields.
-   Capable of handling 1,000+ concurrent connections.
-   Optimized indexes for common query patterns.

## Disaster Recovery

### Backup Strategy
-   Automated daily PostgreSQL backups with point-in-time recovery capabilities.
-   Redis persistence configured (e.g., RDB snapshots or AOF) for rate limit data.
-   Policy configurations are stored in the database, enabling easy restoration.
-   Version control for all application code and infrastructure configurations.

### High Availability
-   Multiple Gateway and Policy Engine instances deployed behind load balancers.
-   PostgreSQL replication (e.g., primary-standby) for database high availability.
-   Redis clustering for high availability of rate limiting and caching.
-   Automated failover procedures for all critical services.

This architecture provides a robust, scalable, and secure foundation for zero-trust API access control in modern microservices environments.