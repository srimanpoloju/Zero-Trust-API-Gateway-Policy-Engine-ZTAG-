# Zero-Trust API Gateway & Policy Engine (ZTAG)

ZTAG is a production-grade zero-trust API gateway that sits in front of downstream services and enforces dynamic policies at runtime. It provides JWT authentication, policy evaluation, rate limiting, audit logging, and a control plane UI for policy management.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client/API    │────│     Gateway     │────│  Echo Service   │
│                 │    │   (Port 3001)   │    │   (Port 7070)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Policy Engine   │    │   Control Plane │
                       │   (Port 3002)   │    │   (Port 3000)   │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │    Postgres     │    │     Redis       │
                       │   (Port 5432)   │    │   (Port 6379)   │
                       └─────────────────┘    └─────────────────┘
```

## Features

### Gateway (Port 3001)
- **JWT Authentication**: Validates HS256 tokens and extracts claims
- **Policy Evaluation**: Calls policy engine for access decisions
- **Rate Limiting**: Redis-based rate limiting with configurable windows
- **Request Proxying**: Intelligent routing to downstream services
- **Audit Logging**: Comprehensive logging of all requests and decisions
- **Metrics**: Prometheus-compatible metrics endpoint

### Policy Engine (Port 3002)
- **Dynamic Policies**: JSON-based policy rules stored in Postgres
- **Decision Engine**: Evaluates policies based on claims, context, and resources
- **Policy CRUD**: Full lifecycle management of security policies
- **Audit Query**: Query interface for audit logs
- **Policy Simulation**: Test policies before applying them

### Control Plane (Port 3000)
- **Policy Management**: Web UI for creating, editing, and managing policies
- **Audit Dashboard**: Visual interface for viewing audit logs
- **Policy Simulator**: Interactive tool for testing policy decisions
- **Admin Authentication**: JWT-based admin access

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- pnpm (package manager)

### 1. Clone and Setup
```bash
git clone <repository>
cd ztag-platform
cp .env.example .env
```

### 2. Start with Docker Compose
```bash
docker compose up --build
```

This will start all services:
- PostgreSQL (Port 5432)
- Redis (Port 6379)
- Policy Engine (Port 3002)
- Gateway (Port 3001)
- Control Plane (Port 3000)
- Echo Service (Port 7070)

### 3. Initialize Database
```bash
pnpm install
pnpm db:migrate
pnpm db:seed
```

### 4. Access Services
- **Gateway**: http://localhost:3001
- **Policy Engine**: http://localhost:3002
- **Control Plane**: http://localhost:3000
- **Echo Service**: http://localhost:7070

## Demo

### 1. Generate Demo Tokens

```bash
# Admin token (full access)
ADMIN_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const payload = {
  sub: 'admin-123',
  email: 'admin@ztag.com',
  role: 'admin',
  tenant: 'demo',
  scopes: ['admin', 'read', 'write']
};
console.log(jwt.sign(payload, 'super-secret-jwt-key-change-in-production', { expiresIn: '24h' }));
")
echo "Admin Token: $ADMIN_TOKEN"

# User token (limited access)
USER_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const payload = {
  sub: 'user-456',
  email: 'user@ztag.com',
  role: 'user',
  tenant: 'demo',
  scopes: ['read']
};
console.log(jwt.sign(payload, 'super-secret-jwt-key-change-in-production', { expiresIn: '24h' }));
")
echo "User Token: $USER_TOKEN"

# Blocked user token (should be denied)
BLOCKED_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const payload = {
  sub: 'blocked-789',
  email: 'blocked@ztag.com',
  role: 'blocked',
  tenant: 'demo',
  scopes: []
};
console.log(jwt.sign(payload, 'super-secret-jwt-key-change-in-production', { expiresIn: '24h' }));
")
echo "Blocked Token: $BLOCKED_TOKEN"
```

### 2. Test Policy Decisions

#### Allow Request (Admin)
```bash
curl -X GET \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/echo/test
```
Expected: `200 OK` with echo response

#### Deny Request (Blocked User)
```bash
curl -X GET \
  -H "Authorization: Bearer $BLOCKED_TOKEN" \
  http://localhost:3001/api/echo/test
```
Expected: `403 Forbidden` with access denied message

#### Rate Limiting (User)
```bash
# Send 12 requests to trigger rate limit (10/minute limit)
for i in {1..12}; do
  echo "Request $i:"
  curl -X GET \
    -H "Authorization: Bearer $USER_TOKEN" \
    -w "Status: %{http_code}\n" \
    http://localhost:3001/api/echo/test
  sleep 1
done
```
Expected: First 10 requests succeed, last 2 return `429 Too Many Requests`

## Adding a New Service Route

### 1. Configure Routing in Gateway
Edit `apps/gateway/src/routes/proxy.ts`:

```typescript
if (path.startsWith('/api/payments/')) {
  targetService = 'payments-service';
  targetUrl = 'http://payments-service:8080';
} else if (path.startsWith('/api/echo/')) {
  targetService = 'echo-service';
  targetUrl = 'http://localhost:7070';
}
```

### 2. Add Policy Rules
Use the Control Plane UI or Policy Engine API:

```json
{
  "name": "Payments Service Access",
  "enabled": true,
  "priority": 100,
  "matchConditions": {
    "service": "payments-service",
    "pathPattern": "/*",
    "methods": ["GET", "POST"]
  },
  "rules": {
    "allowIf": [
      {
        "field": "role",
        "operator": "in",
        "value": ["admin", "payments-user"]
      }
    ]
  },
  "obligations": {
    "rateLimit": {
      "limit": 100,
      "windowSeconds": 3600
    }
  }
}
```

## Adding a New Policy

### Using Control Plane UI
1. Navigate to http://localhost:3000
2. Login with admin token
3. Go to "Policies" section
4. Click "Create Policy"
5. Fill in the policy form with JSON

### Using Policy Engine API
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3002/policies \
  -d '{
    "name": "Custom Policy",
    "enabled": true,
    "priority": 50,
    "matchConditions": {
      "service": "echo-service",
      "pathPattern": "/special/*",
      "methods": ["GET"]
    },
    "rules": {
      "allowIf": [
        {
          "field": "email",
          "operator": "contains",
          "value": "@company.com"
        }
      ]
    },
    "obligations": {}
  }'
```

## Development

### Local Development Setup
```bash
# Install dependencies
pnpm install

# Start services individually
cd apps/policy-engine && pnpm dev
cd apps/gateway && pnpm dev
cd apps/control-plane && pnpm dev
cd apps/echo-service && pnpm dev
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific service tests
pnpm --filter @ztag/policy-engine test
pnpm --filter @ztag/gateway test
```

### Building
```bash
# Build all packages
pnpm build

# Build specific service
pnpm --filter @ztag/gateway build
```

## Configuration

### Environment Variables

#### Gateway
- `GATEWAY_PORT`: Gateway port (default: 3001)
- `POLICY_ENGINE_URL`: Policy engine URL
- `ECHO_SERVICE_URL`: Echo service URL
- `JWT_SECRET`: JWT signing secret
- `REDIS_URL`: Redis connection URL

#### Policy Engine
- `POLICY_ENGINE_PORT`: Policy engine port (default: 3002)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT verification secret

#### Control Plane
- `CONTROL_PLANE_PORT`: Control plane port (default: 3000)
- `POLICY_ENGINE_URL`: Policy engine URL
- `JWT_SECRET`: JWT verification secret

## Security Considerations

- JWT secrets should be rotated regularly
- Use strong, unique secrets in production
- Enable HTTPS/TLS in production
- Implement proper rate limiting
- Monitor audit logs for suspicious activity
- Regular security policy reviews

## Monitoring

### Metrics Endpoint
Access Prometheus metrics at: http://localhost:3001/metrics

Key metrics:
- `gateway_requests_total`: Total requests processed
- `gateway_requests_denied_total`: Total denied requests
- `gateway_request_duration_seconds`: Request latency histogram
- `gateway_rate_limits_exceeded_total`: Rate limit violations

### Health Checks
- Gateway: http://localhost:3001/health
- Policy Engine: http://localhost:3002/health
- Echo Service: http://localhost:7070/health

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.
