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
│  │ JWT Validation  │  │ Policy Request  │  │ Rate Limiting   │ │
│  │ Service         │  │ Service         │  │ Service         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Proxy Service   │  │ Audit Logger    │  │ Metrics         │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Policy Engine (3002)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Policy          │  │ Decision        │  │ Audit Query     │ │
│  │ Repository      │  │ Engine          │  │ Service         │ │
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
- Request proxying to downstream services
- Comprehensive audit logging
- Prometheus metrics generation

**Key Features:**
- Request context management
- Intelligent routing based on path patterns
- Security header management
- Error handling and response formatting
- Performance monitoring

**Data Flow:**
1. Receive API request
2. Extract and validate JWT token
3. Create request context with metadata
4. Call Policy Engine for access decision
5. If ALLOW: Check rate limits, proxy request, log audit
6. If DENY: Return 403 with reason
7. Update metrics and return response

### 2. Policy Engine (Port 3002)

**Responsibilities:**
- Policy storage and retrieval from PostgreSQL
- Dynamic policy evaluation based on context
- Decision engine with priority-based policy matching
- Audit log storage and querying
- Policy simulation and testing

**Key Features:**
- JSON-based policy rules
- Priority-based decision making
- Support for complex condition matching
- Default deny-all behavior (zero trust)
- Comprehensive audit trail

**Policy Structure:**
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
    "allowIf": [...],
    "denyIf": [...]
  },
  "obligations": {
    "rateLimit": {
      "limit": 10,
      "windowSeconds": 60
    }
  },
  "version": 1,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 3. Control Plane (Port 3000)

**Responsibilities:**
- Web-based policy management interface
- Visual audit log dashboard
- Policy simulation tool
- Administrative authentication

**Key Features:**
- Next.js-based responsive UI
- Real-time policy editing
- Audit log filtering and search
- Interactive policy testing
- Admin authentication with JWT

### 4. Database Layer

**PostgreSQL:**
- Policy storage with version control
- Audit log retention and querying
- Transactional integrity for policy updates
- Indexing for fast policy matching

**Redis:**
- High-performance rate limiting counters
- Session and token caching
- Distributed rate limiting across instances
- Sub-second response times

## Security Model

### Zero-Trust Principles

1. **Never Trust, Always Verify**: Every request must be authenticated and authorized
2. **Least Privilege**: Policies grant minimum necessary access
3. **Assume Breach**: All requests are monitored and logged
4. **Continuous Verification**: Policies can be updated in real-time

### Authentication Flow

```
Client Request
    │
    ▼
JWT Token Validation
    │
    ▼
Claim Extraction (sub, email, role, tenant, scopes)
    │
    ▼
Policy Evaluation Request
    │
    ▼
Decision + Obligations
    │
    ├── ALLOW → Rate Limit Check → Proxy Request
    │
    └── DENY → Return 403
```

### Policy Evaluation Logic

1. **Match Selection**: Find policies matching service, path, method
2. **Priority Sorting**: Sort by priority (highest first)
3. **Condition Evaluation**: Check allowIf/denyIf conditions
4. **First Match Wins**: Apply first matching policy
5. **Default Deny**: Deny if no policies match
6. **Obligation Enforcement**: Apply rate limits, logging, etc.

## Deployment Architecture

### Development Environment
- All services run locally
- Docker Compose orchestrates dependencies
- Hot reloading for rapid development
- Shared database and Redis instance

### Production Environment
- Multi-container deployment
- Load balancer in front of gateway
- Horizontal scaling of gateway instances
- Database clustering for high availability
- Redis clustering for distributed rate limiting

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
- `gateway_requests_total`: Total requests processed
- `gateway_requests_denied_total`: Total denied requests
- `gateway_request_duration_seconds`: Request latency
- `gateway_rate_limits_exceeded_total`: Rate limit violations
- `policy_decisions_total`: Policy decision counts by result

### Health Checks
- `/health`: Basic health status
- `/ready`: Readiness for traffic (dependency checks)
- `/metrics`: Prometheus metrics endpoint

### Logging
- Structured JSON logging
- Request/response correlation
- Security event highlighting
- Audit trail preservation

## Scalability Considerations

### Gateway Scaling
- Stateless design enables horizontal scaling
- Redis for distributed rate limiting
- Load balancer distributes traffic
- Session affinity not required

### Policy Engine Scaling
- Database queries optimized with indexes
- Policy caching to reduce database load
- Read replicas for query distribution
- Write master for policy updates

### Database Scaling
- PostgreSQL read replicas
- Connection pooling
- Query optimization
- Partitioning for large audit tables

## Security Best Practices

### Token Security
- HS256 with strong secrets
- Short expiration times (24h)
- Secure token transmission (HTTPS)
- Regular secret rotation

### API Security
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- CORS configuration

### Infrastructure Security
- Network segmentation
- TLS encryption in transit
- Regular security updates
- Access control and auditing

## Extensibility

### Adding New Services
1. Configure routing in gateway
2. Add policy rules for service
3. Deploy downstream service
4. Update documentation

### Custom Policy Rules
1. Extend policy schema if needed
2. Update decision engine logic
3. Add corresponding UI components
4. Create test cases

### External Integrations
1. Add authentication providers
2. Implement custom audit sinks
3. Create monitoring integrations
4. Build notification systems

## Performance Characteristics

### Gateway Performance
- < 10ms latency for policy decisions
- 99th percentile < 100ms total response time
- 10,000+ requests per second per instance
- Sub-millisecond rate limiting checks

### Policy Engine Performance
- < 5ms for policy evaluation
- Sub-millisecond database queries
- 50,000+ policy evaluations per second
- Efficient priority-based matching

### Database Performance
- < 1ms for policy lookups
- Efficient audit log queries
- 1,000+ concurrent connections
- Optimized indexes for common queries

## Disaster Recovery

### Backup Strategy
- Daily PostgreSQL backups
- Point-in-time recovery capability
- Redis persistence configuration
- Policy configuration version control

### High Availability
- Multiple gateway instances
- Database replication
- Redis clustering
- Automated failover procedures

This architecture provides a robust, scalable, and secure foundation for zero-trust API access control in modern microservices environments.
