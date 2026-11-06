# SkillSwap — Complete Technology Stack Analysis & Architectural Rationale

**Project:** SkillSwap (Peer-to-Peer & Collaborative Skill Exchange Platform)  
**Location:** `E:\skillswap`  
**Evaluation Date:** 2026-11-06  
**Auditor Roles:** Principal Full-Stack Architect & Senior Systems Engineer  

---

## 1. Executive Technology Summary

SkillSwap is engineered as a modern, decoupled full-stack platform leveraging a React 19 single-page application frontend, a Node.js/Express 5 application server with real-time WebSockets, and a managed PostgreSQL 15 database running the contract-driven Prisma v8 RC ORM.

---

## 2. Frontend Technologies

### 2.1 React
- **Installed Version:** `^19.2.8` (Verified in `client/package.json`).
- **Why It Is Used:** Provides the declarative, component-driven UI foundation with the new React 19 runtime optimizations, improved suspense transitions, and minimal hydration overhead.
- **Where It Is Used:** Everywhere in `client/src/` — all 17 page views, modal dialogs, forms, and layout shells.
- **Configuration Files:** `client/package.json`, `client/vite.config.ts`, `client/src/main.tsx`.
- **How It Communicates:** Mounts into `#root` in `index.html`; consumes React Context, custom hooks, TanStack Query caches, and Zustand stores; dispatches DOM events.
- **Impact If Removed:** Complete application frontend ceases to render; entire UI layer breaks.

### 2.2 TypeScript (Frontend)
- **Installed Version:** `~6.0.2` (Verified in `client/package.json`).
- **Why It Is Used:** Enforces compile-time type safety across UI components, API response envelopes, user models, swap request states, and props.
- **Where It Is Used:** All `.tsx` and `.ts` files throughout `client/src/`.
- **Configuration Files:** `client/tsconfig.json`, `client/tsconfig.app.json`, `client/tsconfig.node.json`.
- **How It Communicates:** Compiles via Vite Rollup and `tsc -b`, catching contract mismatches between backend DTOs and client components before runtime.
- **Impact If Removed:** Loss of static typing, increased runtime `undefined` errors, loss of autocomplete and IDE refactoring safety.

### 2.3 Vite
- **Installed Version:** `^8.3.0` (Verified in `client/package.json`).
- **Why It Is Used:** Next-generation frontend build tool providing lightning-fast Hot Module Replacement (HMR) in development and Rollup-based production bundling with chunk optimization.
- **Where It Is Used:** Development server (`npm run dev`) and production build pipeline (`npm run build`).
- **Configuration Files:** `client/vite.config.ts`.
- **How It Communicates:** Proxies `/api` and `/socket.io` to Express backend on `localhost:5000` in development; emits static assets to `dist/` with immutable content hashes for production.
- **Impact If Removed:** Inability to compile JSX, bundle modern ESM, or optimize vendor chunks (entry bundle would balloon from 102 kB to monolithic bundle).

### 2.4 Tailwind CSS
- **Installed Version:** `^4.3.3` with `@tailwindcss/vite` (Verified in `client/package.json`).
- **Why It Is Used:** Utility-first CSS framework enabling high-velocity, consistent styling with zero runtime CSS-in-JS overhead; native support for responsive breakpoints and accessible color schemes.
- **Where It Is Used:** All styled HTML elements across all components; configured with Emerald theme (`#10b981`), Slate neutrals, and WCAG AA contrast compliance.
- **Configuration Files:** `client/src/index.css`, `client/vite.config.ts`.
- **How It Communicates:** Scans source files during Vite compilation and injects generated utility rules directly into the compiled `index-*.css` stylesheet.
- **Impact If Removed:** Complete loss of styling, responsive layout collapse, broken visual design across all views.

### 2.5 React Router
- **Installed Version:** `^7.18.4` (Verified in `client/package.json`).
- **Why It Is Used:** Client-side routing engine enabling single-page navigation without full page reloads, supporting lazy-loaded route splitting and route guards.
- **Where It Is Used:** [`client/src/App.tsx`](file:///e:/skillswap/client/src/App.tsx) declaring all 17 public, protected, and admin routes.
- **Configuration Files:** `client/src/App.tsx`.
- **How It Communicates:** Synchronizes browser `window.location` history with React component trees; coordinates with `<ProtectedRoute>` and `<AdminRoute>`.
- **Impact If Removed:** Multi-page navigation impossible; SPA breaks into single static view.

### 2.6 TanStack React Query
- **Installed Version:** `^5.105.1` (Verified in `client/package.json`).
- **Why It Is Used:** Server-state caching, background refetching, mutation lifecycle handling, and automatic query cache invalidation.
- **Where It Is Used:** Data-fetching hooks across Dashboard, Discovery, Matches, Sessions, Community, and Gamification.
- **Configuration Files:** Initialized in `client/src/main.tsx` (`QueryClientProvider`).
- **How It Communicates:** Executes HTTP requests via [`client/src/lib/api.ts`](file:///e:/skillswap/client/src/lib/api.ts); manages memory cache keys (`['matches']`, `['sessions']`, `['dashboard']`).
- **Impact If Removed:** Heavy duplicate network calls, stale UI state, complex manual `useEffect` fetching boilerplate, loss of optimistic UI updates.

### 2.7 Socket.IO Client
- **Installed Version:** `^4.8.4` (Verified in `client/package.json`).
- **Why It Is Used:** Bidirectional, low-latency WebSocket communication for instant 1-on-1 chat, presence tracking, and real-time alerts.
- **Where It Is Used:** Messages page (`Messages.tsx`), chat drawer, notification bell (`NotificationBell.tsx`), and group cohort chat.
- **Configuration Files:** [`client/src/lib/socket.ts`](file:///e:/skillswap/client/src/lib/socket.ts).
- **How It Communicates:** Establishes persistent WebSocket connection to backend gateway, passing auth cookies during handshake.
- **Impact If Removed:** Users must manually refresh browser to see incoming chat messages or notifications; real-time features completely disabled.

### 2.8 UI Component Libraries & Feedback (Lucide & Sonner)
- **Installed Versions:** `lucide-react ^1.66.0`, `sonner ^2.0.8`.
- **Why They Are Used:** Lucide provides accessible SVG icons with tree-shaking; Sonner provides non-blocking, screen-reader accessible toast notifications.
- **Where It Is Used:** Headers, navigation bars, match badges, status indicators, and notification toasts.
- **Configuration Files:** `client/src/App.tsx` (`<Toaster position="top-right" />`).
- **How It Communicates:** Programmatic invocations (`toast.success(...)`, `toast.error(...)`) triggered by React Query mutation callbacks.
- **Impact If Removed:** Broken icons, missing interactive feedback when saving settings or sending swap requests.

### 2.9 Progressive Web App & Service Worker
- **Installed Technology:** Native Web Standards (Service Worker API, Cache Storage API, Web Push API, PushManager).
- **Why It Is Used:** Converts the web app into an installable Progressive Web App with offline fallback shell and native OS push notifications.
- **Where It Is Used:** `client/public/sw.js`, `client/public/manifest.webmanifest`, `client/public/offline.html`, `client/src/hooks/usePWA.ts`.
- **Configuration Files:** `client/public/manifest.webmanifest`, `client/public/sw.js`, `client/vercel.json`.
- **How It Communicates:** Service worker intercepts HTTP fetch requests; caches assets in CacheStorage; receives Web Push events from browser push service.
- **Impact If Removed:** Loss of offline screen, no PWA home screen installation, inability to receive background mobile push alerts.

---

## 3. Backend Technologies

### 3.1 Node.js Runtime
- **Installed Version:** Node.js 22 LTS / v24+ (ESM modules).
- **Why It Is Used:** High-performance, asynchronous non-blocking event-driven JavaScript runtime ideal for I/O-intensive real-time platforms.
- **Where It Is Used:** Executes entire backend application server, background workers, and CLI test harnesses.
- **Configuration Files:** `server/package.json` (`"type": "module"`).
- **How It Communicates:** Executes Express HTTP server, Socket.IO gateway, and Prisma database driver over TCP/IP sockets.
- **Impact If Removed:** Backend code cannot execute.

### 3.2 Express Framework
- **Installed Version:** `^5.2.1` (Verified in `server/package.json`).
- **Why It Is Used:** Fast, minimalist web framework providing robust routing, middleware pipelining, and error handling for REST APIs.
- **Where It Is Used:** Express application factory in `server/src/app.ts`, route mounting, and HTTP request handling.
- **Configuration Files:** `server/src/app.ts`, `server/src/index.ts`.
- **How It Communicates:** Listens on port 5000 (or `PORT` env); routes incoming HTTP requests through security middleware to domain controllers.
- **Impact If Removed:** Loss of all REST API endpoints; client cannot authenticate or load dynamic data.

### 3.3 TypeScript (Backend)
- **Installed Version:** `^7.0.2` (Verified in `server/package.json`).
- **Why It Is Used:** Guarantees strict type safety across services, repositories, database queries, and API response DTOs.
- **Where It Is Used:** All `.ts` files in `server/src/` and `server/tests/`.
- **Configuration Files:** `server/tsconfig.json`.
- **How It Communicates:** Compiles to ES2022 JavaScript via `tsc` for production deployment; runs on-the-fly via `tsx` during development.
- **Impact If Removed:** Loss of type safety, increased risk of database model mismatches and null pointer runtime exceptions.

### 3.4 Socket.IO (Server)
- **Installed Version:** `^4.8.4` (Verified in `server/package.json`).
- **Why It Is Used:** Enterprise WebSocket engine providing room-based broadcasting, connection fallback (long polling), and automatic reconnection.
- **Where It Is Used:** [`server/src/socket/index.ts`](file:///e:/skillswap/server/src/socket/index.ts).
- **Configuration Files:** `server/src/socket/index.ts` mounted onto HTTP server in `server/src/index.ts`.
- **How It Communicates:** Attaches to Node `http.Server`; parses cookies on connection handshake; maintains client socket rooms.
- **Impact If Removed:** Real-time messaging, typing indicators, and instant notification pushes break completely.

### 3.5 JWT Authentication & Cookie Security
- **Installed Libraries:** `jsonwebtoken ^9.0.2`, `cookie-parser ^1.4.7`.
- **Why It Is Used:** Stateless authentication token management with strict algorithm pinning (`HS256`) stored in `httpOnly`, `Secure`, `SameSite=Lax` cookies.
- **Where It Is Used:** `server/src/utils/tokens.ts`, `server/src/middleware/auth.middleware.ts`.
- **Configuration Files:** `server/src/config/env.ts` (`JWT_SECRET`, `COOKIE_SECRET`).
- **How It Communicates:** Issues signed cookie header `Set-Cookie: skillswap_token=...` on login/registration; decodes token on subsequent requests.
- **Impact If Removed:** User sessions cannot persist securely; authentication becomes vulnerable to XSS token theft.

### 3.6 Password Hashing (Argon2id)
- **Installed Library:** `argon2 ^0.44.0` / bcrypt fallback.
- **Why It Is Used:** Winner of the Password Hashing Competition (PHC); memory-hard hashing function providing state-of-the-art resistance to GPU/ASIC brute-force attacks.
- **Where It Is Used:** [`server/src/utils/password.ts`](file:///e:/skillswap/server/src/utils/password.ts) during registration and password change.
- **Configuration Files:** Default Argon2id parameters (memory cost, time cost, parallelism).
- **How It Communicates:** Hashes plaintext passwords before database storage; verifies hashes during login.
- **Impact If Removed:** Plaintext password storage (catastrophic security breach) or weak legacy hashing.

### 3.7 Validation & Schema Enforcement (Zod)
- **Installed Library:** `zod ^4.6.7` (Verified in both packages).
- **Why It Is Used:** TypeScript-first schema declaration and runtime data validation for environment variables and request bodies.
- **Where It Is Used:** `server/src/config/env.ts`, `server/src/validators/auth.validator.ts`, `client/src/lib/validation/`.
- **Configuration Files:** `server/src/config/env.ts`.
- **How It Communicates:** Parses `process.env` at startup; validates `req.body` in route controllers before passing data to services.
- **Impact If Removed:** Malformed payloads cause unhandled runtime crashes or database constraint violations.

### 3.8 Structured Logging (Pino)
- **Installed Library:** `pino ^9.6.0`, `pino-pretty`.
- **Why It Is Used:** Extremely fast, low-overhead JSON structured logger supporting request ID tracing and sensitive field redaction.
- **Where It Is Used:** [`server/src/config/logger.ts`](file:///e:/skillswap/server/src/config/logger.ts).
- **Configuration Files:** `server/src/config/logger.ts`.
- **How It Communicates:** Intercepts HTTP requests and logs status, duration, client IP, and operational error stack traces.
- **Impact If Removed:** Loss of observability; inability to debug production incidents or trace error requests.

### 3.9 Background Workers & Email Dispatch
- **Installed Implementation:** Node.js native timers, `nodemailer`, in-database persistent queues (`EmailQueue`).
- **Why It Is Used:** Asynchronous processing of non-blocking transactional tasks (welcome emails, 24h/1h session reminders, Web Push alerts).
- **Where It Is Used:** [`server/src/jobs/reminder.worker.ts`](file:///e:/skillswap/server/src/jobs/reminder.worker.ts), [`server/src/services/email.service.ts`](file:///e:/skillswap/server/src/services/email.service.ts).
- **Configuration Files:** `server/src/jobs/reminder.worker.ts` initialized in `server/src/index.ts`.
- **How It Communicates:** Periodic polling of database tables (`Session`, `EmailQueue`) on recurring intervals; dispatches alerts without blocking HTTP worker threads.
- **Impact If Removed:** Session reminders would not fire; users would miss scheduled learning calls.

---

## 4. Database Technologies

### 4.1 PostgreSQL 15+
- **Installed Database:** PostgreSQL 15.x / 16.x relational database cluster.
- **Why It Is Used:** Enterprise ACID-compliant relational database providing foreign key constraints, transactional integrity, JSONB support, and rich indexing.
- **Where It Is Used:** Primary persistence tier for all platform entities (Users, Skills, Swaps, Sessions, Messages, Forums, Subscriptions).
- **Configuration Files:** `DATABASE_URL` connection string in `server/.env`.
- **How It Communicates:** Communicates with backend runtime via pooled TCP connection over port 5432 (or SSL/TLS in production).
- **Impact If Removed:** Complete loss of data persistence; application cannot operate.

### 4.2 Prisma v8 RC Contract-Based ORM
- **Installed Packages:** `@prisma/orm-postgres 8.0.0-rc.14`, CLI `prisma 8.0.0-rc.20`.
- **Why It Is Used:** Next-generation contract-driven runtime ORM for PostgreSQL. Eliminates fragile migration state drift by comparing emitted schema contracts against signed database markers.
- **Where It Is Used:** Schema defined in `server/src/prisma/contract.prisma`; runtime client in `server/src/prisma/db.ts`.
- **Configuration Files:** `server/src/prisma/contract.prisma`, `server/src/prisma/contract.json`, `server/src/prisma/contract.d.ts`.
- **How It Communicates:** Generates TypeScript client types from contract; executes queries via namespace accessors (`db.orm.public.*` and `db.sql.public.*`).
- **Impact If Removed:** Complete rewrite of data access layer required; loss of type-safe query generation and contract verification.

---

## 5. External Integrations

### 5.1 Jitsi Meet Video Integration
- **Implementation:** Embedded WebRTC video conferencing via `meet.jit.si` iframe integration.
- **Why It Is Used:** Zero-infrastructure WebRTC video conferencing supporting multi-party audio, video, screen-sharing, and text chat without paid per-minute vendor fees.
- **Where It Is Used:** [`client/src/components/sessions/VideoMeetingModal.tsx`](file:///e:/skillswap/client/src/components/sessions/VideoMeetingModal.tsx).
- **Configuration Files:** `JITSI_DOMAIN="meet.jit.si"`, `JITSI_APP_ID="skillswap-dev"` in `server/.env`.
- **How It Communicates:** Backend provisions cryptographically tokenized room names (`skillswap-session-<hash>`); frontend renders Jitsi iframe with WebRTC permissions.
- **Impact If Removed:** Users cannot conduct real-time face-to-face learning sessions within the platform.

### 5.2 AI Engine Provider
- **Implementation:** Dual provider architecture: `GeminiAIProvider` (Google Gemini API) with automatic `LocalDeterministicAIProvider` fallback.
- **Why It Is Used:** Semantic skill similarity, learning roadmap generation, and conversational learning prep assistance with zero-cost deterministic offline fallback.
- **Where It Is Used:** `server/src/services/ai/ai.service.ts`, `server/src/services/ai/geminiAIProvider.ts`.
- **Configuration Files:** `AI_PROVIDER`, `GEMINI_API_KEY` in `server/.env`.
- **How It Communicates:** REST calls to Google Gemini API when configured; otherwise executes local semantic rule engine.
- **Impact If Removed:** AI roadmaps and recommendations would require hardcoded static templates.

### 5.3 Payment Provider (Stripe Sandbox)
- **Implementation:** Provider abstraction: `StripePaymentProvider` with `MockPaymentProvider` sandbox fallback.
- **Why It Is Used:** SaaS subscription billing and tier quota enforcement (Free vs Pro vs Premium) with full webhook lifecycle support.
- **Where It Is Used:** `server/src/services/billing/billing.service.ts`, `server/src/services/billing/stripePaymentProvider.ts`.
- **Configuration Files:** `BILLING_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in `server/.env`.
- **How It Communicates:** HTTPS REST calls to Stripe API; listens for inbound webhooks with HMAC signature verification.
- **Impact If Removed:** Platform operates strictly on free peer-to-peer exchange with no subscription monetization capability.

### 5.4 Web Push Service (RFC 8292 VAPID)
- **Installed Library:** `web-push ^3.6.7`.
- **Why It Is Used:** Delivers native background push notifications to desktop and mobile browsers even when the SkillSwap tab is closed.
- **Where It Is Used:** [`server/src/services/pushNotification.service.ts`](file:///e:/skillswap/server/src/services/pushNotification.service.ts).
- **Configuration Files:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in `server/.env`.
- **How It Communicates:** Signs push payloads with VAPID EC keys and delivers encrypted notifications via browser push endpoints (FCM, Apple, Mozilla).
- **Impact If Removed:** Users only receive notifications while the website tab is actively open in the foreground.

---

## 6. DevOps & Infrastructure

### 6.1 Docker & Docker Compose
- **Configuration Files:** `server/Dockerfile`, `client/Dockerfile`, `client/nginx.conf`, `docker-compose.yml`.
- **Why It Is Used:** Containerizes frontend (Nginx), backend (Node.js), and database (PostgreSQL 15) into reproducible, isolated production environments.
- **How It Communicates:** Docker network bridge connects services via DNS service names (`postgres:5432`, `server:5000`).
- **Impact If Removed:** Requires manual bare-metal installation and configuration on deployment servers.

### 6.2 GitHub Actions CI/CD
- **Configuration Files:** `.github/workflows/ci.yml`.
- **Why It Is Used:** Automated continuous integration pipeline testing every pull request and commit against a real PostgreSQL container.
- **How It Communicates:** Provisions Ubuntu runner with Postgres service container; executes linting, compilation, Prisma contract verification, and full test suite.
- **Impact If Removed:** Loss of automated quality gate; broken code or schema drift could be pushed undetected.

### 6.3 Cloud Hosting Descriptors (Vercel & Render)
- **Configuration Files:** `client/vercel.json`, `render.yaml`.
- **Why It Is Used:** Infrastructure-as-Code definitions for edge frontend hosting (Vercel) and backend containerized web service hosting (Render).
- **How It Communicates:** Git-triggered automated builds; Vercel edge reverse-proxies `/api` and `/socket.io` to Render backend.
- **Impact If Removed:** Manual cloud dashboard setup required on every deployment.

