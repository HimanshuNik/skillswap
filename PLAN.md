# SkillSwap — Master Development Plan

> **Objective:** Transform the existing SkillSwap prototype into a complete, production-ready,
> secure, and polished full-stack skill-exchange application — without replacing the existing UI.
>
> **Repository:** `E:\skillswap`
> **Last Audited:** 2026-10-21

---

## Quick Status Snapshot

| Layer | Current State |
|---|---|
| Landing page | ✅ Complete (UI only) |
| Auth (Login / Register) | ⚠️ UI only — navigates directly to dashboard |
| Onboarding wizard | ⚠️ Collects data locally, nothing persisted |
| Dashboard | ⚠️ Hard-coded mock data, pings health endpoint |
| Discover | ⚠️ Search / filter works on 6 mock users |
| Matches | ⚠️ Score formula exists, mock data |
| Messages | ⚠️ Local-state chat, no real-time, not persisted |
| Sessions | ⚠️ Filter UI works, mock data |
| Settings | ⚠️ UI only, no save actions |
| Profile page | ⚠️ Reads from mock data |
| Express server | ✅ Running, 3 health routes |
| PostgreSQL / Prisma | ⚠️ Connected, only User model, no API routes |
| Real-time (Socket.IO) | ❌ Not installed |
| Auth system | ❌ Not implemented |
| Tests | ❌ None |
| Deployment | ❌ Not configured |

---

## Tech Stack (Preserved + Approved Additions)

### Frontend (existing)
- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- React Router v7

### Frontend (to be added)
- **TanStack Query v5** — server-state management, caching, loading/error states
- **Zustand** — auth state and lightweight client state
- **React Hook Form + Zod** — form handling and validation
- **Lucide React** — icon library (consistent, lightweight)
- **Sonner** — toast notifications

### Backend (existing)
- Express 5 + TypeScript + Node.js (ESM)
- Prisma ORM v8 RC + PostgreSQL

### Backend (to be added)
- **Zod** — request validation
- **Argon2** — password hashing
- **jsonwebtoken** — JWT access tokens
- **cookie-parser** — HTTP-only cookie support
- **Socket.IO** — real-time messaging
- **Multer + Cloudinary SDK** — avatar uploads
- **Nodemailer** — email verification / password reset
- **express-rate-limit** — login rate limiting
- **pino** — structured logging

### Prisma Strategy
> The project uses Prisma v8 RC with @prisma/orm-postgres contract-based architecture.
> Before writing any new database code, the first milestone will verify which query APIs
> are actually available (db.orm, db.sql, db.raw). If the RC architecture proves
> too unstable, migrating to stable Prisma 5 will be proposed as a separate approval item.

---

## Implementation Phases

---

### Phase 0 — Project Audit and Planning
**Goal:** Understand exactly what exists, what works, and what is broken before touching any code.

#### Tasks
- [x] Inspect full repository structure
- [x] Review all pages, components, and types
- [x] Review Prisma schema and query client
- [x] Review Express server and routes
- [x] Identify mock data, UI-only features, broken flows
- [ ] Run tsc --noEmit on client and server
- [ ] Run npm run build on client
- [ ] Run lint checks
- [ ] Document all findings

#### Deliverables
- PROJECT_AUDIT.md — complete findings
- DEVELOPMENT_ROADMAP.md — milestone tracker

#### Approval gate
> Present audit findings. No feature code until audit is complete and reviewed.

---

### Phase 1 — Backend Architecture and Database Foundation
**Goal:** Establish a clean, verified backend that can actually read and write PostgreSQL records.

#### 1A — Verify Prisma Query API
- Inspect installed @prisma/orm-postgres version
- Test all available query interfaces (db.orm, db.sql, db.raw)
- Write a simple SELECT 1 and a User insert/read test
- Document which API works
- If RC is too unstable => propose stable Prisma 5 migration (requires approval)

#### 1B — Expand Database Schema
New models (contract.prisma):
- User — (existing, expand with new fields)
- Skill — global skill catalog
- UserTeachingSkill — user to skill they teach + proficiency
- UserLearningSkill — user to skill they want to learn + target level
- UserAvailability — day + time slot availability per user
- SwapRequest — pending/accepted/rejected/cancelled requests
- Conversation — chat between two users
- Message — individual message in a conversation
- Session — scheduled learning session
- Review — post-session review and rating
- Notification — in-app notifications

#### 1C — Backend Folder Structure

```
server/src/
├── config/           env, constants, db config
├── controllers/      request handlers (thin)
├── routes/           express routers
├── services/         business logic
├── repositories/     db query functions
├── middleware/       auth, error handler, rate limiter, logger
├── validators/       Zod schemas
├── utils/            helpers (dates, tokens, email)
├── prisma/           existing db.ts + contract files
├── app.ts            express app setup
└── index.ts          server entry point
```

#### 1D — API Conventions
All responses follow:
- Success: { "success": true, "data": { ... } }
- Error: { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }

#### 1E — Centralized Error Handling
- AppError class with status code + error code
- Global error middleware
- Validation error formatting
- Unhandled rejection / SIGTERM handlers

#### Deliverables
- Working Prisma queries verified
- Full database schema in contract.prisma
- Reorganized server/src/ structure
- Health check returns DB status
- Graceful shutdown

#### Approval gate
> Confirm DB queries work and schema design before proceeding to auth.

---

### Phase 2 — Authentication System
**Goal:** Secure registration, login, logout, and protected routes — end to end.

#### Backend Endpoints
- POST /api/auth/register — validate, hash password (Argon2id), create user, set auth cookie
- POST /api/auth/login — validate credentials, issue JWT in HTTP-only cookie
- POST /api/auth/logout — clear auth cookie
- GET /api/auth/me — return current authenticated user
- POST /api/auth/forgot-password — generate reset token, send email
- POST /api/auth/reset-password — validate token, update password
- POST /api/auth/verify-email — verify email token

#### Security
- Argon2id password hashing
- JWT stored in HTTP-only Secure SameSite=Strict cookie
- Generic error messages ("Invalid credentials")
- Rate limiting on login (5 attempts per 15 min per IP)
- Secure password reset tokens (32-byte random, hashed in DB, expires in 1 hour)
- Zod validation on all inputs
- authenticate middleware for protected routes

#### Frontend
- Replace frontend-only login/register navigation with real API calls
- Store auth user in Zustand (useAuthStore)
- ProtectedRoute wrapper — redirect to /login if unauthenticated
- GuestRoute wrapper — redirect to /dashboard if already logged in
- Persistent login (re-validate token on app load via GET /api/auth/me)
- Token expiry => auto logout + toast notification
- TanStack Query mutation for login/register
- Zod + React Hook Form on Login and Register pages

#### Registration Flow
```
Fill form -> Zod validation -> POST /api/auth/register
  -> Hash password -> Create User -> Send verification email
  -> Set auth cookie -> Navigate to /onboarding
```

#### Deliverables
- Working register / login / logout
- Protected app routes (/dashboard, /discover, etc.)
- Guest-only routes (/login, /register)
- Auth state persists on page refresh

---

### Phase 3 — User Profile and Onboarding
**Goal:** Persist onboarding data, enable profile editing, avatar uploads.

#### Backend Endpoints
- POST /api/onboarding — save all onboarding data in one transaction
- GET /api/users/me — full authenticated user profile
- PATCH /api/users/me — update profile fields
- POST /api/users/me/avatar — upload avatar (Multer -> Cloudinary)
- GET /api/users/:username — public profile (excludes private fields)
- POST /api/users/me/skills/teaching — add teaching skill
- DELETE /api/users/me/skills/teaching/:skillId — remove teaching skill
- POST /api/users/me/skills/learning — add learning skill
- DELETE /api/users/me/skills/learning/:skillId — remove learning skill
- PATCH /api/users/me/availability — update availability schedule

#### Frontend
- Wire onboarding finishOnboarding() to POST /api/onboarding
- After onboarding, mark user as onboarded — redirect new users automatically
- Settings page: wire all save buttons to PATCH endpoints
- Avatar upload with preview
- Profile page: load real user from GET /api/users/:username
- Skills management: add/remove teaching and learning skills
- Profile completion progress indicator on dashboard

#### Deliverables
- Onboarding data saved to PostgreSQL
- Profile editing works end to end
- Public profile shows real data
- Avatar upload functional

---

### Phase 4 — Discover Users
**Goal:** Replace mock data in Discover with real PostgreSQL queries.

#### Backend
- GET /api/users — paginated, filterable user list
  - Query params: search, category, teaches, wantsToLearn, page, limit
  - Excludes: current user, incomplete profiles, private accounts

#### Frontend
- Replace mockUsers import with TanStack Query useQuery
- Loading skeleton cards (same card shape as UserCard)
- Error state with retry button
- Empty state (existing design preserved)
- Debounced search input (300ms)
- Category filter chips (existing design preserved)
- Pagination or infinite scroll

#### Deliverables
- Discover page shows real users from DB
- Search and filter work against real data
- Graceful loading, error, and empty states

---

### Phase 5 — Smart Skill Matching Engine
**Goal:** Implement the two-way matching algorithm server-side and connect Matches page.

#### Algorithm
Score = (SkillCompatibility x 0.60) + (AvailabilityOverlap x 0.25) + (ReputationScore x 0.15)

Rules:
- Requires genuine two-way exchange (A teaches what B wants AND B teaches what A wants)
- No mutual skill exchange = score cannot exceed 30 regardless of other factors
- New users without ratings start at neutral 70/100 (not penalized)
- Timezone-aware availability comparison

#### Backend
- GET /api/matches — compute and return top matches for current user
- Configurable weights
- Unit-testable pure matching function (no DB dependency)
- Cached results (5-minute cache, invalidated on profile update)

#### Frontend
- Replace hard-coded matches with TanStack Query
- SkillMatchCard shows real match data
- Match explanation tooltip
- Loading skeletons
- Empty state for users without enough profile data

#### Tests
- Unit tests for matching algorithm (all edge cases)
- Integration test for matches endpoint

#### Deliverables
- Real matching API
- Matches page connected to API
- Matching algorithm unit tested

---

### Phase 6 — Skill Swap Requests
**Goal:** Users can send, accept, and reject swap requests.

#### Backend
- POST /api/swap-requests — send request
- GET /api/swap-requests/incoming — requests received
- GET /api/swap-requests/outgoing — requests sent
- PATCH /api/swap-requests/:id/accept
- PATCH /api/swap-requests/:id/reject
- PATCH /api/swap-requests/:id/cancel (sender only)
- Prevent duplicate active requests
- Validate all state transitions server-side

#### Status Flow
PENDING -> ACCEPTED | REJECTED | CANCELLED

#### Frontend
- Send Swap Request button on Profile and SkillMatchCard opens modal
- Modal: select skill you offer, skill you want, optional message
- Incoming requests badge in Sidebar
- Notifications for status changes

#### Deliverables
- Full request lifecycle functional
- Server-side validation of all transitions

---

### Phase 7 — Real-Time Messaging
**Goal:** Replace local-state chat with Socket.IO-powered real-time messaging.

#### Backend
- Socket.IO server mounted on Express HTTP server
- JWT authentication on socket connection
- Events: message:send, message:received, typing:start, typing:stop, presence:online, presence:offline
- GET /api/conversations — list conversations with last message + unread count
- GET /api/conversations/:id/messages — paginated message history
- POST /api/conversations — create conversation
- Message content validation (max 2000 chars)
- Authorization: user must be a conversation participant

#### Frontend
- Preserve existing Messages UI layout (two-panel design)
- Replace local state with Socket.IO client + TanStack Query
- Real-time message delivery
- Typing indicators
- Online/offline presence dots
- Read receipts
- Auto-scroll to latest message
- Unread count badge on Sidebar

#### Deliverables
- Messages persist across page reloads
- Real-time delivery verified
- Auth enforced on socket connections

---

### Phase 8 — Session Booking
**Goal:** Schedule, confirm, and track learning sessions.

#### Backend
- POST /api/sessions — request a session
- GET /api/sessions — list sessions (filterable by status)
- PATCH /api/sessions/:id/confirm
- PATCH /api/sessions/:id/cancel
- PATCH /api/sessions/:id/complete
- PATCH /api/sessions/:id/reschedule
- Prevent overlapping confirmed sessions
- Timezone-correct scheduling

#### Session Status Flow
REQUESTED -> CONFIRMED -> COMPLETED | CANCELLED

#### Frontend
- Sessions page loads real data from API
- Date/time picker for booking
- Session status badges
- Upcoming session reminder on Dashboard

#### Deliverables
- Session scheduling functional end to end
- Conflict prevention working
- Sessions page shows real data

---

### Phase 9 — Video Meeting Integration
**Goal:** Associate a meeting link with each session.

#### Approach (MVP)
Integrate Jitsi Meet (free, no API key required):
- Generate unique Jitsi room name per session
- Store meeting URL in Session record
- Join Session button appears 15 minutes before scheduled start

#### Backend
- Auto-generate Jitsi room URL on session confirmation
- GET /api/sessions/:id/meeting — return meeting URL (participants only, near session time)

#### Frontend
- Join Session button on SessionCard
- Disabled outside the session window
- Meeting URL copy to clipboard

#### Deliverables
- Every confirmed session has a meeting link
- Join button functional

---

### Phase 10 — Reviews and Ratings
**Goal:** Post-session reviews build user reputation.

#### Backend
- POST /api/sessions/:id/review — submit review (rating 1-5, text)
- GET /api/users/:username/reviews — public reviews
- Rules: only completed sessions, no self-review, one review per session per reviewer
- User rating recalculated after each new review

#### Frontend
- Leave a Review prompt after session marked complete
- Star rating component + written feedback textarea
- Reviews visible on public Profile page
- Average rating on UserCard and SkillMatchCard

#### Deliverables
- Review submission functional
- Ratings reflect on profiles and match scores

---

### Phase 11 — Notifications
**Goal:** In-app notification bell with real-time delivery.

#### Events Covered
- New swap request received
- Swap request accepted / rejected
- New message
- Session confirmed / cancelled / starting soon
- New review received

#### Backend
- Notification model in schema
- GET /api/notifications
- PATCH /api/notifications/:id/read
- PATCH /api/notifications/read-all
- Real-time delivery via Socket.IO event notification:new

#### Frontend
- Bell icon in AppHeader with unread count badge
- Dropdown list of recent notifications
- Click notification => navigate to relevant page
- Mark all as read button

#### Deliverables
- Notifications created for all listed events
- Real-time delivery via Socket.IO

---

### Phase 12 — Dashboard with Real Data
**Goal:** Replace all mock statistics and cards with real database values.

#### Real Data Sections
- Stats: completed swaps, upcoming sessions, pending requests, average rating
- Recommended matches: top 3 from matching engine
- Upcoming sessions: next 2 sessions from Sessions table
- Recent conversations: last 3 conversations
- Profile completion: % based on filled fields + skills + availability
- Pending swap requests badge count

#### Deliverables
- Dashboard shows 100% real data
- No hard-coded values remain
- Loading skeletons for each section

---

### Phase 13 — Settings and Account Management
**Goal:** All Settings sections save and update real data.

#### Sections Wired to API
- Profile information -> PATCH /api/users/me
- Password change -> POST /api/auth/change-password (requires current password)
- Skills management -> teaching + learning skill CRUD
- Availability -> PATCH /api/users/me/availability
- Session preferences -> PATCH /api/users/me/preferences
- Notification preferences -> PATCH /api/users/me/notification-preferences
- Account deletion -> DELETE /api/users/me (requires password confirmation, soft delete)
- Logout -> POST /api/auth/logout -> clear cookie -> redirect to /

#### Deliverables
- All save buttons functional
- Account deletion safe and confirmed
- Logout clears auth state

---

### Phase 14 — UI/UX Polish
**Goal:** Refine the existing UI without redesigning it.

#### Consistency Improvements
- Extract repeated Tailwind patterns into reusable components
- Standardize button variants (primary, secondary, ghost, danger)
- Standardize input field styles
- Badge / tag components (skill chips, status indicators)
- Empty state component
- Error state component
- Loading skeleton component

#### Responsive Improvements
- Mobile bottom navigation bar
- Stack cards vertically on mobile
- Full-screen chat on mobile
- Touch-friendly tap targets

#### Accessibility
- All interactive elements have accessible labels
- Visible focus indicators
- Form field error announcements (aria-describedby)
- Modal focus trapping
- Skip navigation link
- Color contrast verified (WCAG AA minimum)

#### Performance
- Route-based code splitting (React.lazy)
- Image optimization (Cloudinary transformations)
- Debounced search inputs
- TanStack Query caching
- Bundle size audit

#### Preserved (NOT changed)
- White / light-slate backgrounds
- Emerald-green accents
- Sidebar layout
- Current card designs
- Current typography

---

### Phase 15 — Testing
**Goal:** Meaningful automated test coverage on critical paths.

#### Unit Tests (Vitest)
- Matching algorithm (all edge cases)
- Score calculation
- Date/time utilities
- Zod validation schemas
- Request state transition logic

#### Backend Integration Tests (Supertest)
- Auth: register, login, logout, me, protected routes
- Profile: get, update, skills CRUD
- Matches: algorithm, endpoint
- Swap requests: all status transitions
- Messages: authorization, pagination
- Sessions: booking, conflict detection
- Reviews: rules enforcement

#### Frontend Tests (React Testing Library)
- Login / Register form validation
- Protected route redirect
- Discover search + filter
- Sessions filter

#### End-to-End Tests (Playwright)
Full happy path:
Register -> Onboarding -> Discover -> Profile -> Send Request
  -> Accept Request -> Chat -> Book Session -> Join Meeting
  -> Complete -> Review

#### Deliverables
- Tests actually run and pass
- Coverage report generated

---

### Phase 16 — Security Review
**Goal:** Identify and fix security issues before deployment.

#### Checklist
- [ ] Password hashing (Argon2id)
- [ ] JWT in HTTP-only cookies
- [ ] CSRF protection
- [ ] Input validation on all endpoints (Zod)
- [ ] SQL injection (Prisma parameterized queries)
- [ ] XSS prevention (output escaping, CSP headers)
- [ ] CORS locked to production domain
- [ ] Rate limiting on auth endpoints
- [ ] Sensitive fields excluded from API responses
- [ ] File upload validation (type, size)
- [ ] .env not committed
- [ ] Secrets not hardcoded
- [ ] Error messages do not leak stack traces in production
- [ ] Database credentials use least privilege

#### Performance Review
- N+1 query detection
- Missing database indexes
- Bundle size < 500KB initial
- API response time < 300ms for common routes

---

### Phase 17 — Deployment
**Goal:** Production-ready deployment with CI/CD.

#### Frontend (Vercel)
- Build: npm run build (Vite)
- Environment: VITE_API_URL=https://api.skillswap.app
- vercel.json for SPA routing

#### Backend (Render or Railway)
- Dockerfile for containerized deployment
- Environment variables via platform secrets
- Health check: GET /api/health
- Database migrations on deploy

#### Database (Managed PostgreSQL)
- Supabase, Render Postgres, or Railway Postgres
- Connection pooling
- Automated backups

#### CI/CD (GitHub Actions)
Triggers on push to main:
- lint -> typecheck -> test -> build -> deploy-backend -> deploy-frontend

#### Deliverables
- Frontend and backend deployed and communicating
- DEPLOYMENT.md with full runbook

---

### Phase 18 — Documentation
**Goal:** Professional documentation synchronized with actual implementation.

| File | Contents |
|---|---|
| README.md | Overview, features, setup, screenshots |
| PROJECT_AUDIT.md | Full audit findings |
| DEVELOPMENT_ROADMAP.md | Milestone tracker |
| DATABASE_DESIGN.md | ERD, model descriptions, relationships |
| API_DOCUMENTATION.md | All endpoints, request/response schemas |
| ARCHITECTURE.md | System overview diagram, design decisions |
| DEPLOYMENT.md | Step-by-step deployment runbook |
| TESTING.md | How to run tests, coverage report |

---

## Implementation Order

Phase 0  — Audit                    <- Start here
Phase 1  — Backend Foundation       <- Critical path
Phase 2  — Authentication           <- Everything depends on this
Phase 3  — Profile & Onboarding     <- Enables real user data
Phase 4  — Discover                 <- First real feature
Phase 5  — Matching Engine          <- Core product value
Phase 6  — Swap Requests            <- Enables conversations
Phase 7  — Real-Time Messaging      <- Core engagement
Phase 8  — Session Booking          <- Enables reviews
Phase 9  — Meeting Integration      <- Sessions become useful
Phase 10 — Reviews & Ratings        <- Closes the loop
Phase 11 — Notifications            <- Quality of life
Phase 12 — Dashboard (real data)    <- Product completeness
Phase 13 — Settings                 <- User control
Phase 14 — UI/UX Polish             <- Refinement
Phase 15 — Testing                  <- Confidence
Phase 16 — Security Review          <- Safety
Phase 17 — Deployment               <- Go live
Phase 18 — Documentation            <- Handoff

---

## Approval Gates

The following changes require explicit approval before proceeding:

| Decision | Reason |
|---|---|
| Replacing Prisma v8 RC with stable Prisma 5 | Breaking ORM change |
| Dropping or resetting any database table | Data loss risk |
| Replacing any existing UI component wholesale | Design integrity |
| Installing a new major framework | Architecture change |
| Public deployment | Cost + visibility |
| Any operation on production database | Irreversible |

All other changes within an approved milestone proceed autonomously.

---

## Definition of Done

The project is complete when:

- [ ] Secure registration and login (real JWT + Argon2)
- [ ] Protected routes (frontend + backend)
- [ ] Onboarding saves to PostgreSQL
- [ ] Profile editing functional
- [ ] Teaching and learning skills managed
- [ ] Discover shows real users with working search/filter
- [ ] Two-way matching engine returns real scores
- [ ] Swap requests: send / accept / reject / cancel
- [ ] Real-time messaging via Socket.IO
- [ ] Session scheduling with conflict prevention
- [ ] Meeting link per session
- [ ] Reviews and ratings after completed sessions
- [ ] Notification system (in-app + real-time)
- [ ] Dashboard shows real data only
- [ ] Settings page fully functional
- [ ] Responsive on mobile / tablet / desktop
- [ ] Accessibility improvements applied
- [ ] All API routes authorized
- [ ] Automated tests passing
- [ ] Security review complete
- [ ] Deployed and publicly accessible
- [ ] Documentation complete

---

## Milestone Tracker

| # | Milestone | Status |
|---|---|---|
| 0 | Project Audit | In Progress |
| 1A | Prisma Query Verification | Pending |
| 1B | Database Schema Expansion | Pending |
| 1C | Backend Restructure | Pending |
| 2 | Authentication System | Pending |
| 3 | Profile & Onboarding | Pending |
| 4 | Discover (real data) | Pending |
| 5 | Matching Engine | Pending |
| 6 | Swap Requests | Pending |
| 7 | Real-Time Messaging | Pending |
| 8 | Session Booking | Pending |
| 9 | Meeting Integration | Pending |
| 10 | Reviews & Ratings | Pending |
| 11 | Notifications | Pending |
| 12 | Dashboard (real data) | Pending |
| 13 | Settings | Pending |
| 14 | UI/UX Polish | Pending |
| 15 | Testing | Pending |
| 16 | Security Review | Pending |
| 17 | Deployment | Pending |
| 18 | Documentation | Pending |

---

*This document is a living plan. It will be updated as milestones complete and decisions are made.*
