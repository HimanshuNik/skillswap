# SkillSwap — Comprehensive Technical Interview Preparation Guide

**Project:** SkillSwap (Peer-to-Peer & Collaborative Skill Exchange Platform)  
**Role Target:** Full-Stack Engineer / Software Engineer / Systems Architect  
**Author:** Principal Full-Stack Architect & Engineering Interviewer  
**Evaluation Date:** 2026-11-06  

---

## 1. Project Pitches by Duration

### 1.1 The 30-Second Elevator Pitch
> "I built **SkillSwap**, an enterprise-grade full-stack platform that enables peer-to-peer skill exchanges without monetary transactions. Users teach skills they master in exchange for learning skills they need. To ensure fairness and eliminate flaking, I engineered a deterministic 5-factor reciprocal matching algorithm, paired two-direction session scheduling, real-time Socket.IO chat with message deduplication, and embedded Jitsi video meetings. The platform is built with React 19, TypeScript, Express 5, PostgreSQL 15, and the new Prisma v8 RC contract ORM, with 310 automated tests achieving a 100% pass rate."

---

### 1.2 The 2-Minute Project Overview
> "**SkillSwap** is a full-stack web application designed to solve the two biggest problems in peer learning: high financial costs ($50–$150/hr for private tutoring) and the lack of accountability in informal exchange communities.
>
> On the **frontend**, I used React 19 with Vite, Tailwind CSS v4, and TypeScript. I configured Rollup vendor chunk splitting that reduced the main entry bundle by 68.5% down to 102 kB. I used TanStack React Query for server-state caching and Zustand for lightweight auth state.
>
> On the **backend**, I designed a layered Express 5 architecture backed by PostgreSQL 15 and the contract-driven Prisma v8 RC ORM. Real-time messaging and notifications are powered by Socket.IO with authenticated handshakes and private room isolation.
>
> The core algorithmic innovation is our **reciprocal matching engine**: instead of one-way searching, it evaluates complementary skill sets, secondary skill affinities, calendar availability overlap, and verified reputation ratings to calculate a compatibility score from 0 to 100%.
>
> In terms of **security**, I implemented defense-in-depth: JWT tokens stored strictly in HTTP-only, SameSite=Lax, Secure cookies, timing-safe double-submit CSRF protection using `crypto.timingSafeEqual`, binary magic-byte validation on file uploads, and fine-grained IDOR authorization checks. The entire system is validated with 310 automated integration tests covering end-to-end user journeys with zero failures."

---

### 1.3 The 5-Minute Deep-Dive Technical Explanation
> "When building SkillSwap, my goal was to treat it not as a simple CRUD hobby app, but as a production-ready, highly resilient SaaS platform.
>
> **Architecture & State Management:**  
> The system follows a clean separation of concerns. The React 19 frontend communicates with Express 5 REST endpoints and a Socket.IO WebSocket gateway. For data fetching, I avoided complex Redux boilerplate by separating concerns: **ephemeral client state** (like user login status) lives in a tiny Zustand store, while **asynchronous server state** lives in TanStack React Query. This gives us automatic caching, window focus refetching, and optimistic UI updates out of the box.
>
> **Database & Contract-Driven ORM:**  
> For persistence, I chose PostgreSQL 15 with Prisma v8 RC. Unlike traditional Prisma which pushes migrations imperatively, Prisma v8 RC uses a contract-based workflow. The schema is compiled into an abstract database contract (`contract.json`), and at startup or in CI, we run `prisma db verify` to compare the live database marker against the contract. This guarantees 100% agreement and completely eliminates schema drift across local, staging, and production environments.
>
> **Concurrency & Transaction Boundaries:**  
> A critical challenge in exchange platforms is data integrity during multi-step workflows. For instance, when a user completes onboarding, they must save a bio, insert multiple teaching skills, insert learning skills, set weekly availability slots, mark `isOnboarded: true`, and initialize their XP gamification account. If any of those steps fail, the user is left in a corrupted state. I wrapped these operations in atomic PostgreSQL database transactions so that if a single constraint fails, the entire transaction rolls back cleanly.
>
> **Real-Time WebSockets & Idempotency:**  
> In messaging and swap proposals, network instability can cause duplicate socket clicks. To prevent duplicate database rows, I engineered client-generated UUIDs (`clientMessageId`) paired with an in-memory 15-second sliding window deduplication cache on the server. If a duplicate socket event arrives, the server recognizes the UUID and returns the existing message record without touching the database twice. Furthermore, in our automated test harness, I eliminated socket race conditions by requiring room join events to return explicit server acknowledgments before message emissions proceed.
>
> **Security Engineering:**  
> I designed the security model with zero trust assumptions:
> 1. Authentication tokens are never stored in `localStorage` or `sessionStorage` to eliminate XSS token theft. They are issued exclusively in HTTP-only, SameSite=Lax cookies with pinned `HS256` verification.
> 2. For state-changing mutations, we enforce a double-submit CSRF cookie pattern verified in constant time via `crypto.timingSafeEqual` over SHA-256 byte buffers.
> 3. For group resource sharing, we inspect the binary magic numbers of uploaded files (`%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`) to prevent attackers from renaming executable binaries to `.pdf`.
>
> **Testing & Quality Assurance:**  
> The codebase contains 310 automated integration and unit tests across 26 test suites. This includes 8 comprehensive end-to-end user journeys that simulate multi-user flows: registration, onboarding, discovery, reciprocal swap acceptance, real-time chat, paired session scheduling, video meeting provisioning, and double-blind 5-star review submissions. The entire test suite executes in 37 seconds with a 100% pass rate."

---

## 2. Technical Interview Questions & Answers

### Q1: Why did you choose this tech stack (React 19, Express 5, PostgreSQL, Prisma v8 RC)?
**Answer:**  
"I selected technologies that balance developer velocity with production reliability. **React 19** offers improved rendering transitions and modern hook ergonomics. **Express 5** provides native Promise rejection handling in middleware, simplifying asynchronous route handling. **PostgreSQL** was chosen because peer-to-peer exchanges are fundamentally relational—users link to skills, skills link to swaps, swaps link to paired sessions, and sessions link to reviews and XP transactions. **Prisma v8 RC** provides end-to-end type safety from the database schema up to Express controllers, with contract-based verification (`prisma db verify`) that guarantees zero schema drift."

---

### Q2: How does the reciprocal skill matching algorithm work?
**Answer:**  
"Unlike simple one-way search engines, reciprocal matching requires mutual alignment. The algorithm in `MatchingService.findReciprocalMatches` uses a 5-factor scoring formula:
1. **Reciprocal Skill Overlap (60% weight):** Validates that Candidate teaches what User wants to learn AND Candidate wants to learn what User teaches.
2. **Secondary Skill Affinity (15% weight):** Rewards overlap among non-primary secondary interests.
3. **Weekly Schedule Overlap (15% weight):** Calculates intersecting available hours between both users' timezones.
4. **Verified Reputation Rating (10% weight):** Factors in the candidate's average star rating from completed sessions.
If a candidate has zero reciprocal skills, they are filtered out. If they only match in one direction, their score is strictly capped at 30%."

---

### Q3: How did you design the database schema?
**Answer:**  
"The database schema consists of 49 relational models organized around clear bounded contexts:
- **Identity & Profiles:** `User`, `UserNotificationPreference`, `UserAvailability`.
- **Skills Taxonomy:** `Skill`, `UserTeachingSkill`, `UserLearningSkill`, `SkillAlias`.
- **Exchange Lifecycle:** `SwapRequest`, `Session`, `Review`.
- **Real-Time Communication:** `Conversation`, `ConversationParticipant`, `Message`.
- **Community & Collaboration:** `CommunityPost`, `PostComment`, `StudyGroup`, `GroupSession`, `GroupResource`, `GroupTask`.
- **Gamification & Subscriptions:** `UserXP`, `XPTransaction`, `Achievement`, `UserSubscription`, `BillingInvoice`.
To optimize query performance, I placed composite B-tree indexes on high-traffic filter combinations, such as `(userAId, userBId)` on swap requests, `(conversationId, createdAt DESC)` on messages, and `(isActive, isSuspended)` on users."

---

### Q4: How does authentication and session management work?
**Answer:**  
"Authentication uses a stateless JWT model with stateful cookie security. Passwords are encrypted with **Argon2id**. Upon login, the server issues a signed JWT containing the user ID and role, pinned to `HS256`. This token is stored in an `httpOnly`, `SameSite=Lax`, `Secure` cookie named `skillswap_token`. Because it is HTTP-only, client-side scripts cannot access it, preventing XSS token exfiltration. On every request, `auth.middleware.ts` decodes the cookie and attaches `req.user` to the request object. If the account is suspended or deactivated in the database, the middleware immediately rejects the request with HTTP 403."

---

### Q5: How do you protect API routes from CSRF and unauthorized access?
**Answer:**  
"We implement a two-tier defense:
1. **Role-Based Access Control (RBAC):** Middleware `requireRole(['ADMIN', 'MODERATOR'])` guards administrative endpoints, ensuring unprivileged users receive 403 Forbidden.
2. **Double-Submit CSRF Defense:** On login, a random token is placed in cookie `skillswap_csrf`. State-changing HTTP mutations (`POST`, `PUT`, `PATCH`, `DELETE`) must transmit this token in the `x-csrf-token` header. The server verifies both tokens in constant time using `crypto.timingSafeEqual` over SHA-256 byte buffers to prevent timing side-channel attacks."

---

### Q6: How does Socket.IO work in your application?
**Answer:**  
"Socket.IO handles real-time bidirectional communication. When a client connects, the gateway in `server/src/socket/index.ts` parses the handshake `cookie` header and verifies the JWT. Unauthenticated connections are rejected immediately. Authenticated sockets join private rooms based on verified database permissions (e.g. `conversation:${id}` or `group:${id}`). When a user sends a message, it is validated, saved to PostgreSQL, and broadcast exclusively to members of that specific room."

---

### Q7: Why did you choose PostgreSQL over a NoSQL database like MongoDB?
**Answer:**  
"Because SkillSwap's domain model is strictly relational and requires ACID transaction guarantees. In MongoDB, managing paired reciprocal sessions, double-blind reviews, and mutual reputation score updates would require complex application-level two-phase commits. In PostgreSQL, we can use foreign key constraints (`ON DELETE CASCADE` or `RESTRICT`), composite unique indexes, and native transactions (`BEGIN ... COMMIT`) to ensure that a swap acceptance atomically creates a conversation and updates proposal statuses without risk of orphaned documents."

---

### Q8: What is Prisma, and how does the v8 RC contract workflow work?
**Answer:**  
"Prisma is an Object-Relational Mapper that provides type-safe database queries. In this project, we utilize the new **Prisma v8 RC contract-driven runtime** (`@prisma/orm-postgres`). Instead of running loose schema pushes, schema changes are compiled into an abstract contract (`contract.json`) via `npx prisma contract emit`. The live database maintains a cryptographic marker. In our CI/CD pipeline, `npx prisma db verify` checks that the database schema satisfies the contract with 0 drift. Queries are executed through strongly typed ORM accessors like `db.orm.public.User.where(...)`."

---

### Q9: How do you prevent duplicate swap requests or spam proposals?
**Answer:**  
"We enforce three layers of protection:
1. **Database Constraint:** Composite queries check if an active request (`PENDING` or `ACCEPTED`) already exists between User A and User B. If found, `409 Conflict` is returned.
2. **Reciprocal Validation:** Before a request is saved, `SwapRequestService.createRequest` verifies that the sender actually teaches what the receiver wants to learn and vice versa. Non-reciprocal requests are rejected with `400 Bad Request`.
3. **Plan Quotas:** In the Free tier, users are restricted to a maximum of 3 concurrent active proposals, enforced via `403 Forbidden`."

---

### Q10: How do you handle concurrent database operations and race conditions?
**Answer:**  
"We handle concurrency at both the application and database layers:
1. **Database Transactions:** Multi-step mutations (such as onboarding or swap acceptance) execute inside atomic transactions. If any sub-query fails, all modifications roll back.
2. **Composite Unique Constraints:** In reviews, `@@unique([sessionId, reviewerId])` prevents concurrent duplicate review submissions. In voting, `@@unique([userId, postId])` prevents duplicate upvotes.
3. **Socket Event Synchronization:** In Socket.IO tests and client handlers, we await explicit server room join acknowledgments before allowing message emissions."

---

### Q11: How is real-time message idempotency implemented?
**Answer:**  
"When the frontend client emits a message, it attaches a client-generated UUID (`clientMessageId`). In `MessageService.sendMessage`, we maintain an in-memory 15-second sliding window cache. If a network retry or rapid double-click sends the identical `clientMessageId`, the server returns the existing message record immediately without creating a second row in PostgreSQL."

---

### Q12: How do you integrate Jitsi Meet for video calls?
**Answer:**  
"We integrate Jitsi Meet via an embedded WebRTC iframe in `VideoMeetingModal.tsx`. When a session is scheduled, the backend generates a tokenized room name (`skillswap-session-<hash>`). Access is strictly time-bounded: users can only join starting 15 minutes before the scheduled start time until the session ends. Because Jitsi handles WebRTC signaling and media routing in the cloud (`meet.jit.si`), SkillSwap incurs zero media server hosting overhead."

---

### Q13: How do you test the application?
**Answer:**  
"We maintain a comprehensive testing pyramid:
1. **Unit Tests:** Algorithmic verification of the 5-factor reciprocal matching engine and error utilities.
2. **Integration Tests:** 26 test suites verifying database queries, authentication flows, swap lifecycles, real-time Socket.IO chat, community forums, and Stripe webhooks.
3. **End-to-End User Journeys:** Dedicated multi-user flows in `phase24_e2e_comprehensive.test.ts` testing the complete user journey from registration and reciprocal discovery to session completion and 5-star reviews.
4. **Static Quality:** ESLint (`eslint .`), TypeScript strict mode (`tsc -b`), and Prisma contract verification (`prisma db verify`).
All 310 automated tests pass with a 100% pass rate in 37 seconds."

---

### Q14: What were the most challenging engineering problems you solved?
**Answer:**  
"Two standout challenges were:
1. **Socket.IO Room Acknowledgment Race Condition:** In high-speed automated integration tests, sockets were emitting messages before the server had committed the recipient's room membership to memory. I resolved this by re-architecting the socket handlers to return explicit server acknowledgments on room join before message emissions proceed.
2. **File Upload Security in Collaborative Cohorts:** Attackers could upload malicious executables disguised as PDFs. Rather than relying on easily spoofed file extensions or MIME headers, I implemented binary magic-byte inspection in `groupResource.service.ts` checking raw byte signatures (`%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`) and blocking executable markers (`MZ`, `ELF`) unconditionally."

---

### Q15: How would you scale SkillSwap to 100,000 active users?
**Answer:**  
"To scale horizontally:
1. **Socket.IO Redis Adapter:** Replace single-node in-memory socket rooms with `@socket.io/redis-adapter` so WebSocket connections can scale across multiple Node.js container instances behind an Application Load Balancer.
2. **PostgreSQL Read Replicas & Connection Pooling:** Deploy PgBouncer for transaction-level connection pooling, and route read-heavy discovery and profile queries (`GET /api/users`, `GET /api/matches`) to read replicas while directing mutations to the primary database.
3. **External Object Storage:** Move user avatars and shared study group files from local disk to S3/Cloudflare R2 with pre-signed upload URLs and Cloudflare CDN caching.
4. **Redis Caching:** Move in-memory skill catalogs and community analytics TTL caches to an external Redis cluster."

---

### Q16: What improvements or future features would you prioritize next?
**Answer:**  
"My top three priorities would be:
1. **Live Stripe Production Activation:** Transition from sandbox mock mode to live customer billing with automated tax handling and customer portal integration.
2. **Dedicated Self-Hosted Jitsi Infrastructure:** Deploy a self-hosted Jitsi Meet cluster with tokenized JWT authentication for custom branding, breakout rooms, and session recording.
3. **Native Mobile Shells:** Wrap the existing verified PWA in Capacitor or React Native to publish native apps to the Apple App Store and Google Play Store."

