# ==========================================
# SkillSwap Backend Dockerfile (Multi-Stage)
# ==========================================

# Stage 1: Build TypeScript and Prepare Production Node Modules
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies if needed (e.g., for native addons like argon2)
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy source code and Prisma configuration
COPY . .

# Emit Prisma contract and compile TypeScript
RUN npx prisma contract emit && npm run build

# Remove development dependencies to keep production footprint minimal
RUN npm prune --omit=dev

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Add curl/wget for health check probes
RUN apk add --no-cache wget

# Create app directory permissions for non-root user 'node'
RUN chown -R node:node /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy production node_modules from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy package manifests
COPY --from=builder --chown=node:node /app/package*.json ./

# Copy compiled JavaScript distribution
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy Prisma schema and contract assets required by @prisma/orm-postgres runtime
COPY --from=builder --chown=node:node /app/src/prisma/contract.json ./dist/prisma/contract.json
COPY --from=builder --chown=node:node /app/src/prisma/contract.prisma ./dist/prisma/contract.prisma

# Switch to non-root user for security hardening
USER node

# Expose backend port
EXPOSE 5000

# Health check probing the database-aware /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

# Start the Express and Socket.IO server
CMD ["node", "dist/index.js"]

