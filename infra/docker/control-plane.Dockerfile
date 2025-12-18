FROM node:18-alpine AS base

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY apps/control-plane/package.json ./apps/control-plane/

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/control-plane ./apps/control-plane
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build control plane
WORKDIR /app/apps/control-plane
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built application
COPY --from=base /app/apps/control-plane/dist ./dist
COPY --from=base /app/packages/shared/dist ./node_modules/@ztag/shared
COPY --from=base /app/apps/control-plane/package.json ./
COPY --from=base /app/apps/control-plane/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/index.js"]
