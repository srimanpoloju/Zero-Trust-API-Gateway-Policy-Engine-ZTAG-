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
                       │   (Port 4000)   │    │   (Port 3000)   │
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
- **Rate Limiting**: Redis-based atomic rate limiting with configurable windows
- **Dynamic Request Proxying**: Intelligent routing to downstream services via configurable routes
- **Audit Logging**: Comprehensive logging of all requests and decisions to Postgres
- **Metrics**: Prometheus-compatible metrics endpoint

### Policy Engine (Port 4000)
- **Dynamic Policies**: JSON-based policy rules stored in Postgres
- **Decision Engine**: Evaluates policies based on claims, context, and resources
- **Policy CRUD**: Full lifecycle management of security policies via REST API
- **Audit Query**: Query interface for audit logs via REST API
- **Policy Simulation**: Test policies before applying them via REST API
- **API Documentation**: OpenAPI/Swagger UI at `/documentation`

### Control Plane (Port 3000)
- **Policy Management**: Web UI for creating, editing, and managing policies
- **Audit Dashboard**: Visual interface for viewing audit logs with filters and pagination
- **Policy Simulator**: Interactive tool for testing policy decisions
- **Admin Authentication**: Demo login for admin access
- **Built with Next.js**: Modern React framework for dynamic UIs

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- pnpm (package manager)

### 1. Clone and Setup
```bash
git clone https://github.com/srimanpoloju/Zero-Trust-API-Gateway-Policy-Engine-ZTAG-.git
cd ztag-platform
cp .env.example .env
```
_Note: The `.env` file should contain values for `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, etc. Refer to `infra/docker/control-plane.Dockerfile` or `docker-compose.yml` for default values._

### 2. Start with Docker Compose
```bash
docker compose up --build
```

This will start all services:
- PostgreSQL (Port 5432)
- Redis (Port 6379)
- Policy Engine (Port 4000) - _Note: Updated port from 3002 to 4000 for consistency and to avoid potential conflicts_
- Gateway (Port 3001)
- Control Plane (Port 3000)
- Echo Service (Port 7070)

### 3. Initialize Database
After `docker compose up --build` has started the Postgres container, you can initialize the database:
```bash
pnpm install # Install root dependencies, if not already done
pnpm db:migrate # Applies initial schema and seeds policies
```
_The `db:migrate` script applies the initial schema and also inserts seed policies defined in `apps/policy-engine/src/database/migrations/001_initial.sql`._

### 4. Access Services
- **Gateway**: http://localhost:3001 (API prefix: `/api/*`)
- **Policy Engine**: http://localhost:4000 (API docs at http://localhost:4000/documentation)
- **Control Plane**: http://localhost:3000
- **Echo Service**: http://localhost:7070

## Demo

### 1. Generate Demo Tokens
The `JWT_SECRET` is defined in the `.env` file and used by the Gateway. For this demo, let's assume `JWT_SECRET=super-secret-jwt-key-change-in-production`. The seed policies use `role` and `tenant` claims for authorization.

```bash
# Admin token (full access)
# This token has 'admin' role, 'demo' tenant, and '*' scopes.
ADMIN_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const payload = {
  sub: 'admin-123',
  email: 'admin@ztag.com',
  role: 'admin',
  tenant: 'demo',
  scopes: ['*']
};
console.log(jwt.sign(payload, 'super-secret-jwt-key-change-in-production', { expiresIn: '24h' }));
")
echo "Admin Token: $ADMIN_TOKEN"

# User token (limited access: read-only on echo-service)
# This token has 'user' role, 'demo' tenant, and 'read' scope.
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

# Blocked user token (should be denied everywhere)
# This token has 'blocked' role.
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
Admin users have full access as per seed policy.
```bash
curl -X GET \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/echo/hello
```
Expected: `200 OK` with echo service response (e.g., `{"message":"Echo service response", ...}`)

#### Deny Request (Blocked User)
Blocked users are denied everywhere as per seed policy.
```bash
curl -X GET \
  -H "Authorization: Bearer $BLOCKED_TOKEN" \
  http://localhost:3001/api/echo/hello
```
Expected: `403 Forbidden` with error `{"error":{"code":"ACCESS_DENIED","message":"Denied by policy: Blocked User Deny All",...}}`

#### Allow Specific Request (User)
Users are allowed GET requests to `/api/echo/*` as per seed policy.
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/echo/world
```
Expected: `200 OK` with echo service response.

#### Deny Unauthorized Method (User)
Users are denied POST requests to `/api/echo/*` as per seed policy.
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": "some-data"}' \
  http://localhost:3001/api/echo/submit
```
Expected: `403 Forbidden` with error `{"error":{"code":"ACCESS_DENIED","message":"No policy rule produced an explicit decision",...}}` (because no allow policy matches POST for user role)

#### Rate Limiting (User)
The "User Echo Service Access" policy includes a rate limit of 10 requests per minute.
```bash
# Send 12 requests to trigger rate limit (10/minute limit)
for i in $(seq 1 12); do
  echo "Request $i:"
  curl -s -X GET \
    -H "Authorization: Bearer $USER_TOKEN" \
    -w "Status: %{http_code}\n" \
    http://localhost:3001/api/echo/test
  sleep 0.5 # Wait a bit to avoid hitting Docker network limits, but still hit rate limit
done
```
Expected: First 10 requests return `Status: 200`, subsequent requests return `Status: 429` with error `{"error":{"code":"RATE_LIMITED","message":"Rate limit exceeded",...}}`

### 3. Check Audit Logs (Control Plane UI)
1. Navigate to http://localhost:3000
2. Login with `admin@ztag.com` / `password`.
3. Go to "Audit Logs" to see the logs from the demo requests.

### 4. Manage Policies (Control Plane UI)
1. Navigate to http://localhost:3000
2. Login with `admin@ztag.com` / `password`.
3. Go to the "Policies" section. Fill in the policy form with your desired JSON for match conditions, rules, and obligations. The UI provides live JSON validation.

### 5. Simulate Policy (Control Plane UI)
1. Navigate to http://localhost:3000
2. Login.
3. Go to "Simulator". Paste JWT claims and request details to test policy decisions without sending actual requests through the Gateway.

## Adding a New Service Route

To add a new downstream service and expose it via the ZTAG Gateway:

### 1. Update Gateway `config.ts`
Edit `apps/gateway/src/config.ts` to add a new `RouteConfig` entry to the `routeConfigs` array.

For example, to add a `payments-service` running on `http://payments-service:8080`:

```typescript
// apps/gateway/src/config.ts
export const config = {
  // ... existing config ...
  routeConfigs: [
    // ... existing route configs ...
    {
      service: 'payments-service',
      pathPattern: '/payments/*', // Incoming URL pattern after /api/
      targetUrl: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:8080', // Default local URL
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed HTTP methods
      stripHeaders: ['cookie'] // Headers to remove before forwarding
    }
  ] as RouteConfig[]
} as const;
```
If running with Docker Compose, ensure `docker-compose.yml` includes the `payments-service` and its URL is correctly set (e.g., `PAYMENTS_SERVICE_URL=http://payments-service:8080`).

### 2. Add Policy Rules
Use the Control Plane UI (http://localhost:3000/policies) or the Policy Engine API (http://localhost:4000/documentation) to define policies for your new `payments-service`.

Example policy for allowing `admin` and `payments-user` roles on the `payments-service`:

```json
{
  "name": "Payments Service Access Policy",
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
        "field": "subject.role",
        "operator": "in",
        "value": ["admin", "payments-user"]
      }
    ]
  },
  "obligations": {
    "rateLimit": {
      "key": "subject.sub",
      "limit": 100,
      "windowSeconds": 3600
    }
  }
}
```

## Adding a New Policy

### Using Control Plane UI
1. Navigate to http://localhost:3000
2. Login with `admin@ztag.com` / `password`.
3. Go to the "Policies" section.
4. Click "Create New Policy".
5. Fill in the policy form with your desired JSON for match conditions, rules, and obligations. The UI provides live JSON validation.

### Using Policy Engine API
You can use the Policy Engine's Swagger UI at `http://localhost:4000/documentation` or a direct `curl` command.

Example `curl` to add a policy allowing users with `@company.com` email on a special echo path:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:4000/policies \
  -d 
{
  "name": "Company Email Access",
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
        "field": "subject.email",
        "operator": "contains",
        "value": "@company.com"
      }
    ]
  },
  "obligations": {}
}
```

## Development

### Local Development Setup
```bash
# Install root dependencies for all workspaces
pnpm install

# Start services individually
# Ensure environment variables are set correctly (e.g., in .env file)
pnpm --filter @ztag/policy-engine dev
pnpm --filter @ztag/gateway dev
pnpm --filter @ztag/control-plane dev
pnpm --filter @ztag/echo-service dev
```

### Testing
```bash
# Run all tests across the monorepo
pnpm test

# Run tests for a specific service
pnpm --filter @ztag/policy-engine test
pnpm --filter @ztag/gateway test
pnpm --filter @ztag/echo-service test
pnpm --filter @ztag/shared test
```

### Building
```bash
# Build all packages
pnpm build

# Build specific service
pnpm --filter @ztag/gateway build
pnpm --filter @ztag/policy-engine build
pnpm --filter @ztag/echo-service build
pnpm --filter @ztag/shared build
```

## Configuration

### Environment Variables
The `.env` file at the project root is loaded by `docker-compose.yml` and by individual services during local development (using `dotenv`).

#### General
- `LOG_LEVEL`: Global log level (e.g., `info`, `debug`, `warn`, `error`). Default: `info` (or `debug` for dev).
- `JWT_SECRET`: Comma-separated list of secrets for signing/verifying JWTs (e.g., `secret1,secret2`). The first secret is used for signing.

#### Gateway
- `GATEWAY_PORT`: Port for the Gateway service (default: `3001`).
- `DATABASE_URL`: PostgreSQL connection string for audit logs (e.g., `postgresql://ztag_user:ztag_password@postgres:5432/ztag_db`).
- `REDIS_URL`: Redis connection URL for rate limiting (e.g., `redis://redis:6379`).
- `POLICY_ENGINE_URL`: URL of the Policy Engine service (e.g., `http://policy-engine:4000`).
- `ECHO_SERVICE_URL`: URL of the Echo Service (e.g., `http://echo-service:7070`).

#### Policy Engine
- `POLICY_ENGINE_PORT`: Port for the Policy Engine service (default: `4000`).
- `DATABASE_URL`: PostgreSQL connection string for policies and audit logs (e.g., `postgresql://ztag_user:ztag_password@postgres:5432/ztag_db`).

#### Control Plane
- `CONTROL_PLANE_PORT`: Port for the Control Plane UI (default: `3000`).
- `NEXT_PUBLIC_POLICY_ENGINE_URL`: **(Client-side)** URL of the Policy Engine service, accessible from the browser (e.g., `http://localhost:4000`).

#### Echo Service
- `ECHO_SERVICE_PORT`: Port for the Echo Service (default: `7070`).

## Security Considerations

- **JWT Secrets**: Ensure `JWT_SECRET` values are strong, unique, and stored securely. Consider using a secrets management system in production.
- **HTTPS/TLS**: Deploy with HTTPS/TLS in production for all services.
- **Rate Limiting**: Configure appropriate rate limits to prevent abuse and DDoS attacks.
- **Audit Logs**: Regularly monitor audit logs for suspicious activity and unauthorized access attempts.
- **Policy Reviews**: Conduct regular reviews of security policies to ensure they remain effective and aligned with security requirements.
- **Principle of Least Privilege**: Ensure services only have the minimum necessary permissions (e.g., database user roles).

## Monitoring

### Metrics Endpoint
Access Prometheus metrics for the Gateway at: `http://localhost:3001/metrics`

Key metrics exposed by the Gateway:
- `ztag_gateway_total_requests_total`: Total number of requests handled.
- `ztag_gateway_allowed_requests_total`: Total requests allowed by policies.
- `ztag_gateway_denied_requests_total`: Total requests denied by policies (labeled by denial code).
- `ztag_gateway_rate_limited_requests_total`: Total requests blocked by rate limits.
- `ztag_gateway_request_duration_seconds_bucket/sum/count`: Request latency histogram.

### Health Checks
- **Gateway**: `http://localhost:3001/health`
- **Policy Engine**: `http://localhost:4000/health`
- **Echo Service**: `http://localhost:7070/health`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.