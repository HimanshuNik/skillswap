# SkillSwap — Production Deployment & Operations Runbook

**Version:** 2.1  
**Target Environments:** Docker Multi-Container, Vercel (Frontend), Render / Railway (Backend), AWS / DigitalOcean (Self-Hosted)

---

## Table of Contents
1. [Production Architecture Overview](#production-architecture-overview)
2. [Prerequisites & Environment Configuration](#prerequisites--environment-configuration)
3. [Deployment Option A: Docker Compose (Unified / Self-Hosted)](#deployment-option-a-docker-compose)
4. [Deployment Option B: Cloud Split (Vercel + Render)](#deployment-option-b-cloud-split)
5. [Database Migrations & Prisma v8 RC Runbook](#database-migrations--prisma-v8-rc-runbook)
6. [Backup & Disaster Recovery Procedures](#backup--disaster-recovery-procedures)
7. [SSL/TLS & Reverse Proxy Configuration](#ssltls--reverse-proxy-configuration)
8. [Monitoring, Health Checks & Logging](#monitoring-health-checks--logging)
9. [Zero-Downtime Updates & Rollback Playbook](#zero-downtime-updates--rollback-playbook)

---

## 1. Production Architecture Overview

The production architecture isolates services across tiers:
- **Client Tier:** Static React 19 SPA bundled by Vite 8, served via Nginx with Brotli/Gzip compression, immutable asset caching, and security headers.
- **Application Tier:** Node.js 22 LTS container running Express 5 and Socket.IO 4 in non-root user mode (`node`), handling REST transactions, WebSocket routing, and real-time state.
- **Data Tier:** PostgreSQL 15+ managed instance with connection pooling, transactional integrity, and Prisma v8 RC contract verification.
- **Video Tier:** Embedded Jitsi Meet room integration (`meet.jit.si`) with time-bounded access windows and participant verification.

---

## 2. Prerequisites & Environment Configuration

### Required Backend Secrets (`server/.env`)
| Variable | Description | Production Requirement |
|---|---|---|
| `NODE_ENV` | Environment mode | Must be `production` |
| `PORT` | Listening port | Default `5000` |
| `DATABASE_URL` | PostgreSQL connection URI | SSL required: `?sslmode=require` |
| `CLIENT_URL` | Frontend origin for CORS | e.g. `https://skillswap.example.com` |
| `JWT_SECRET` | Secret for signing auth tokens | Min 32 cryptographically random chars |
| `COOKIE_SECRET`| Secret for signed cookies | Min 32 cryptographically random chars |
| `LOG_LEVEL` | Pino logging threshold | `info` or `warn` |
| `PAYMENT_PROVIDER` | Subscription payment provider | `stripe` for production, `mock` for dev |
| `STRIPE_SECRET_KEY` | Stripe secret API key | Required if `PAYMENT_PROVIDER=stripe` (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Required for HMAC-SHA256 verification (`whsec_...`) |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for Pro plan | `price_...` |
| `STRIPE_PREMIUM_PRICE_ID`| Stripe Price ID for Premium plan | `price_...` |
| `VAPID_PUBLIC_KEY` | RFC 8292 Web Push public key | Base64url NIST P-256 EC public key |
| `VAPID_PRIVATE_KEY` | RFC 8292 Web Push private key | Base64url NIST P-256 EC private key |
| `VAPID_SUBJECT` | Web Push contact mailto/URI | e.g. `mailto:admin@skillswap.example.com` |

> [!CAUTION]
> The server automatically crashes on startup if `NODE_ENV=production` and `JWT_SECRET` or `COOKIE_SECRET` use default or short values.

---

## 3. Deployment Option A: Docker Compose

Docker Compose coordinates the complete stack (PostgreSQL, Express API, and Nginx SPA) in isolated network containers.

### Quick Start
1. Ensure Docker Engine 24+ and Docker Compose v2+ are installed on the host.
2. Clone repository:
   ```bash
   git clone https://github.com/organization/skillswap.git
   cd skillswap
   ```
3. Create production `.env` from template:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with secure credentials
   ```
4. Build and start containers:
   ```bash
   docker compose up -d --build
   ```
5. Verify container health:
   ```bash
   docker compose ps
   docker compose logs -f api
   ```

Containers run under non-root users and automatically restart `unless-stopped`.

---

## 4. Deployment Option B: Cloud Split (Vercel + Render)

### Frontend on Vercel
1. Import `skillswap` repository into Vercel.
2. Configure **Root Directory** as `client`.
3. Set **Framework Preset** to `Vite`.
4. Ensure `client/vercel.json` is present (handles SPA route rewrites and security headers).
5. Deploy. Custom domain: `https://skillswap.example.com`.

### Backend & Database on Render
1. Create a Blueprint using repository root `render.yaml`.
2. Render provisions:
   - Managed PostgreSQL 15 database (`skillswap-postgres`).
   - Web Service (`skillswap-api`) with root directory `server`.
3. Set environment variable `CORS_ORIGIN=https://skillswap.example.com`.
4. Render automatically executes:
   ```bash
   npm ci && npx prisma contract emit && npm run build
   ```
5. Health checks probe `/api/health` before routing traffic.

---

## 5. Database Migrations & Prisma v8 RC Runbook

SkillSwap utilizes contract-based Prisma v8 RC (`@prisma/orm-postgres`).

### Pre-Deployment Verification
Before deploying new code to production:
```bash
cd server
# 1. Compile schema into contract artifacts
npx prisma contract emit

# 2. Verify database marker against contract
npx prisma db verify
```

### Applying Additive Schema Changes
1. If schema modifications are required, update `server/src/prisma/contract.prisma`.
2. Generate contract assets:
   ```bash
   npx prisma contract emit
   ```
3. Apply changes to staging/production database:
   ```bash
   npx prisma db update
   ```
4. Verify synchronization:
   ```bash
   npx prisma db verify
   ```

> [!IMPORTANT]
> Never run destructive migrations (`db push --force-reset`) against live production data. Prisma v8 RC contract verification guarantees non-destructive additive transitions.

---

## 6. Backup & Disaster Recovery Procedures

### Automated Daily Backup (`pg_dump`)
Configure a daily cron job on the database server or host:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/skillswap"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/skillswap_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
pg_dump -U skillswap -h localhost -d skillswap --clean --if-exists | gzip > "$FILENAME"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete
```

### Full Database Restoration Drill
To restore the database from a backup archive:
```bash
# 1. Stop backend API to halt incoming transactions
docker compose stop api

# 2. Restore PostgreSQL dump
gunzip -c /var/backups/skillswap/skillswap_20261105.sql.gz | psql -U skillswap -d skillswap

# 3. Verify database integrity
cd server && npx prisma db verify

# 4. Restart backend API
docker compose start api
```

---

## 7. SSL/TLS & Reverse Proxy Configuration

When hosting behind Nginx or Cloudflare:
- Terminate SSL with TLS 1.3 only (TLS 1.2 minimum).
- Forward client IP headers:
  ```nginx
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  ```
- Enable WebSocket upgrade for Socket.IO:
  ```nginx
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  ```
- Set `COOKIE_DOMAIN` if API and frontend share a parent domain (e.g. `.skillswap.com`).

---

## 8. Monitoring, Health Checks & Logging

### Health Check Endpoint
`GET /api/health` provides continuous status:
- Verifies active database connection pool.
- Measures query round-trip latency (`latencyMs`).
- Reports server uptime and timestamp.

### Structured Logging
All logs emit structured JSON via Pino:
- Sensitive headers (`Authorization`, `Cookie`, `x-csrf-token`) are redacted.
- Each request receives a unique `requestId` for distributed tracing.
- Forward logs to Datadog, Grafana Loki, or CloudWatch using Docker log drivers.

---

## 9. Zero-Downtime Updates & Rollback Playbook

### Zero-Downtime Deployment
1. Build new Docker images with updated tag (e.g. `skillswap:v2.2`).
2. Run database migration verification (`npx prisma db verify`).
3. Scale new container instances up:
   ```bash
   docker compose up -d --no-deps --build api
   ```
4. Docker waits for health check to succeed before replacing old container.

### Rollback Playbook
If critical defects or latency spikes occur post-deployment:
1. Revert to previous Docker image:
   ```bash
   docker compose down
   docker compose up -d --no-build
   ```
2. If database schema was altered, restore from pre-deployment snapshot:
   ```bash
   gunzip -c /var/backups/skillswap/pre_deploy_backup.sql.gz | psql -U skillswap -d skillswap
   ```
3. Flush client caches by invalidating CDN edge cache.

