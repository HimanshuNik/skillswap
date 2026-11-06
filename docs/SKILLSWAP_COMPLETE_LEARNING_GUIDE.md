# SkillSwap — Complete Learning Guide (From Beginner to Full-Stack Engineer)

**Target Audience:** Developers with basic HTML, CSS, JavaScript, and React knowledge who want to master backend architecture, databases, authentication, real-time WebSockets, and system design.  
**Platform Reference:** SkillSwap (`E:\skillswap`)  
**Author:** Principal Full-Stack Architect & Technical Instructor  

---

## Welcome to SkillSwap!

If you know how to build a basic React button or write a JavaScript function, but backend concepts like **relational databases**, **JWT cookies**, **CSRF protection**, **WebSockets**, and **Docker** feel intimidating or abstract, this guide is designed for you.

We will explain every layer of SkillSwap step-by-step:
1. First, with a **simple plain-English analogy**.
2. Then, with a **real-world SkillSwap example**.
3. Next, with the **exact technical implementation** and file references.
4. Finally, with the **step-by-step data flow**.

---

## 1. What SkillSwap Is
- **Simple Explanation:** Imagine a neighborhood community center where nobody pays with cash. If you know how to fix a bicycle and your neighbor knows how to bake sourdough bread, you help them tune up their bike, and they teach you how to bake. SkillSwap is that exact neighborhood concept built as a modern digital platform for learning.
- **SkillSwap Example:** Alice is a seasoned React developer who wants to learn Figma UI/UX design. Bob is a senior product designer who wants to learn React. SkillSwap connects Alice and Bob so they teach each other without either person spending a single dollar.
- **Technical Implementation:** A full-stack web application with React 19 on the client, Node.js/Express 5 on the server, and PostgreSQL 15 as the database.
- **Key Files:** [`client/src/App.tsx`](file:///e:/skillswap/client/src/App.tsx), [`server/src/app.ts`](file:///e:/skillswap/server/src/app.ts).

---

## 2. What Problem It Solves
- **Simple Explanation:** Learning by yourself from YouTube videos is lonely and hard when you get stuck. But hiring private tutors or joining coding bootcamps costs $50 to $150 per hour. Meanwhile, finding people on Reddit or Discord is chaotic because people flake out or don't show up.
- **SkillSwap Example:** SkillSwap replaces the chaos with **structure and accountability**. To request a swap, both users must have complementary skills. Before a swap is marked "complete", both users must schedule and conduct their reciprocal lessons. Verified reviews can only be submitted after the lesson has actually occurred.
- **Technical Implementation:** State machines in PostgreSQL enforce that reviews cannot be written for uncompleted sessions, and requests cannot be created without reciprocal skill overlap.
- **Key Files:** [`server/src/services/swapRequest.service.ts`](file:///e:/skillswap/server/src/services/swapRequest.service.ts), [`server/src/services/session.service.ts`](file:///e:/skillswap/server/src/services/session.service.ts).

---

## 3. Why It Is a "Full-Stack" Application
- **Simple Explanation:** A "frontend-only" website is like a restaurant menu printed on paper. It looks pretty, but you can't order food or talk to the chef. A "full-stack" application includes the dining room (frontend), the waiters carrying orders (APIs), the kitchen preparing the meals (backend server), and the pantry storing ingredients (database).
- **SkillSwap Example:** When Alice logs in, the React frontend displays her dashboard. But her username, list of active swaps, unread messages, and scheduled sessions are not hardcoded in the frontend. They are stored in PostgreSQL on the server and fetched on demand.
- **Technical Implementation:**
  - Frontend: `client/` (React 19, TypeScript, Tailwind CSS, Vite).
  - Backend: `server/` (Node.js, Express 5, Socket.IO).
  - Database: PostgreSQL with Prisma ORM.

---

## 4. How the Frontend Works
- **Simple Explanation:** The frontend is what runs inside the user's browser. It draws the buttons, cards, forms, and colors on the screen, responds to clicks and typing, and decides what page to show.
- **SkillSwap Example:** When Alice visits `/discover`, the frontend renders a search bar and a grid of user cards. When she types "Figma", the frontend immediately filters the visible cards or asks the backend for matching users.
- **Technical Implementation:** React components render JSX. State is managed locally with `useState`, server data is cached with **TanStack React Query**, and global login state is held in a **Zustand** store.
- **Key Files:** [`client/src/pages/Discover.tsx`](file:///e:/skillswap/client/src/pages/Discover.tsx), [`client/src/components/discover/UserCard.tsx`](file:///e:/skillswap/client/src/components/discover/UserCard.tsx).

---

## 5. How the Backend Works
- **Simple Explanation:** The backend is a program running continuously on a server computer in the cloud. It acts as the trustworthy gatekeeper. It checks passwords, prevents cheating, enforces rules, and talks directly to the database.
- **SkillSwap Example:** When Alice clicks "Send Swap Request", she cannot simply write data directly into the database. The frontend sends her request to the backend. The backend checks: "Is Alice logged in? Does Bob actually teach what Alice wants? Does Alice have fewer than 3 active swaps?" Only if all rules pass does the backend write the proposal to the database.
- **Technical Implementation:** Express 5 routes incoming HTTP requests through a chain of functions called **middleware** (authentication, rate limiting, validation) to **controllers**, which call **services** containing the business rules.
- **Key Files:** [`server/src/controllers/swapRequest.controller.ts`](file:///e:/skillswap/server/src/controllers/swapRequest.controller.ts), [`server/src/services/swapRequest.service.ts`](file:///e:/skillswap/server/src/services/swapRequest.service.ts).

---

## 6. How Frontend and Backend Communicate
- **Simple Explanation:** Imagine the frontend and backend are two people speaking over a phone line. They agree on a common language: **JSON** (JavaScript Object Notation). The frontend asks a question formatted as text, and the backend replies with text.
- **SkillSwap Example:** The frontend sends an HTTP `GET` request to `http://localhost:5000/api/dashboard`. The backend replies with:
  ```json
  {
    "success": true,
    "data": {
      "activeSwaps": 2,
      "upcomingSessionsCount": 1,
      "unreadMessagesCount": 3
    }
  }
  ```
- **Technical Implementation:** Standard `fetch()` calls wrapped in [`client/src/lib/api.ts`](file:///e:/skillswap/client/src/lib/api.ts). In development, Vite's proxy forwards requests from port 5173 to port 5000 automatically.

---

## 7. What an API Is in This Project
- **Simple Explanation:** API stands for **Application Programming Interface**. Think of an API like a restaurant menu. The menu lists the dishes you can order (`POST /api/sessions`), the items you can inspect (`GET /api/skills`), and the things you can cancel (`PATCH /api/sessions/5/cancel`).
- **SkillSwap Example:** When you visit the Sessions page, the frontend calls the session API: `GET /api/sessions`. The backend executes the query and returns your scheduled meetings.
- **Technical Implementation:** RESTful routes defined using Express `Router` in `server/src/routes/`. Each route maps an HTTP method (`GET`, `POST`, `PATCH`, `DELETE`) and a URL path to a controller function.
- **Key Files:** [`server/src/routes/session.routes.ts`](file:///e:/skillswap/server/src/routes/session.routes.ts), [`server/src/routes/index.ts`](file:///e:/skillswap/server/src/routes/index.ts).

---

## 8. What PostgreSQL Does
- **Simple Explanation:** When you turn off your laptop, anything stored in regular computer memory (RAM) disappears. A database is a special program that saves data permanently to the hard drive in organized tables, like spreadsheets with superpowers.
- **SkillSwap Example:** All registered users, passwords, swap requests, chat messages, and reviews are stored in PostgreSQL tables named `User`, `Skill`, `SwapRequest`, `Message`, and `Review`. Even if the server restarts, no user data is ever lost.
- **Technical Implementation:** Relational database running on port 5432 with foreign keys linking rows together (e.g., `Message.senderId` points to `User.id`).
- **Key Files:** PostgreSQL database service managed via `DATABASE_URL` in `server/.env`.

---

## 9. Why Prisma Is Used (Contract ORM)
- **Simple Explanation:** Writing raw SQL queries by hand (like `SELECT * FROM "User" WHERE email = '...'`) is easy to mess up with typos, syntax errors, or SQL injection vulnerabilities. Prisma is a translator that lets you write clean TypeScript code instead of raw SQL strings.
- **SkillSwap Example:** Instead of writing complex SQL queries, backend services write:
  ```typescript
  const user = await db.orm.public.User.where({ email }).first();
  ```
  Prisma automatically generates the safe SQL query, sends it to PostgreSQL, and returns a strongly-typed JavaScript object.
- **Technical Implementation:** Prisma v8 RC contract runtime (`@prisma/orm-postgres`). The schema is defined in `contract.prisma`, emitted to `contract.json`, and verified against the live database marker with `npx prisma db verify`.
- **Key Files:** [`server/src/prisma/contract.prisma`](file:///e:/skillswap/server/src/prisma/contract.prisma), [`server/src/prisma/db.ts`](file:///e:/skillswap/server/src/prisma/db.ts).

---

## 10. How Authentication Works
- **Simple Explanation:** Authentication answers the question: **"Who are you, and can you prove it?"**
- **SkillSwap Example:** Alice registers with her email and password. SkillSwap hashes her password so even the database administrator cannot read it. When Alice logs in, SkillSwap verifies her password and gives her browser a digital passport (a JWT token) stamped with her user ID.
- **Technical Implementation:** Passwords hashed with **Argon2id**. On login, the server generates a JSON Web Token signed with a secret key and attaches it to an **HTTP-only cookie**.
- **Key Files:** [`server/src/services/auth.service.ts`](file:///e:/skillswap/server/src/services/auth.service.ts), [`server/src/utils/password.ts`](file:///e:/skillswap/server/src/utils/password.ts).

---

## 11. What JWT and HTTP-Only Cookies Do
- **Simple Explanation:** A JWT (JSON Web Token) is like a signed wristband given to you at a concert. Whenever you want to enter the VIP lounge, the security guard doesn't call headquarters; they just inspect the signature on your wristband. An "HTTP-only" cookie means the wristband is kept in a locked pocket that browser JavaScript cannot touch.
- **Why It Matters:** If a hacker injects malicious JavaScript into your site (an XSS attack) and your token is stored in `localStorage`, the hacker can steal your token and impersonate you. Because SkillSwap uses **HTTP-only cookies**, browser scripts cannot read the token, making token theft impossible.
- **Technical Implementation:** Express sets cookie `skillswap_token` with flags `httpOnly: true, secure: true, sameSite: 'lax'`.
- **Key Files:** [`server/src/utils/tokens.ts`](file:///e:/skillswap/server/src/utils/tokens.ts), [`server/src/middleware/auth.middleware.ts`](file:///e:/skillswap/server/src/middleware/auth.middleware.ts).

---

## 12. How Reciprocal Matching Works
- **Simple Explanation:** If Alice wants to learn guitar and teaches French, she doesn't just need someone who teaches guitar. She needs someone who teaches guitar **AND** wants to learn French. That is **two-way (reciprocal) matching**.
- **SkillSwap Example:** The matching engine compares Alice's profile against every other user. If Bob teaches what Alice wants and wants what Alice teaches, the algorithm awards high points (60%). It then adds points if their weekly calendars overlap (15%) and if Bob has verified 5-star reviews (10%).
- **Technical Implementation:** Deterministic 5-factor scoring in `MatchingService.findReciprocalMatches` returning a ranked list with human-readable explanations.
- **Key Files:** [`server/src/services/matching.service.ts`](file:///e:/skillswap/server/src/services/matching.service.ts).

---

## 13. How Swap Requests Work
- **Simple Explanation:** A swap request is a formal proposal: "I will teach you React for 1 hour if you teach me UI/UX for 1 hour."
- **SkillSwap Example:** Alice sends Bob a proposal. The proposal enters the `PENDING` state. Bob sees it under his Incoming Requests. If Bob accepts, the proposal transitions to `ACCEPTED`, and the system automatically creates a private chat room between them.
- **Technical Implementation:** State machine with transitions (`PENDING` → `ACCEPTED` / `REJECTED` / `CANCELLED`). Acceptance triggers an atomic transaction that inserts a `Conversation` record linking both users.
- **Key Files:** [`server/src/services/swapRequest.service.ts`](file:///e:/skillswap/server/src/services/swapRequest.service.ts).

---

## 14. How Real-Time Messaging Works (WebSockets)
- **Simple Explanation:** Normal HTTP is like sending letters: you send a request and wait for a response. WebSockets are like an open telephone call: once connected, both sides can speak instantly at any time with zero delay.
- **SkillSwap Example:** When Alice types "See you at 3 PM!" and hits send, Bob's screen updates in **30 milliseconds** without Bob needing to refresh the page.
- **Technical Implementation:** **Socket.IO v4**. When Alice connects, the server verifies her cookie and places her socket into room `conversation:42`. When she emits `message:send`, the server saves the message to PostgreSQL and immediately broadcasts `message:new` to room `conversation:42`.
- **Key Files:** [`server/src/socket/index.ts`](file:///e:/skillswap/server/src/socket/index.ts), [`client/src/lib/socket.ts`](file:///e:/skillswap/client/src/lib/socket.ts).

---

## 15. How Jitsi Meetings Work
- **Simple Explanation:** Video calling directly inside the browser using open-source WebRTC technology.
- **SkillSwap Example:** When a session is scheduled, SkillSwap generates a private room code: `https://meet.jit.si/skillswap-session-a8f9c2...`. At meeting time, an embedded video window opens inside SkillSwap with camera, microphone, and screen-sharing controls.
- **Technical Implementation:** React component renders an `<iframe>` pointing to the Jitsi Meet WebRTC service. Session participants are verified before room details are displayed.
- **Key Files:** [`client/src/components/sessions/VideoMeetingModal.tsx`](file:///e:/skillswap/client/src/components/sessions/VideoMeetingModal.tsx).

---

## 16. How Notifications Work
- **Simple Explanation:** Keeping users informed about important events (new messages, swap proposals, session reminders).
- **SkillSwap Example:** When Bob accepts Alice's swap, a bell icon on Alice's header rings and shows a red "1" badge. If Alice has the browser tab closed, she receives a native desktop/mobile push notification.
- **Technical Implementation:**
  - In-app: Socket.IO event `notification:new` saved in `Notification` table.
  - Background Push: **RFC 8292 VAPID Web Push** dispatched via service worker `sw.js`.
- **Key Files:** [`server/src/services/notification.service.ts`](file:///e:/skillswap/server/src/services/notification.service.ts), [`server/src/services/pushNotification.service.ts`](file:///e:/skillswap/server/src/services/pushNotification.service.ts).

---

## 17. How Admin Authorization Works
- **Simple Explanation:** Ensuring only trusted staff can access platform controls, ban bad users, or resolve abuse complaints.
- **SkillSwap Example:** If a standard user types `/admin` in the browser, the frontend redirects them to `/dashboard`. If they try calling `/api/admin/overview` using Postman, the backend middleware inspects their token, sees `role: "USER"`, and responds with `403 Forbidden`.
- **Technical Implementation:** Middleware `requireRole(['ADMIN', 'MODERATOR'])` guards all admin routes. Every admin action is immutably recorded in `AdminAuditLog`.
- **Key Files:** [`server/src/middleware/auth.middleware.ts`](file:///e:/skillswap/server/src/middleware/auth.middleware.ts), [`server/src/controllers/admin.controller.ts`](file:///e:/skillswap/server/src/controllers/admin.controller.ts).

---

## 18. How AI Features Work
- **Simple Explanation:** Using machine learning to understand skills and generate structured study plans.
- **SkillSwap Example:** If Alice types "JS" and Bob teaches "JavaScript", the AI engine knows they are identical skills. If Alice wants to learn React, the AI generates a customized 4-stage roadmap with weekly milestones.
- **Technical Implementation:** Dual provider architecture: connects to Google Gemini API when configured; otherwise falls back to a built-in deterministic offline semantic engine.
- **Key Files:** [`server/src/services/ai/ai.service.ts`](file:///e:/skillswap/server/src/services/ai/ai.service.ts), [`server/src/services/ai/geminiAIProvider.ts`](file:///e:/skillswap/server/src/services/ai/geminiAIProvider.ts).

---

## 19. How Payment Integration Works
- **Simple Explanation:** Monetizing premium SaaS features (like unlimited swaps and advanced analytics) through subscription memberships.
- **SkillSwap Example:** A Free user can have at most 3 active swap proposals. When they upgrade to Pro ($15/month), the system creates a Stripe checkout session. Upon payment confirmation, the limit is unlocked.
- **Technical Implementation:** Payment provider abstraction supporting Stripe Checkout and Webhooks with an offline Sandbox/Mock mode for local development. Webhooks verify HMAC cryptographic signatures.
- **Key Files:** [`server/src/services/billing/billing.service.ts`](file:///e:/skillswap/server/src/services/billing/billing.service.ts), [`server/src/services/billing/stripePaymentProvider.ts`](file:///e:/skillswap/server/src/services/billing/stripePaymentProvider.ts).

---

## 20. How the Application Is Deployed
- **Simple Explanation:** Taking the project from your local computer and putting it on the internet so anyone in the world can visit it.
- **SkillSwap Example:** The frontend is compiled into fast static files and served globally by **Vercel's Edge CDN**. The backend Express server runs inside a **Docker container on Render**. The database is hosted on a managed cloud PostgreSQL cluster (Neon/Render).
- **Technical Implementation:** Configured via `client/vercel.json`, `render.yaml`, `Dockerfile`, and `docker-compose.yml`.
- **Key Files:** [`client/vercel.json`](file:///e:/skillswap/client/vercel.json), [`render.yaml`](file:///e:/skillswap/render.yaml), [`docker-compose.yml`](file:///e:/skillswap/docker-compose.yml).

