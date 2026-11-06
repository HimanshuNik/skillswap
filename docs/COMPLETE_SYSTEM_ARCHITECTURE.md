# SkillSwap — Complete System Architecture & Communication Blueprint

**Version:** 1.0.0 (Production Blueprint)  
**Target Environment:** React 19 Frontend + Express 5 Backend + PostgreSQL 15 Database + Prisma v8 RC  
**Author:** Principal Full-Stack Architect & Systems Engineer  
**Evaluation Date:** 2026-11-06  

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier (Web, Mobile & PWA)"]
        Browser["User Browser (Desktop / Mobile)"]
        ReactApp["React 19 SPA (Vite + Tailwind v4)"]
        SW["Service Worker (sw.js & Offline Shell)"]
    end

    subgraph IngressTier["Ingress & Edge Tier"]
        Edge["Vercel Anycast Edge CDN / Nginx Proxy"]
        StaticCDN["Hashed Assets CDN (/assets/*)"]
    end

    subgraph AppTier["Application Tier (Node.js & Express 5)"]
        SecurityMW["Security Pipeline (Helmet, CSRF, RateLimit, Auth)"]
        Router["Express 5 REST API Router"]
        SocketGateway["Socket.IO v4 Real-Time Gateway"]
        CronPool["Background Workers (Reminders & Email Dispatch)"]
    end

    subgraph ServiceTier["Domain Service Tier"]
        AuthSvc["Auth & RBAC Service (Argon2id + JWT)"]
        MatchEngine["5-Factor Reciprocal Matching Engine"]
        MsgSvc["Message Service & Idempotency Cache"]
        SessionSvc["Session Scheduling & Video Orchestrator"]
        CommunitySvc["Community & Study Cohort Service"]
        GamificationSvc["Gamification & Learning Analytics Service"]
        BillingSvc["Monetization & Entitlements Service"]
        AISvc["AI Matching & Roadmap Assistant"]
    end

    subgraph DataTier["Data & Persistence Tier"]
        MemoryCache["In-Memory TTL Caches (Catalog & Analytics)"]
        PrismaRuntime["Prisma v8 RC Contract Runtime (@prisma/orm-postgres)"]
        PostgresDB[("PostgreSQL 15 Managed Relational Database")]
    end

    subgraph ExternalTier["External Integrations Tier"]
        JitsiMeet["Jitsi Meet WebRTC Cloud (meet.jit.si)"]
        WebPush["Web Push Relays (FCM / Mozilla / Apple)"]
        StripeAPI["Stripe Payment API & Webhooks"]
    end

    Browser --> ReactApp
    ReactApp --> SW
    ReactApp -->|Static Asset Requests| Edge
    Edge --> StaticCDN
    ReactApp -->|HTTPS REST & WSS| Edge
    Edge -->|Proxy /api and /socket.io| SecurityMW

    SecurityMW --> Router
    SecurityMW --> SocketGateway

    Router --> ServiceTier
    SocketGateway --> MsgSvc
    SocketGateway --> SessionSvc
    CronPool --> ServiceTier

    ServiceTier --> MemoryCache
    ServiceTier --> PrismaRuntime
    PrismaRuntime --> PostgresDB

    SessionSvc -.->|Provision Meeting Rooms| JitsiMeet
    CronPool -.->|Dispatch Encrypted Alerts| WebPush
    BillingSvc -.->|Verify Webhooks & Checkout| StripeAPI
```

---

## 2. Core Communication Protocols & Subsystems

### 2.1 HTTP Request-Response Communication
- **Protocol:** RESTful JSON over HTTPS (HTTP/2 enabled at edge).
- **Client Transport:** [`client/src/lib/api.ts`](file:///e:/skillswap/client/src/lib/api.ts) wraps standard `fetch` with automatic header injection:
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `x-csrf-token: <token>` (retrieved from `skillswap_csrf` cookie)
  - `credentials: 'include'` (ensuring HTTP-only cookies travel with all requests)
- **Response Normalization:** Server wraps all outcomes in standard JSON envelopes:
  - Success: `{ success: true, data: { ... }, pagination?: { ... } }`
  - Error: `{ success: false, error: { code, message, statusCode, details, timestamp, requestId } }`

```mermaid
sequenceDiagram
    autonumber
    participant UI as React UI (TanStack Query)
    participant Fetch as api.ts Client
    participant Express as Express API Gateway
    participant Svc as Domain Service
    participant Prisma as Prisma Runtime
    participant DB as PostgreSQL 15

    UI->>Fetch: api.get('/api/matches')
    Fetch->>Express: GET /api/matches (with Cookie & CSRF)
    Express->>Express: Authenticate JWT Cookie & Validate CSRF
    Express->>Svc: MatchingService.findReciprocalMatches(userId)
    Svc->>Prisma: db.orm.public.UserTeachingSkill.where(...)
    Prisma->>DB: SQL Query with Index Scans
    DB-->>Prisma: Result Rows
    Prisma-->>Svc: Typed Domain Entities
    Svc->>Svc: Calculate 5-Factor Reciprocal Scores
    Svc-->>Express: Return Ranked Match DTOs
    Express-->>Fetch: HTTP 200 { success: true, data: matches }
    Fetch-->>UI: Cache in QueryClient & Update React State
    UI-->>UI: Re-render Matches View with Emerald Score Badges
```

---

### 2.2 Real-Time WebSocket Communication
- **Protocol:** WebSockets over WSS with HTTP long-polling fallback managed by Engine.IO v4.
- **Handshake Authentication:** During WebSocket connection handshake, Socket.IO extracts and verifies the signed JWT token from the `cookie` header. Unauthenticated socket connections are severed immediately with an `UnauthorizedError`.
- **Room Isolation:** Users join private rooms corresponding to authorized conversations (`conversation:${id}`) and study groups (`group:${id}`).
- **Idempotency & Deduplication:** Sockets accept a client-generated UUID (`clientMessageId`). An in-memory 15-second sliding window deduplicates messages to prevent accidental double-submits.

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Sender)
    participant ClientA as Alice Socket Client
    participant Gateway as Socket.IO Gateway
    participant MsgSvc as Message Service
    participant DB as PostgreSQL 15
    participant ClientB as Bob Socket Client
    actor Bob as Bob (Receiver)

    Alice->>ClientA: Submit message ("Hello Bob!")
    ClientA->>Gateway: emit("message:send", { conversationId: 10, content: "...", clientMessageId: "uuid-1" })
    Gateway->>Gateway: Verify Alice is member of conversation 10
    Gateway->>MsgSvc: Process message
    MsgSvc->>DB: INSERT into Message (conversationId, senderId, content)
    DB-->>MsgSvc: Saved Message Record
    MsgSvc-->>Gateway: Broadcast to room `conversation:10`
    Gateway-->>ClientA: emit("message:delivered", message)
    Gateway-->>ClientB: emit("message:new", message)
    ClientB-->>Bob: Live render message in chat & play sound
```

---

### 2.3 Authentication Cookies & Token Architecture
- **Stateless JWT Tokens:** Authentication state is encapsulated inside a cryptographically signed JSON Web Token (JWT).
- **Algorithm Pinning:** Pinned strictly to `HS256` to prevent algorithm confusion attacks (`none` or asymmetric public key spoofing).
- **Cookie Security Attributes:**
  - `httpOnly: true`: Completely inaccessible to client-side JavaScript (`document.cookie` returns empty), mitigating cross-site scripting (XSS) token theft.
  - `secure: true`: Enforced in production environments so tokens are only transmitted over TLS/HTTPS.
  - `sameSite: 'lax'`: Protects against cross-site request forgery while permitting normal top-level site navigation.
  - `path: '/'`: Scope covers the entire API domain.

---

### 2.4 CSRF Protection Architecture
- **Strategy:** Double-Submit Cookie Pattern with Cryptographic Timing-Attack Defense.
- **Token Generation:** Upon successful authentication, the server generates a cryptographically random token and sets it in a readable cookie named `skillswap_csrf`.
- **Request Enforcement:** Every state-mutating HTTP verb (`POST`, `PUT`, `PATCH`, `DELETE`) must transmit this token in the `x-csrf-token` HTTP header.
- **Constant-Time Verification:** [`csrf.middleware.ts`](file:///e:/skillswap/server/src/middleware/csrf.middleware.ts) compares the header token against the cookie token using `crypto.timingSafeEqual` over fixed-length SHA-256 byte buffers. This eliminates timing side-channel attacks.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as Express Server
    participant CSRFMW as CSRF Middleware
    participant Route as Protected Route

    User->>API: POST /api/auth/login (credentials)
    API-->>User: HTTP 200 (Sets skillswap_token & skillswap_csrf cookies)
    Note over User: Browser reads skillswap_csrf cookie<br/>Stores token in memory

    User->>API: POST /api/swap-requests (Body, x-csrf-token: "xyz")
    API->>CSRFMW: Intercept Request
    CSRFMW->>CSRFMW: Read cookie `skillswap_csrf`<br/>Read header `x-csrf-token`
    CSRFMW->>CSRFMW: Compute SHA-256 hashes of both<br/>crypto.timingSafeEqual(bufA, bufB)
    alt Tokens Match
        CSRFMW->>Route: next() -> Allow mutation
        Route-->>User: HTTP 201 Created
    else Tokens Mismatch or Missing
        CSRFMW-->>User: HTTP 403 Forbidden (CSRF token invalid)
    end
```

---

### 2.5 Database Query Lifecycle & Prisma v8 RC Contract
1. **Contract Definition:** All schemas, models, relations, and indexes are defined in `server/src/prisma/contract.prisma`.
2. **Artifact Generation:** Running `npx prisma contract emit` compiles the schema into an abstract database AST (`contract.json`) and typed declaration file (`contract.d.ts`).
3. **Runtime Execution:** The database client is instantiated via `postgres<Contract>({ contractJson, url })`.
4. **Namespace Routing:** Queries execute via strongly-typed accessors:
   - ORM Query Lane: `db.orm.public.User.where(...)`
   - SQL Query Lane: `db.sql.public.User`
5. **Contract Verification:** Running `npx prisma db verify` compares the live PostgreSQL database marker (`prisma_contract.marker`) against the code contract, guaranteeing 100% agreement and zero schema drift.

---

### 2.6 External API Integrations

```mermaid
flowchart LR
    subgraph SkillSwap["SkillSwap Backend"]
        SessionSvc["Session Service"]
        AISvc["AI Service"]
        BillingSvc["Billing Service"]
        PushSvc["Push Notification Service"]
    end

    subgraph Jitsi["Jitsi Meet"]
        WebRTC["meet.jit.si WebRTC Cloud"]
    end

    subgraph GoogleAI["Google Gemini"]
        GeminiAPI["Gemini API (Interactions / AI)"]
    end

    subgraph Stripe["Stripe"]
        StripeCheckout["Stripe Checkout & Webhooks"]
    end

    subgraph WebPush["Web Push Relays"]
        PushRelays["Browser Push Services (FCM/Apple)"]
    end

    SessionSvc -->|Provision Tokenized Room| WebRTC
    AISvc -->|HTTPS Query / Semantic Analysis| GeminiAPI
    BillingSvc -->|Create Checkout / Verify HMAC| StripeCheckout
    PushSvc -->|VAPID Signed Payload| PushRelays
```

---

### 2.7 Background Processing & Scheduling Engine
- **Session Reminders:** A background worker loop in [`reminder.worker.ts`](file:///e:/skillswap/server/src/jobs/reminder.worker.ts) executes every 60 seconds, querying for upcoming sessions starting within 15 minutes. It dispatches transactional in-app notifications and Web Push alerts to participants.
- **Email Queue Worker:** Enqueued welcome and transactional notifications in `EmailQueue` are processed asynchronously with exponential retry backoff, ensuring email delivery delays never degrade HTTP response times.

---

### 2.8 File Upload Pipeline & Magic-Byte Validation
- **Storage Strategy:** Multi-user collaborative study group files are stored in `server/uploads/resources/` with randomized UUID filenames to prevent path traversal attacks.
- **Binary Magic-Byte Inspection:** Rather than trusting spoofable client MIME types or file extensions, [`groupResource.service.ts`](file:///e:/skillswap/server/src/services/groupResource.service.ts) inspects the raw file buffer's opening bytes:
  - PDF: `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`)
  - PNG: `\x89PNG` (`0x89 0x50 0x4E 0x47`)
  - JPEG: `\xFF\xD8\xFF`
  - WebP: `RIFF...WEBP`
- **Binary Blocklist:** Executable markers (`MZ` for DOS/Windows PE, `\x7FELF` for Unix) are unconditionally rejected with HTTP 400 Bad Request.

---

### 2.9 Notification Delivery Architecture
- **In-App Real-Time Alerts:** Delivered instantly over active Socket.IO connections (`notification:new`), incrementing client notification bell counters.
- **Database Persistence:** Every alert is recorded in the `Notification` PostgreSQL table (`userId`, `type`, `title`, `message`, `link`, `isRead`).
- **Web Push Fallback:** If the user has subscribed to push notifications, the server signs a payload using RFC 8292 VAPID keys and dispatches it to the browser's native push service.

---

## 3. Detailed Sequence Diagrams

### 3.1 Reciprocal Matching Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice
    participant UI as Matches Page (Matches.tsx)
    participant API as Express /api/matches
    participant MatchEngine as Matching Engine
    participant Repo as User & Skill Repository
    participant DB as PostgreSQL 15

    Alice->>UI: Open /matches
    UI->>API: GET /api/matches
    API->>MatchEngine: findReciprocalMatches(Alice.id)
    MatchEngine->>Repo: Get Alice's Teaching & Learning Skills
    Repo->>DB: Query UserTeachingSkill & UserLearningSkill
    DB-->>Repo: Alice: Teaches React (Adv), Learns UI/UX (Beg)
    MatchEngine->>Repo: Query Potential Candidates
    Repo->>DB: Query Users teaching UI/UX and learning React
    DB-->>Repo: Returns Bob (Teaches UI/UX, Learns React)
    MatchEngine->>MatchEngine: Compute 5-Factor Scoring:
    Note over MatchEngine: 1. Reciprocal Skill Overlap (60%) = 60/60<br/>2. Secondary Skill Affinity (15%) = 10/15<br/>3. Schedule Overlap (15%) = 12/15<br/>4. Verified Reputation (10%) = 9/10<br/>Total Score = 91% Compatibility
    MatchEngine-->>API: Array of Ranked Matches with Explanations
    API-->>UI: HTTP 200 [ { user: Bob, score: 91, reciprocalSkills: [...] } ]
    UI-->>Alice: Render Bob's MatchCard with "91% Compatibility" Badge
```

---

### 3.2 Swap Request Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Alice sends Swap Request (POST /api/swap-requests)
    PENDING --> REJECTED: Bob rejects request (PATCH /:id/reject)
    PENDING --> CANCELLED: Alice cancels proposal (PATCH /:id/cancel)
    PENDING --> ACCEPTED: Bob accepts proposal (PATCH /:id/accept)
    
    state ACCEPTED {
        [*] --> ConversationCreated: Atomic Conversation Created
        ConversationCreated --> Direction1Scheduled: Schedule Alice teaches Bob
        Direction1Scheduled --> Direction2Scheduled: Schedule Bob teaches Alice
        Direction2Scheduled --> Direction1Complete: Alice completes session
        Direction1Complete --> Direction2Complete: Bob completes session
        Direction2Complete --> [*]
    }
    
    ACCEPTED --> COMPLETED: Both directions completed & verified
    REJECTED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

---

### 3.3 Session Scheduling & Embedded Jitsi Video

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Host)
    actor Bob as Bob (Attendee)
    participant UI as Sessions Page (Sessions.tsx)
    participant API as Session API
    participant DB as PostgreSQL 15
    participant Jitsi as Jitsi WebRTC Cloud

    Alice->>UI: Schedule Session (Direction 1: React, Friday 3PM)
    UI->>API: POST /api/sessions (swapRequestId, hostId, startTime, endTime)
    API->>API: Validate no schedule conflict & time is future
    API->>API: Generate unique room hash: "skillswap-sess-9f8a2b..."
    API->>DB: INSERT into Session (status = 'SCHEDULED', jitsiRoom = "...")
    DB-->>API: Created Session Record
    API-->>UI: HTTP 201 Created
    
    Note over Alice, Bob: Session time arrives (Within 15-minute window)
    Alice->>UI: Click "Join Video Call"
    Bob->>UI: Click "Join Video Call"
    UI->>Jitsi: Mount WebRTC iframe (https://meet.jit.si/skillswap-sess-9f8a2b...)
    Jitsi-->>Alice: Stream Bob's audio/video
    Jitsi-->>Bob: Stream Alice's audio/video
    Note over Alice, Bob: 60-Minute Lesson Completed
    Alice->>UI: Click "Mark Session Complete"
    UI->>API: POST /api/sessions/:id/complete
    API->>DB: UPDATE Session SET status = 'COMPLETED', completedAt = NOW()
    API-->>UI: HTTP 200 OK (Awards +40 XP & opens Review Modal)
```

---

### 3.4 Administrator Role-Based Authorization Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Client as Admin Browser
    participant Edge as Edge / Nginx
    participant AuthMW as authenticate()
    participant RoleMW as requireRole(['ADMIN'])
    participant Controller as AdminController
    participant AuditSvc as AdminAuditLog
    participant DB as PostgreSQL 15

    Client->>Edge: POST /api/admin/users/42/suspend (x-csrf-token, Cookie)
    Edge->>AuthMW: Pass request
    AuthMW->>AuthMW: Decrypt & verify JWT cookie
    alt Token Invalid / Expired
        AuthMW-->>Client: HTTP 401 Unauthorized
    else Token Valid
        AuthMW->>RoleMW: req.user = { id: 1, role: 'ADMIN' }
        RoleMW->>RoleMW: Check role in ['ADMIN']
        alt User is Standard USER or MODERATOR
            RoleMW-->>Client: HTTP 403 Forbidden ("Insufficient permissions")
        else User is ADMIN
            RoleMW->>Controller: suspendUser(req, res)
            Controller->>DB: UPDATE User SET isSuspended = true WHERE id = 42
            Controller->>AuditSvc: Record action in AdminAuditLog
            AuditSvc->>DB: INSERT into AdminAuditLog (actorId: 1, action: "USER_SUSPEND", targetId: 42)
            Controller-->>Client: HTTP 200 OK ({ success: true, message: "User suspended" })
        end
    end
```

---

### 3.5 Production Deployment Topology

```mermaid
flowchart TD
    subgraph GlobalUsers["Global Users & Browsers"]
        Desktop["Desktop Browsers (Chrome / Edge / Firefox)"]
        Mobile["Mobile PWA (iOS Safari / Android Chrome)"]
    end

    subgraph EdgeTier["Vercel Global Edge Network"]
        EdgeCDN["Anycast CDN (HTTPS / TLS 1.3 Termination)"]
        SPABuild["Static React 19 SPA Files (/dist)"]
        URLRewriter["Edge URL Rewriter (/api/* & /socket.io/*)"]
    end

    subgraph ComputeTier["Render PaaS / Managed Containers"]
        APIGateway["Express 5 Node.js API (skillswap-api)"]
        SocketEngine["Socket.IO WebSocket Gateway (WSS)"]
        CronDaemon["Session Reminder & Email Daemon"]
    end

    subgraph DatabaseTier["Managed PostgreSQL 15+ Cluster (Neon / Render)"]
        PrimaryDB[("PostgreSQL 15 Primary (Read / Write)")]
        ReplicaDB[("Automated Daily Backups & WAL Snapshots")]
    end

    Desktop -->|HTTPS| EdgeCDN
    Mobile -->|HTTPS| EdgeCDN
    EdgeCDN --> SPABuild
    EdgeCDN -->|Reverse Proxy /api| URLRewriter
    URLRewriter -->|Encrypted TLS| APIGateway
    EdgeCDN -->|WSS Tunnel| SocketEngine

    APIGateway --> PrimaryDB
    CronDaemon --> PrimaryDB
    PrimaryDB -.->|Continuous Archiving| ReplicaDB
```

