# =========================
# Base stage
# =========================
FROM node:18-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml ./

COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/policy-engine/package.json ./apps/policy-engine/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/echo-service/package.json ./apps/echo-service/package.json
COPY apps/control-plane/package.json ./apps/control-plane/package.json

RUN pnpm install

# =========================
# Builder
# =========================
FROM base AS builder
WORKDIR /app

COPY packages/shared ./packages/shared
COPY apps/policy-engine ./apps/policy-engine

WORKDIR /app/packages/shared
RUN pnpm build

WORKDIR /app/apps/policy-engine
RUN pnpm build

# =========================
# Production
# =========================
FROM node:18-alpine AS production
WORKDIR /app

COPY --from=builder /app/apps/policy-engine/dist ./dist
COPY --from=builder /app/apps/policy-engine/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000
CMD ["node", "dist/index.js"]

# =========================
# Development
# =========================
FROM base AS development
WORKDIR /app

COPY packages/shared ./packages/shared
COPY apps/policy-engine ./apps/policy-engine

WORKDIR /app/packages/shared
RUN pnpm build

WORKDIR /app/apps/policy-engine
EXPOSE 4000
CMD ["pnpm", "dev"]
