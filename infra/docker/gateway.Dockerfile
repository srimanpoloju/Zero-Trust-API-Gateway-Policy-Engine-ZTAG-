FROM node:18-alpine AS base

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY apps/gateway/package.json ./apps/gateway/

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/gateway ./apps/gateway
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build gateway
WORKDIR /app/apps/gateway
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built application
COPY --from=base /app/apps/gateway/dist ./dist
COPY --from=base /app/packages/shared/dist ./node_modules/@ztag/shared
COPY --from=base /app/apps/gateway/package.json ./
COPY --from=base /app/apps/gateway/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/index.js"]
