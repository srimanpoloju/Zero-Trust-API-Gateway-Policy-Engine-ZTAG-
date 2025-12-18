FROM node:18-alpine AS base

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY apps/echo-service/package.json ./apps/echo-service/

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/echo-service ./apps/echo-service
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build echo service
WORKDIR /app/apps/echo-service
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built application
COPY --from=base /app/apps/echo-service/dist ./dist
COPY --from=base /app/packages/shared/dist ./node_modules/@ztag/shared
COPY --from=base /app/apps/echo-service/package.json ./
COPY --from=base /app/apps/echo-service/node_modules ./node_modules

EXPOSE 7070

CMD ["node", "dist/index.js"]
