# SkillSwap — Resume & Technical Interview Descriptions

**Project:** SkillSwap (Peer-to-Peer & Collaborative Skill Exchange Platform)  
**Role:** Principal Full-Stack Engineer / Lead Developer  
**Technologies:** React 19, TypeScript, Vite, Tailwind CSS v4, Node.js, Express 5, Socket.IO, PostgreSQL 15, Prisma v8 RC Contract ORM, Docker, Vercel, Render  

---

## 1. Resume Bullet Points

### Two-Bullet Version
- **Architected and developed a full-stack peer-to-peer skill exchange platform** using React 19, TypeScript, Express 5, PostgreSQL 15, and Prisma v8 RC contract runtime, implementing a 5-factor reciprocal matching algorithm, real-time Socket.IO chat, calendar scheduling, and embedded Jitsi video conferences.
- **Engineered enterprise-grade security and reliability**, including HTTP-only JWT authentication, timing-safe CSRF defense, binary magic-byte file inspection, 68.5% frontend bundle optimization via Rollup chunking, and 310 automated integration tests achieving a 100% pass rate.

---

### Three-Bullet Version
- **Built a production-ready skill exchange platform** with React 19, Node.js, Express 5, and PostgreSQL 15, featuring reciprocal algorithmic matching, real-time Socket.IO messaging with message deduplication, two-direction session scheduling, and verified reviews.
- **Implemented collaborative learning and community features**, including public/private study groups, discussion forums with accepted answers (+25 XP), shared document repositories with magic-byte validation, Kanban task boards, and a GitHub-style 365-day activity heatmap.
- **Hardened application security, accessibility, and performance**, enforcing WCAG 2.2 AA standards (focus traps, skip links, 48px touch targets), VAPID Web Push notifications (RFC 8292), PWA offline support, and 310 automated tests across 26 suites with 0 failures.

---

## 2. Short Portfolio Description

> **SkillSwap** is a full-stack, production-ready web platform that transforms peer-to-peer learning into an equitable skill-for-skill exchange. Built with React 19, TypeScript, Express 5, PostgreSQL, and Prisma v8 RC, the platform eliminates financial barriers to 1-on-1 mentorship through an algorithmic reciprocal matching engine, real-time messaging, calendar scheduling, embedded Jitsi video meetings, collaborative study cohorts, an XP gamification ledger, and a comprehensive SaaS administration center. Engineered with defense-in-depth security (HTTP-only JWT cookies, timing-safe CSRF, IDOR prevention) and validated with 310 automated tests (100% pass rate).

---

## 3. Technical Interview Walkthrough ("Tell Me About a Project You Built")

### Opening Pitch (30 seconds)
"I built **SkillSwap**, a production-ready full-stack platform designed to facilitate peer-to-peer skill exchanges without monetary transactions. Users teach skills they've mastered in exchange for learning skills they need. To make this work reliably without flakes, I built a deterministic 5-factor reciprocal matching engine, paired two-direction session scheduling, real-time Socket.IO messaging, and embedded Jitsi video meetings."

### Technical Architecture & Stack Choice (60 seconds)
"On the frontend, I used **React 19** with **TypeScript**, **Tailwind CSS v4**, and **Vite 8**. I used **TanStack React Query** for server state caching and **Zustand** for lightweight client auth state. I configured functional Rollup chunk splitting to isolate React, React Query, and Lucide icons into immutable vendor chunks, which dropped the main entry bundle down to 102 kB (31 kB gzipped).

On the backend, I designed a layered **Express 5** architecture using **PostgreSQL 15** and the new **Prisma v8 RC contract-driven ORM**. Schema changes are managed contractually and verified against the live database marker with `prisma db verify`, guaranteeing zero schema drift. Real-time chat and presence are powered by **Socket.IO** with client-side deduplication."

### Deep-Dive: Key Engineering Challenges (60 seconds)
"One interesting challenge was **real-time message idempotency and race conditions**. In high-concurrency environments, duplicate socket clicks could create duplicate database rows, and in automated testing, emitting messages before the recipient joined the room caused dropped events. I solved this by implementing client-generated message UUIDs with a 15-second sliding window deduplication cache on the server, and rewrote the socket room joins to return explicit server acknowledgments before message emissions proceed.

Another focus was **application security**. I avoided storing JWT tokens in localStorage to prevent XSS exfiltration. Instead, tokens are stored in HTTP-only, SameSite=Lax, Secure cookies. To prevent CSRF attacks on mutating endpoints, I implemented a double-submit cookie pattern with `crypto.timingSafeEqual` over fixed-length SHA-256 byte buffers to eliminate timing side-channels."

### Quality & Testing (30 seconds)
"To ensure production readiness, I authored a comprehensive test suite of **310 automated tests across 26 suites** covering authentication, reciprocal workflows, community forums, study groups, PWA push notifications, and security regressions. I also conducted an accessibility audit ensuring WCAG 2.2 AA compliance, including modal keyboard focus traps, skip links, and 48px touch targets for mobile devices."

