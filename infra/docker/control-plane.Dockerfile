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
# --frozen-lockfile is for CI/CD, can be removed for local dev flexibility
RUN pnpm install --frozen-lockfile


# Stage 1: Builder for Production
FROM base AS builder

WORKDIR /app

# Copy all application code
COPY apps/control-plane ./apps/control-plane
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build control-plane application
WORKDIR /app/apps/control-plane
# Next.js build needs NEXT_PUBLIC_ env vars during build time
ARG NEXT_PUBLIC_POLICY_ENGINE_URL
ENV NEXT_PUBLIC_POLICY_ENGINE_URL=${NEXT_PUBLIC_POLICY_ENGINE_URL}
RUN pnpm build # This executes 'next build'


# Stage 2: Production Runtime
FROM node:18-alpine AS production

WORKDIR /app

# Copy only the necessary files for production
COPY --from=builder /app/apps/control-plane/.next ./.next
COPY --from=builder /app/apps/control-plane/public ./public
COPY --from=builder /app/apps/control-plane/package.json ./package.json
COPY --from=builder /app/apps/control-plane/node_modules ./node_modules # Copy built node_modules

EXPOSE 3000

CMD ["pnpm", "start"] # Executes 'next start'


# Stage 3: Development Runtime
FROM base AS development

WORKDIR /app

# Copy source code for development (will be mounted by docker-compose)
COPY apps/control-plane ./apps/control-plane
COPY packages/shared ./packages/shared

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build

# Set up control-plane for dev
WORKDIR /app/apps/control-plane

EXPOSE 3000

# Next.js dev server should be run with watch
CMD ["pnpm", "dev"]
