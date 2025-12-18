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
COPY apps/echo-service ./apps/echo-service
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build echo-service application
WORKDIR /app/apps/echo-service
RUN pnpm build


# Stage 2: Production Runtime
FROM node:18-alpine AS production

WORKDIR /app

# Copy necessary files from builder stage
COPY --from=builder /app/apps/echo-service/package.json ./package.json
COPY --from=builder /app/apps/echo-service/dist ./dist
COPY --from=builder /app/apps/echo-service/node_modules ./node_modules # Copy only production node_modules

EXPOSE 7070

CMD ["node", "dist/index.js"]


# Stage 3: Development Runtime
FROM base AS development

WORKDIR /app

# Copy source code for development (will be mounted by docker-compose)
COPY apps/echo-service ./apps/echo-service
COPY packages/shared ./packages/shared

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build

# Set up echo-service for dev
WORKDIR /app/apps/echo-service

EXPOSE 7070

# Run in development mode with watch
CMD ["pnpm", "dev"]
