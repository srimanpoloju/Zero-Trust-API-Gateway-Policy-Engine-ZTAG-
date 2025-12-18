# Stage 0: Base dependencies for all apps
FROM node:18-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy root pnpm config and lock file
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./ # Copy if it exists

# Install pnpm root dependencies
RUN pnpm install --frozen-lockfile


# Stage 1: Builder for Production
FROM base AS builder

WORKDIR /app

# Copy all application code
COPY apps/gateway ./apps/gateway
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build gateway application
WORKDIR /app/apps/gateway
RUN pnpm build


# Stage 2: Production Runtime
FROM node:18-alpine AS production

WORKDIR /app

# Copy necessary files from builder stage
COPY --from=builder /app/apps/gateway/package.json ./package.json
COPY --from=builder /app/apps/gateway/dist ./dist
COPY --from=builder /app/apps/gateway/node_modules ./node_modules # Copy only production node_modules

EXPOSE 3001

CMD ["node", "dist/index.js"]


# Stage 3: Development Runtime
FROM base AS development

WORKDIR /app

# Copy source code for development (will be mounted by docker-compose)
COPY apps/gateway ./apps/gateway
COPY packages/shared ./packages/shared

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build

# Set up gateway for dev
WORKDIR /app/apps/gateway

EXPOSE 3001

# Run in development mode with watch
CMD ["pnpm", "dev"]
