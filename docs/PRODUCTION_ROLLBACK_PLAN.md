# SkillSwap — Production Rollback & Disaster Recovery Plan

**Version:** 1.0.0 (Production Release)  
**Target Environment:** Production (Vercel + Render / Managed PostgreSQL)  
**Author:** DevOps & Site Reliability Engineering Team  
**Evaluation Date:** 2026-11-06  

---

## 1. Overview & Objective

This document defines the standard operating procedures (SOP) for rolling back application versions, restoring database state, and handling production deployment incidents across the SkillSwap ecosystem.

The primary objective is to minimize Mean Time to Recovery (MTTR) while preserving data integrity and preventing data loss or corruption during deployment regressions or infrastructure failures.

---

## 2. Emergency Escalation & Incident Response Roles

| Role | Responsibility | Primary Contact / Channel |
| :--- | :--- | :--- |
| **Incident Commander (IC)** | Declares rollback, coordinates communication, approves database restores. | Lead Systems Architect / Project Maintainer |
| **Release Lead (DevOps)** | Executes deployment rollback in Vercel / Render / Docker registry. | DevOps Engineer / Release Manager |
| **Database Administrator (DBA)** | Manages PostgreSQL point-in-time recovery, schema marker synchronization, and backup verification. | Database Engineer |
| **Application Security Officer** | Assesses vulnerability impact if rollback is triggered by security regression. | Application Security Specialist |

---

## 3. Application Rollback Procedures

### 3.1 Frontend Rollback (Vercel)

If a critical frontend bug, blank screen, or broken routing is detected post-deployment:

1. **Access Vercel Deployment Dashboard:**
   - Navigate to `Project Settings > Deployments`.
2. **Identify Previous Stable Deployment:**
   - Locate the previous successful production build marked `Ready` prior to the incident commit.
3. **Trigger Instant Rollback:**
   - Click the `...` menu on the target stable deployment and select **Rollback to this Deployment** (or promote to production).
   - Vercel switches edge traffic within **< 15 seconds** without recompilation.
4. **Purge Edge Caches:**
   - Service worker `sw.js` and `manifest.webmanifest` are set to `no-cache, no-store, must-revalidate` in `client/vercel.json`, ensuring connected clients fetch the restored service worker on next refresh.
5. **Verify Routing & Health:**
   - Request `GET /` and `GET /dashboard` from an incognito session.
   - Confirm HTTP 200 and correct bundle hash.

### 3.2 Backend Rollback (Render / PaaS)

If the backend Express API experiences crash loops, unhandled 500 errors, or high request latency (> 2000ms):

1. **Access Render Web Service:**
   - Navigate to `Render Dashboard > skillswap-api > Events / Deploys`.
2. **Revert to Previous Build:**
   - Select the last stable build from the deploy history.
   - Click **Rollback** to re-point the live web service to the previous Docker image / slug.
   - Render will zero-downtime drain connections and switch traffic to the previous healthy container.
3. **Verify API Health & Sockets:**
   - Poll `GET https://<api-domain>/api/health`:
     ```bash
     curl -i https://<api-domain>/api/health
     ```
     Ensure `"status": "healthy"`, `"database": "connected"`, and query latency < 100ms.
   - Verify WebSocket handshake over WSS:
     ```bash
     wscat -c "wss://<api-domain>/socket.io/?EIO=4&transport=websocket"
     ```

### 3.3 Containerized Rollback (Docker Compose / Self-Hosted)

For self-hosted Docker environments:

1. **Identify Previous Image Tag:**
   ```bash
   docker images | grep skillswap
   # Locate previous tag: e.g. skillswap/server:v1.0.0-rc1
   ```
2. **Update Image Tag in Compose:**
   ```bash
   export SERVER_IMAGE_TAG=v1.0.0-rc1
   docker compose up -d --no-deps server
   ```
3. **Verify Health:**
   ```bash
   docker compose ps
   curl -f http://localhost:5000/api/health || exit 1
   ```

---

## 4. Database Backup & Restore Procedures

### 4.1 Automated Daily & Pre-Deployment Backups

Before any production deployment or schema migration:

1. **Execute Manual Logical Backup (`pg_dump`):**
   ```bash
   pg_dump "$DATABASE_URL" \
     --format=custom \
     --no-owner \
     --no-privileges \
     --file="backup_skillswap_pre_deploy_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. **Verify Backup File Integrity:**
   ```bash
   pg_restore --list "backup_skillswap_pre_deploy_*.dump" | head -n 25
   ```
   Ensure file size is non-zero and table definitions (`User`, `Skill`, `SwapRequest`, etc.) are present.

### 4.2 Point-In-Time Database Restore Procedure

> [!CAUTION]
> Restoring a database from backup overwrites current data. Always take a snapshot of the current corrupt state before performing a restore so uncorrupted records can be reconciled later.

1. **Quarantine Incoming Traffic:**
   - Enable Platform Maintenance Mode via admin settings or temporary 503 redirect on reverse proxy to prevent new writes during restoration.
2. **Snapshot Corrupt / Degraded Database:**
   ```bash
   pg_dump "$DATABASE_URL" --format=custom --file="corrupt_state_snapshot.dump"
   ```
3. **Restore from Clean Pre-Deployment Snapshot:**
   ```bash
   pg_restore \
     --dbname="$DATABASE_URL" \
     --clean \
     --if-exists \
     --no-owner \
     --no-privileges \
     "backup_skillswap_pre_deploy_clean.dump"
   ```
4. **Synchronize Prisma v8 RC Contract Marker:**
   ```bash
   # From server directory:
   npx prisma db verify
   # If marker re-signing is required to acknowledge active contract:
   npx prisma db sign
   ```
5. **Re-verify Database Health:**
   ```bash
   npm --prefix server run db:verify
   ```
   Confirm output: `"ok": true`, `"summary": "Database marker and schema match contract"`.
6. **Disable Maintenance Mode:**
   - Re-route edge traffic back to normal application flow.

---

## 5. Migration Failure Handling (Prisma v8 RC)

The SkillSwap persistence tier uses `@prisma/orm-postgres` with contract-based schemas (`contract.prisma`, `contract.json`, `contract.d.ts`).

### Rules for Safe Migration Execution
1. **Never use destructive commands in production:**
   - Do NOT run `DROP TABLE` or `DROP COLUMN` without multi-phase deprecation.
   - Do NOT use `prisma db push` (unsupported in Prisma v8 RC).
2. **If `npx prisma db update` or migration fails mid-execution:**
   - Inspect output diagnostics to determine the failed SQL statement.
   - Check PostgreSQL active locks:
     ```sql
     SELECT pid, age(clock_timestamp(), query_start), usename, query 
     FROM pg_stat_activity 
     WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%';
     ```
   - If an exclusive table lock is blocked, terminate the blocking backend process.
3. **Schema Contract Drift Resolution:**
   - Run `npx prisma db verify` to compare schema against contract.
   - If drift exists, do not force update. Review the diff in `refs/db.json`.
   - Restore schema using `npx prisma contract emit` followed by documented non-destructive updates.

---

## 6. Environment Configuration Rollback

If an incorrect environment variable (e.g., malformed `JWT_SECRET`, invalid `DATABASE_URL`, or missing `CLIENT_URL`) causes service failure:

1. **Retrieve Last Known Good Environment State:**
   - Production secrets are documented in the encrypted DevOps vault.
2. **Update Hosting Configuration:**
   - In Render: `skillswap-api > Environment > Revert / Edit`.
   - In Vercel: `Project Settings > Environment Variables > Redeploy`.
3. **Trigger Immediate Restart:**
   - Save variable edits and trigger manual deploy with existing code build.
4. **Validation:**
   - Verify `server/src/config/env.ts` boots without `process.exit(1)`.

---

## 7. Post-Rollback Verification Checklist

After any rollback is executed, perform the following verification before closing the incident:

- [ ] `GET /api/health` returns HTTP 200 with database connected and latency < 100ms.
- [ ] User authentication succeeds (`POST /api/auth/login`) and sets HTTP-only cookies.
- [ ] Dashboard metrics load (`GET /api/dashboard`).
- [ ] Real-time Socket.IO connection establishes without transport fallback failures.
- [ ] Prisma contract verification (`prisma db verify`) confirms 100% agreement.
- [ ] Post-incident review scheduled within 24 hours to identify root cause.

