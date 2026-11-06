# SkillSwap — Production Scalability Architecture

**Document Version:** 1.0  
**Phase:** Phase 23 (Advanced Security, Scalability & Performance Optimization)  
**Status:** Living Architectural Specification  

---

## 1. Overview & Current Deployment Topology

SkillSwap is architected as a modular, high-performance web platform built on Node.js, Express, React 19, PostgreSQL, and Socket.IO.

```
                              [ Client Browsers & PWA Shell ]
                                             │
                                   HTTPS / WSS (Port 443)
                                             │
                                    ┌────────┴────────┐
                                    │  Reverse Proxy  │ (Nginx / Cloudflare CDN)
                                    │  - TLS Term.    │
                                    │  - Gzip / Brotli│
                                    │  - HTTP/2 / QUIC│
                                    └────────┬────────┘
                                             │
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
             ┌───────────────────────┐               ┌───────────────────────┐
             │ SkillSwap API App #1  │               │ SkillSwap API App #2  │
             │  - Express 5 REST API │               │  - Express 5 REST API │
             │  - Socket.IO Server   │               │  - Socket.IO Server   │
             │  - In-Memory Cache    │               │  - In-Memory Cache    │
             │  - Prisma v8 RC Client│               │  - Prisma v8 RC Client│
             └───────────┬───────────┘               └───────────┬───────────┘
                         │                                       │
                         └───────────────────┬───────────────────┘
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │       PostgreSQL 16+          │
                             │  - Connection Pool (pg-pool)  │
                             │  - B-Tree & Composite Indexes │
                             │  - Foreign Key Constraints    │
                             └───────────────────────────────┘
```

### Current Production Footprint
- **Frontend:** SPA statically built via Vite with route-level code splitting (`React.lazy`), manual vendor chunking (`vendor-react`, `vendor-tanstack`, `vendor-icons`), and service worker caching (`v1-skillswap-static`).
- **Backend:** Node.js (v20+) running Express 5, Socket.IO 4, Argon2, Pino structured logging, and Prisma v8 RC contract ORM.
- **Data Tier:** Single PostgreSQL 16 instance with 133 schema indexes and foreign key relational integrity.

---

## 2. Implemented Features vs. Proposed Infrastructure

| Architectural Layer | Currently Implemented (Production Baseline) | Proposed Future Scaling Trigger |
| :--- | :--- | :--- |
| **API Web Tier** | Stateless single-instance Express 5, graceful shutdown hooks, 30s request timeouts. | Multi-instance clustering behind Nginx or AWS ALB when CPU > 70%. |
| **Real-Time Tier** | In-process Socket.IO engine with presence set, connection rate limiting, and room authorization. | Multi-node Socket.IO with `@socket.io/redis-adapter` when moving to 2+ backend instances. |
| **Caching Layer** | In-memory repository caching for skills catalog (5 min TTL) and community analytics (60s TTL). | Centralized Redis cluster if multiple API nodes require distributed cache invalidation. |
| **Database** | Parameterized Prisma v8 RC queries, indexed foreign keys, connection pooling, and in-DB filtering. | Read replicas for analytics/search queries when concurrent active users exceed 10,000. |
| **File Storage** | Local sandboxed disk storage (`uploads/group-resources/`) with MIME magic-byte validation. | S3 / Cloudflare R2 object storage with pre-signed upload URLs when media volume exceeds 20GB. |
| **Background Jobs** | In-process asynchronous queues (`emailService.enqueue`, `reminder.worker.ts`). | BullMQ or Temporal distributed queue workers backed by Redis when job volume exceeds 1,000/min. |

---

## 3. Database Scaling Strategy

### A. Current Indexing & Query Architecture
- **Total Indexes:** 133 strategic indexes across core domain tables:
  - `User`: Primary `id`, unique `username`, unique `email`, index `[isOnboarded]`, index `[isActive]`, index `[role]`.
  - `UserTeachingSkill` & `UserLearningSkill`: Composite index `[userId, skillId]`, foreign key indexes.
  - `SwapRequest`: Index `[senderId]`, index `[receiverId]`, index `[status]`.
  - `Conversation` & `ConversationParticipant`: Composite index `[conversationId, userId]`, `[userId]`.
  - `Message`: Index `[conversationId, createdAt]`, index `[senderId]`.
  - `Session`: Index `[teacherId, scheduledStart]`, index `[learnerId, scheduledStart]`, index `[status]`.
  - `CommunityPost` & `CommunityComment`: Index `[groupId, createdAt]`, index `[skillId]`, index `[authorId]`.
  - `PushSubscription`: Unique `[userId, endpoint]`, index `[userId]`.

### B. Prevention of N+1 Queries
1. **Reciprocal Match Scoring:** Aggregated via multi-table joins in `discoveryService.getOnboardedContexts()` rather than query-per-candidate.
2. **Conversation & Chat Retrieval:** `conversationRepository.getConversations()` resolves partner identities and latest message in batched queries.
3. **Admin User Pagination:** Database-level `.where({ status / role })` pushes filtering to PostgreSQL before pagination slice.

### C. Scaling Triggers & Actions
- **Trigger 1 (Connection Pool Exhaustion):** If active client connections approach PostgreSQL max (`max_connections = 100`), introduce PgBouncer in transaction-pooling mode.
- **Trigger 2 (Write/Read Ratio Imbalance):** If read IOPS exceeds 80% on read-heavy workflows (Discovery, Matches, Community), provision a PostgreSQL read replica and direct `GET` queries through read-only connection strings.

---

## 4. API Scaling Strategy (Web Tier)

### A. Statelessness
The backend is completely stateless:
- **Authentication:** Signed HS256 JWT tokens transmitted via HTTP-only, secure, SameSite cookies. No session state is held in Node.js process memory.
- **CSRF Defense:** Double-submit cookie with cryptographically secure random token compared using constant-time `crypto.timingSafeEqual`.
- **Request Lifetime:** Every request is bounded by a 30-second timeout middleware (`server/src/middleware/timeout.middleware.ts`), preventing Slowloris socket starvation.

### B. Horizontal Scaling Topology
When running $N$ instances of SkillSwap API behind a load balancer:
1. **HTTP Requests:** Any instance can serve any HTTP REST request seamlessly.
2. **Nginx Upstream Example:**
   ```nginx
   upstream skillswap_api {
       least_conn;
       server 10.0.0.1:5000 max_fails=3 fail_timeout=10s;
       server 10.0.0.2:5000 max_fails=3 fail_timeout=10s;
       keepalive 32;
   }
   ```

---

## 5. Socket.IO Scaling Requirements (Multi-Instance Readiness)

### A. Current Single-Instance Architecture
- Socket connections track authenticated users in a local `Map<number, Set<string>>`.
- Events emitted to `user:${id}`, `conversation:${id}`, and `group:${id}` are dispatched to sockets attached to the current process.

### B. Multi-Instance Transition Plan
When scaling beyond 1 API process, the following two requirements must be satisfied:
1. **Sticky Sessions (For HTTP Long-Polling Fallback):**
   - Socket.IO transports begin with HTTP long-polling before upgrading to WebSockets.
   - Load balancers (Nginx, HAProxy, AWS ALB) must enable cookie-based session stickiness or IP hashing so polling packets reach the initial handshake node.
   ```nginx
   # Nginx Sticky Configuration
   upstream socket_nodes {
       ip_hash;
       server 10.0.0.1:5000;
       server 10.0.0.2:5000;
   }
   ```
2. **Shared Adapter (Pub/Sub):**
   - Install `@socket.io/redis-adapter` and attach to `io`:
   ```ts
   import { createAdapter } from '@socket.io/redis-adapter';
   import { createClient } from 'redis';

   const pubClient = createClient({ url: process.env.REDIS_URL });
   const subClient = pubClient.duplicate();
   await Promise.all([pubClient.connect(), subClient.connect()]);

   io.adapter(createAdapter(pubClient, subClient));
   ```
   - Any message broadcast to `io.to("conversation:123")` on Node 1 is automatically republished through Redis Pub/Sub to Node 2.

---

## 6. Caching Strategy

```
  ┌───────────────────────────────────────────────────────────────┐
  │                   Multi-Tier Caching Flow                     │
  └───────────────────────────────┬───────────────────────────────┘
                                  │
    1. Browser / PWA Cache        ▼
    ┌───────────────────────────────────────────────────────────┐
    │ - Immutable static assets (/assets/*): Cache-First 1 Year │
    │ - Public catalog (/api/skills): Network-First (sw.js)     │
    │ - Community Analytics: Cache-Control: max-age=60          │
    └─────────────────────────────┬─────────────────────────────┘
                                  │
    2. Server In-Memory Cache     ▼
    ┌───────────────────────────────────────────────────────────┐
    │ - Skill Catalog: SkillRepository.cache (5 min TTL)        │
    │ - Community Stats: CommunityService.analyticsCache (60s)  │
    │ - Immediate cache invalidation on write / delete / edit   │
    └─────────────────────────────┬─────────────────────────────┘
                                  │
    3. Database Storage           ▼
    ┌───────────────────────────────────────────────────────────┐
    │ - PostgreSQL shared_buffers: Query cache & buffer pool    │
    │ - B-Tree index scans for fast index-only lookups          │
    └───────────────────────────────────────────────────────────┘
```

### Cache Security Boundary
To protect user privacy and fulfill security compliance:
- **Never Cached:** `/api/auth/*`, `/api/users/me`, `/api/conversations/*`, `/api/sessions/*`, `/api/billing/*`, `/api/admin/*`.
- **Private Cache Clearance:** Service worker cache is purged upon logout via `clearUserCache()`.

---

## 7. File Storage Scaling

- **Current Implementation:** Group study resources are stored in `server/uploads/group-resources/`. Filenames are cryptographically randomized UUIDs, and paths are validated with `path.join` and `path.basename` to prevent path traversal attacks (`../`).
- **File Validation:** Binary magic-byte signatures verify true file formats (PDF `%PDF-`, PNG `\x89PNG`, JPEG `\xff\xd8\xff`, WebP `RIFF...WEBP`), blocking polyglot executable uploads.
- **Scaling to Object Storage (S3 / Cloudflare R2):**
  - When storage exceeds 20GB or multiple container instances are deployed without shared NFS, replace local filesystem writes with pre-signed S3 upload URLs (`s3.getSignedUrlPromise('putObject')`).
  - Downloads are gated by short-lived pre-signed download tokens (5-minute expiry) to preserve group member authorization checks.

---

## 8. Monitoring, Metrics & Observability

- **Structured Logging:** Pino structured JSON logger with correlation `requestId` tracing every request from edge to response.
- **Credential Redaction:** Automatic redaction of passwords, password hashes, credit cards, Stripe secret keys, VAPID private keys, tokens, and cookies.
- **Health Checks:**
  - `GET /api/health`: Validates process uptime, memory RSS/heap, Node version, and PostgreSQL connection responsiveness.
  - Returns `200 OK` (UP) or `503 Service Unavailable` (DOWN).

---

## 9. Scalability Bottlenecks & Operational Triggers

| Resource | Warning Metric | Critical Action |
| :--- | :--- | :--- |
| **Node.js Event Loop** | Delay > 50ms | Increase cluster worker processes or scale container count horizontally. |
| **Memory Utilization** | RSS > 85% of container RAM | Investigate heap retention; adjust `--max-old-space-size`. |
| **Database Pool** | Waiting queries > 10 | Increase pool max size up to 25; introduce PgBouncer if > 100 connections. |
| **Disk Storage** | Disk usage > 75% | Offload `/uploads/` to S3 / Cloudflare R2 object storage. |
| **Socket Connections** | > 1,000 concurrent per node | Add Redis adapter and distribute across 2+ backend pods with sticky sessions. |

