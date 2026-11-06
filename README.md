# SkillSwap — Peer-to-Peer Skill Exchange Platform

[![CI/CD Pipeline](https://github.com/organization/skillswap/actions/workflows/ci.yml/badge.svg)](https://github.com/organization/skillswap/actions)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0%20%7C%207.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express 5](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prisma v8 RC](https://img.shields.io/badge/Prisma-8.0.0--rc.20-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

SkillSwap is a full-stack, production-ready peer-to-peer skill exchange platform where individuals swap skills, knowledge, and mentorship without monetary transactions.

---

## Key Features

- **Reciprocal Skill Matching Engine:** Two-way algorithmic matching factoring teaching skills, learning goals, schedule overlap, and verified ratings.
- **Strict Reciprocal Validation:** Robust integrity checks ensuring swap requests are only permitted when both users possess complementary skills.
- **Real-Time Messaging & Presence:** Low-latency 1-on-1 chat powered by Socket.IO with typing indicators, online/offline presence, read receipts, and unread counters.
- **Two-Session Reciprocal Scheduling:** Coordinates balanced exchange where each partner teaches a dedicated session, with reschedule proposals and completion confirmation.
- **Embedded Video Meetings:** Jitsi Meet integration with tokenized room names and time-bounded access windows.
- **Verified Reviews & Reputation:** Authentic 1–5 star reviews and written testimonials unlocked only after confirmed session completion.
- **Real-Time Notification Hub:** Dynamic alerts for swap proposals, acceptances, upcoming sessions, and new messages with notification preference toggles.
- **SaaS Platform Administration & Moderation:** Comprehensive Admin Center (`/admin`) featuring 3-tier RBAC (`USER`, `MODERATOR`, `ADMIN`), live PostgreSQL metrics and trends, user lifecycle & suspension management, abuse report queue, skill catalog curation, platform governance settings, transactional email queues with automated 24h/1h session reminder workers, and immutable audit logging.
- **SaaS Monetization & Subscriptions:** Tiered memberships (`FREE`, `PRO`, `PREMIUM`), interactive pricing page (`/pricing`), self-service billing dashboard (`/settings/billing`), Stripe & Sandbox payment provider abstraction, quota enforcement (active swap proposal limits), webhook idempotency, and admin MRR/ARR analytics (`/admin/subscriptions`). Core user safety and harassment reporting can never be paywalled.
- **AI-Powered Matching, Learning & Scheduling:** Semantic skill similarity & alias resolution (exact, alias, related, unrelated), explainable reciprocal recommendations with feedback loop (`HELPFUL`, `NOT_INTERESTED`), personalized 4-stage learning roadmaps (`/learning-roadmap`) with milestone progress tracking (0-100%) and community mentor discovery, smart cross-timezone scheduling with conflict avoidance, guardrailed AI learning assistant, dual provider abstraction (`GeminiAIProvider` + `LocalDeterministicAIProvider`), and token/cost observability.
- **Advanced Learning Analytics & Gamification:** Immutable XP transaction ledger rewarding verified platform actions, 10-tier level progression formula (Level 1: Novice Explorer to Level 10: SkillSwap Legend), curated 10-badge achievement system with public showcase pins, GitHub-style 365-day SVG learning activity heatmap, optional daily active streaks with opt-out toggle, personal goals CRUD with automated progress tracking (+50 XP upon completion), and granular privacy settings.
- **Community Features, Forums & Study Groups:** Scalable discussion forums (`/community`) with skill categories, post types (`DISCUSSION`, `QUESTION`, `RESOURCE`), accepted answers (+25 XP), bounded threaded replies, composite-unique voting, public & private study cohorts (`/community/groups`) with role hierarchy, member queues, search, and abuse moderation.
- **Collaborative Learning, Group Sessions & Shared Resources:** Cohort-based multi-user learning with group video conferences (Jitsi Meet), session capacity and waitlist auto-promotion, host-verified attendance, shared resource library with authorized binary file downloads, collaborative Kanban task board, group learning milestones, real-time cohort chat, and aggregated PostgreSQL learning analytics.
- **Progressive Web App & Push Notifications (Phase 22):** Production PWA with install prompt banner, iOS Safari guidance, custom branded offline application shell (`offline.html`), multi-resolution vector SVG icons (`icon-maskable.svg`), dual-engine network status indicator, native service worker (`sw.js`) with cache versioning and video-call reload protection, RFC 8292 VAPID Web Push, automated 15-minute session reminders, granular event preference toggles, and multi-device subscription manager.
- **Advanced Security, Scalability & Performance (Phase 23):** Cryptographic hardening with pinned JWT `HS256` verification, `crypto.timingSafeEqual` CSRF validation, explicit cookie teardown, reserved username blocklist, binary magic-byte inspection for uploads, 30-second request timeouts, sensitive log redaction, in-memory TTL analytics caching, database-level pagination, graceful Socket.IO server teardown, and 68.5% frontend entry bundle reduction (102 kB vs 325 kB) with 0.0% benchmark error rate (up to 763 RPS).
- **Comprehensive Testing, Accessibility & Production Readiness (Phase 24):** Exhaustive 23-phase audit, 310/310 automated tests passing across 26 test suites (100% pass rate), 8 end-to-end priority user flows, WCAG 2.2 AA compliant accessibility (visible focus ring, skip link, ARIA modal traps, 48px touch targets, reduced-motion), 5-viewport responsive layout testing (320px–1440px), 100% Prisma v8 contract agreement, and production release candidate certification.
- **Production Hardened:** Argon2id password hashing, HTTP-only JWT cookies, Double-Submit CSRF defense, rate limiting, and WCAG 2.2 AA accessibility.


---

## Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript 6
- **Tooling:** Vite 8.3 + Tailwind CSS v4
- **State Management:** Zustand (Session/Auth) + TanStack Query (Server Cache)
- **Routing:** React Router v7 with 100% lazy-loaded routes
- **Icons & UI:** Lucide React + Sonner Toasts + Custom Accessible Primitives

### Backend
- **Runtime:** Node.js 22 LTS (ES Modules)
- **Framework:** Express 5.2
- **Real-Time:** Socket.IO 4.8
- **ORM:** Prisma v8 RC (`@prisma/orm-postgres 8.0.0-rc.14` contract-driven runtime)
- **Security:** Argon2id + JsonWebToken + Cookie-Parser + Express-Rate-Limit
- **Validation & Logging:** Zod + Pino Structured JSON Logger

### Infrastructure & DevOps
- **Database:** PostgreSQL 15+
- **Containerization:** Multi-stage Dockerfiles + Docker Compose orchestration
- **CI/CD:** GitHub Actions (lint, typecheck, build, and automated test container)
- **Cloud Descriptors:** Vercel (`client/vercel.json`) & Render (`render.yaml`)

---

## Architecture Overview

```
                      +-----------------------------+
                      |      React 19 SPA (Nginx)   |
                      +--------------+--------------+
                                     |
               HTTPS REST /api       |      WSS /socket.io
                                     v
                      +-----------------------------+
                      |   Express 5 API & Gateway   |
                      +--------------+--------------+
                                     |
                         Prisma v8 RC Contract
                                     |
                                     v
                      +-----------------------------+
                      |      PostgreSQL 15 DB       |
                      +-----------------------------+
```

For in-depth architectural blueprints, refer to:
- [Complete 25-Phase Architecture & Implementation Audit](docs/COMPLETE_25_PHASE_AUDIT.md)
- [Complete End-to-End User Workflow Guide (34 Steps)](docs/COMPLETE_USER_WORKFLOW.md)
- [Complete Administrator Workflow Guide (23 Steps)](docs/COMPLETE_ADMIN_WORKFLOW.md)
- [Complete Technology Stack Analysis](docs/COMPLETE_TECHNOLOGY_STACK.md)
- [Complete System Architecture & Communication Blueprint](docs/COMPLETE_SYSTEM_ARCHITECTURE.md)
- [Complete Database Schema & Entity Relationship Explanation](docs/COMPLETE_DATABASE_EXPLANATION.md)
- [Complete REST API Reference & Endpoint Inventory](docs/COMPLETE_API_REFERENCE.md)
- [SkillSwap Learning Guide (Beginner to Full-Stack)](docs/SKILLSWAP_COMPLETE_LEARNING_GUIDE.md)
- [Technical Interview Preparation Guide & Q&A](docs/SKILLSWAP_INTERVIEW_PREPARATION.md)
- [SkillSwap Final Master Audit & Release Report](docs/SKILLSWAP_FINAL_MASTER_REPORT.md)
- [Production Rollback & Disaster Recovery Plan](docs/PRODUCTION_ROLLBACK_PLAN.md)
- [Production Readiness Checklist](docs/PRODUCTION_READINESS_CHECKLIST.md)
- [Portfolio Case Study](docs/PORTFOLIO_CASE_STUDY.md)
- [Resume Project Descriptions](docs/RESUME_PROJECT_DESCRIPTION.md)
- [Production Deployment Runbook](docs/DEPLOYMENT.md)

---

## Getting Started

### Prerequisites
- Node.js 22 LTS or higher
- PostgreSQL 15 or higher (running locally on port 5432)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/organization/skillswap.git
cd skillswap
```

### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and set your DATABASE_URL

# Emit Prisma contract and verify schema
npx prisma contract emit
npx prisma db verify

# (Optional) Seed initial skills and mock users
npm run seed

# Start server in development mode
npm run dev
```
The backend API starts on `http://localhost:5000`.

### 3. Frontend Setup
```bash
# In a new terminal window
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The client application starts on `http://localhost:5173`.

---

## Docker & Docker Compose Setup

Run the entire application stack (PostgreSQL, Backend API, Frontend SPA) in isolated Docker containers:

```bash
# In repository root
docker compose up -d --build
```

- Frontend: `http://localhost`
- Backend API: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`
- Database: `localhost:5432`

To shut down:
```bash
docker compose down
```

---

## Environment Variables

### Backend (`server/.env`)
| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment mode (`development` \| `production` \| `test`) | `development` |
| `PORT` | HTTP port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars in production) | Required |
| `COOKIE_SECRET`| Secret key for cookie signing | Required |
| `LOG_LEVEL` | Logging threshold (`info`, `debug`, etc.) | `info` |

### Frontend (`client/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base API path | `/api` |
| `VITE_SOCKET_URL`| Base Socket URL | Same origin |

---

## Automated Testing & Quality

### Run Backend Integration Tests
```bash
cd server
npm test
```
The test suite includes 160 automated tests covering:
- Authentication & CSRF protection
- Onboarding & profile persistence
- Reciprocal matching algorithm
- Swap request state machine & mutual validation
- Socket.IO messaging & room security
- Session scheduling, reschedule negotiations & Jitsi tokens
- Verified reviews, ratings recalculation & notifications
- Security audit (headers, body limits, IDOR, SQL injection)
- Multi-step end-to-end user journeys

### Run Frontend Linting & Typecheck
```bash
cd client
npm run lint     # ESLint: 0 errors, 0 warnings
npm run build    # TypeScript compilation + Vite production build
```

---

## Database Management with Prisma v8 RC

SkillSwap uses Prisma v8 RC contract-driven data access:

```bash
cd server

# Compile contract.prisma into contract.json & contract.d.ts
npx prisma contract emit

# Check database alignment against compiled contract
npx prisma db verify

# Apply additive schema modifications safely
npx prisma db update
```

---

## Project Structure

```
skillswap/
├── .github/workflows/ci.yml       # GitHub Actions CI/CD Pipeline
├── client/                        # React 19 Frontend
│   ├── src/
│   │   ├── components/            # UI, App, Modal & Feature Components
│   │   ├── hooks/                 # TanStack Query & Socket Hooks
│   │   ├── lib/                   # API Client & Utilities
│   │   ├── pages/                 # Lazy-loaded Application Views
│   │   ├── store/                 # Zustand Global State
│   │   └── types/                 # TypeScript Interfaces
│   ├── Dockerfile                 # Multi-stage Frontend Image
│   ├── nginx.conf                 # SPA Routing & Security Headers
│   └── vercel.json                # Vercel Hosting Configuration
├── server/                        # Express 5 Backend
│   ├── src/
│   │   ├── config/                # Environment Validation
│   │   ├── controllers/           # HTTP Request Handlers
│   │   ├── middleware/            # Auth, CSRF, Rate-limit & Errors
│   │   ├── prisma/                # Prisma v8 RC Contract & DB Client
│   │   ├── repositories/          # Data Access Layer
│   │   ├── routes/                # REST Route Definitions
│   │   ├── services/              # Business Logic & Matching Engine
│   │   ├── validators/            # Zod Validation Schemas
│   │   └── websocket/             # Socket.IO Gateway & Presence
│   ├── tests/                     # 337+ Automated Integration Tests
│   └── Dockerfile                 # Multi-stage Backend Image
├── docs/                          # Comprehensive Technical Documentation
│   ├── API_DOCUMENTATION.md       # Complete REST & Socket.IO Catalog
│   ├── ARCHITECTURE.md            # System & Architectural Blueprints
│   ├── DATABASE_DESIGN.md         # ERD, Data Dictionaries & State Machines
│   ├── DEPLOYMENT.md              # Production Operations & Runbook
│   ├── PHASE_22_PWA_REPORT.md     # Phase 22 PWA & Web Push Report
│   ├── PHASE_23_SECURITY_SCALABILITY_REPORT.md # Phase 23 Security & Benchmarking Report
│   ├── PRODUCTION_READINESS.md    # Production Audit & Hardening Matrix
│   └── SCALABILITY_ARCHITECTURE.md# High-Concurrency Scaling & Topology Blueprint
├── docker-compose.yml             # Local & Production Container Orchestration
├── render.yaml                    # Render Cloud Blueprint
└── README.md                      # Project Documentation
```

---

## Security Disclosures

- All passwords hashed via memory-hard Argon2id ($m=65536, t=3, p=4$).
- Authentication tokens signed and verified with pinned HS256 algorithm and stored in HTTP-only, SameSite=Lax, Secure cookies.
- Mutating endpoints protected via Double-Submit CSRF verification using `crypto.timingSafeEqual`.
- Uploaded group resources verified via binary magic bytes (`%PDF-`, `\x89PNG`, `\xff\xd8\xff`, `RIFF...WEBP`) and path traversal sanitization.
- Request deadline enforcement via 30-second timeout middleware.
- Content Security Policy and defensive HTTP headers enforced on all responses.
- Request bodies capped at 1MB to prevent memory exhaustion attacks.

---

## License

This project is licensed under the [ISC License](LICENSE).
