# SkillSwap — Full-Stack Portfolio Case Study

**Project Name:** SkillSwap  
**Live Application Target:** Production-Ready Peer-to-Peer & Collaborative Skill Exchange Platform  
**Developer Roles:** Principal Full-Stack Engineer, Systems Architect, Security Specialist, DevOps Engineer  
**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Node.js, Express 5, Socket.IO, PostgreSQL 15, Prisma v8 RC Contract ORM, Docker, Vercel, Render  

---

## 1. Project Overview & Executive Summary

SkillSwap is an enterprise-grade full-stack platform that transforms peer-to-peer knowledge sharing into a structured, reciprocal learning ecosystem. Unlike traditional marketplaces that rely on monetary transactions, SkillSwap operates on an equitable skill-for-skill exchange model: learners teach skills they master in exchange for learning skills they desire.

The application spans from algorithmic two-way matching and real-time Socket.IO chat to calendar scheduling, embedded Jitsi video conferences, verified post-session reviews, cohort-based study groups, an experience point (XP) gamification engine, and a complete SaaS administration center.

---

## 2. Problem Statement

Modern learners face two major barriers when seeking to acquire new practical skills:
1. **High Financial Barriers:** High-quality 1-on-1 tutoring, bootcamps, and professional mentorship platforms charge steep hourly rates ($50–$150/hr), pricing out students and early-career professionals.
2. **Asymmetric Social Coordination:** Informal exchange groups (such as Reddit threads or Discord servers) suffer from extreme asymmetry, uncommitted flakes, scheduling friction, and lack of accountability or verification.

---

## 3. The Proposed Solution

SkillSwap solves these problems by providing a production-grade web platform with built-in structural fairness:
- **Strict Reciprocal Matching:** Eliminates unilateral freeloading by requiring complementary skill alignment before swap requests can be initiated.
- **Two-Direction Reciprocal Scheduling:** Requires paired sessions (Alice teaches Bob, Bob teaches Alice) before a skill exchange is marked complete.
- **Verified Double-Blind Reputation:** Reviews can only be submitted after verified session completion, preventing review bombing and astroturfing.
- **Collaborative Study Cohorts:** Expands learning beyond 1-on-1 pairs to multi-user study groups with shared file repositories, Kanban task boards, and group video sessions.

---

## 4. Target Users & User Personas

1. **Self-Taught Developers & Designers:** Seeking mock interviews, portfolio code reviews, and pair-programming practice with peers.
2. **Career Switchers & Bootcamp Students:** Needing consistent, structured accountability without paying for expensive private tutors.
3. **Polyglots & Language Learners:** Looking for native conversational language partners in reciprocal tandem exchanges (e.g., Spanish for English).
4. **Community Organizers:** Facilitating cohort-based study groups around specialized technical or creative topics.

---

## 5. Key Implemented Features

- **Algorithmic Reciprocal Matching:** 5-factor scoring engine evaluating reciprocal skills, secondary skill affinity, schedule overlap, response rate, and verified reputation.
- **Real-Time Messaging & Presence:** Socket.IO low-latency chat with client-side deduplication (idempotency), room isolation, typing indicators, and unread badges.
- **Session Scheduling & Jitsi Video:** Two-session reciprocal calendar booking with conflict prevention, reschedule proposals, and tokenized Jitsi Meet video rooms.
- **Community Discussion Forums & Study Groups:** Tagged categories, question-answer accepted solutions (+25 XP), threaded comments, upvotes, and public/private group spaces.
- **Collaborative Group Learning:** Multi-user sessions, waitlist queues, attendance verification, shared resource library with magic-byte file validation, and collaborative task boards.
- **Gamification & Learning Analytics:** Level progression (Levels 1–10), 10 achievement badges, GitHub-style 365-day SVG learning activity heatmap, and personal goal tracking.
- **Progressive Web App (PWA) & Push:** Offline application shell, service worker cache management, VAPID Web Push notifications (RFC 8292), and automated 15-minute session reminders.
- **Platform Administration & SaaS Governance:** 3-tier RBAC (`USER`, `MODERATOR`, `ADMIN`), user suspension, content abuse moderation, audit logs, and transactional email queue.

---

## 6. Technical Architecture & Design Decisions

### Frontend (React 19 + TypeScript + Vite)
- **Component-Driven Architecture:** Modular folder hierarchy separating page views from domain components (`matching/`, `sessions/`, `messages/`, `collaboration/`).
- **Server State Caching:** TanStack React Query eliminates duplicate network requests and provides seamless background refetching.
- **Bundle Optimization:** Functional Rollup chunking separating React runtime, TanStack Query, and Lucide icons reduces main entry bundle size by **68.5%** (102 kB vs 325 kB).

### Backend (Node.js + Express 5 + Socket.IO)
- **Layered Clean Architecture:** Clear boundaries between Controllers (HTTP decoding), Services (business rules), Repositories (queries), and Middleware (security).
- **Prisma v8 RC Contract Runtime:** Non-destructive schema evolution with strict type-safety and contract verification (`prisma db verify`) ensuring zero database drift.
- **In-Memory TTL Caching:** Memory-efficient caching of static skill catalogs and community analytics reduces database query volume.

---

## 7. Main Engineering Challenges & Solutions

### Challenge 1: Socket.IO Race Conditions in Real-Time Tests
- **Issue:** Under rapid asynchronous test execution, client sockets emitted messages before the server confirmed the recipient's room join was committed in memory, resulting in intermittent test timeouts.
- **Solution:** Re-architected room joins to return explicit server acknowledgments and updated test runners to synchronize socket readiness via `Promise.all([new Promise((res) => socket.emit('conversation:join', ..., () => res()))])`.

### Challenge 2: Double-Submit CSRF with Timing Attack Mitigation
- **Issue:** Standard string comparisons (`===`) on security tokens are susceptible to timing attacks where attackers infer token characters based on execution duration.
- **Solution:** Hardened CSRF validation middleware using Node.js `crypto.timingSafeEqual` with fixed-length SHA-256 byte buffers, ensuring constant-time comparison regardless of token contents.

### Challenge 3: Insecure File Uploads in Group Resources
- **Issue:** Malicious actors could upload executable scripts disguised with misleading file extensions (e.g. `.exe` renamed to `.pdf`).
- **Solution:** Implemented binary magic-byte inspection in `groupResource.service.ts` checking file headers (`%PDF-`, `\x89PNG`, `\xff\xd8\xff`, `RIFF...WEBP`) and blocking executable markers (`MZ`, `ELF`) unconditionally before writing to storage.

---

## 8. Application Security Highlights

- **HTTP-Only Cookie Authentication:** JWT tokens stored exclusively in `httpOnly`, `Secure`, `SameSite=Lax` cookies; zero storage in `localStorage`.
- **IDOR Defense:** User ownership strictly enforced across all database queries for private resources (messages, sessions, roadmaps, billing).
- **Rate Limiting:** Granular sliding-window limiters on authentication (15 req/15min) and API endpoints (100 req/min).
- **Content Security Policy & Defensive Headers:** Helmet middleware enforcing strict CSP, HSTS, frame deny, and MIME-sniffing protection.

---

## 9. Testing & Quality Assurance

- **Full Test Suite:** **310 automated tests passing across 26 test suites (100% pass rate)** in 32.9 seconds.
- **Comprehensive E2E Journeys:** 8 multi-user priority user journeys exercising the full full-stack lifecycle in 4.25 seconds.
- **Static Code Quality:** 0 TypeScript compiler errors (`tsc -b`), 0 ESLint errors or warnings (`eslint .`).
- **Accessibility:** WCAG 2.2 AA compliance verified for focus rings (`:focus-visible`), keyboard skip links, modal focus trapping, and 48x48px mobile touch targets.

---

## 10. Lessons Learned & Key Takeaways

1. **Contract-Driven ORM Workflows:** Working with Prisma v8 RC contract specification reinforced the importance of non-destructive schema migrations and continuous database marker verification over loose schema pushing.
2. **State Management Discipline:** Separating ephemeral UI state (Zustand) from asynchronous server data (React Query) dramatically reduced state synchronization bugs and eliminated unnecessary component re-renders.
3. **Defense-in-Depth in WebSockets:** Authenticating Socket.IO handshakes with the same HTTP-only JWT cookies used by REST routes ensured unified security boundaries across both communication protocols.

