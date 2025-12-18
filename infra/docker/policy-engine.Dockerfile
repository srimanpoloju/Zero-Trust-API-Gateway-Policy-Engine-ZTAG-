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
COPY apps/policy-engine ./apps/policy-engine
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build policy-engine application
WORKDIR /app/apps/policy-engine
RUN pnpm build


# Stage 2: Production Runtime
FROM node:18-alpine AS production

WORKDIR /app

# Copy necessary files from builder stage
COPY --from=builder /app/apps/policy-engine/package.json ./package.json
COPY --from=builder /app/apps/policy-engine/dist ./dist
COPY --from=builder /app/apps/policy-engine/node_modules ./node_modules # Copy only production node_modules

EXPOSE 4000 # Corrected port

CMD ["node", "dist/index.js"]


# Stage 3: Development Runtime
FROM base AS development

WORKDIR /app

# Copy source code for development (will be mounted by docker-compose)
COPY apps/policy-engine ./apps/policy-engine
COPY packages/shared ./packages/shared

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build

# Set up policy-engine for dev
WORKDIR /app/apps/policy-engine

EXPOSE 4000 # Corrected port

# Run in development mode with watch
CMD ["pnpm", "dev"]
