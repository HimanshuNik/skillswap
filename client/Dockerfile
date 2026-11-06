# ==========================================
# SkillSwap Frontend Dockerfile (Multi-Stage)
# ==========================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build config
COPY . .

# Build production bundle with Vite
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine AS runner

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check probing Nginx static serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

