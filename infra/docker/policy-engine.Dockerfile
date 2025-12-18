FROM node:18-alpine AS base

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY apps/policy-engine/package.json ./apps/policy-engine/

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/policy-engine ./apps/policy-engine
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build policy engine
WORKDIR /app/apps/policy-engine
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built application
COPY --from=base /app/apps/policy-engine/dist ./dist
COPY --from=base /app/packages/shared/dist ./node_modules/@ztag/shared
COPY --from=base /app/apps/policy-engine/package.json ./
COPY --from=base /app/apps/policy-engine/node_modules ./node_modules

EXPOSE 3002

CMD ["node", "dist/index.js"]
