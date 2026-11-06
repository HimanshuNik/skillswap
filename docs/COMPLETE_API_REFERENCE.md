# SkillSwap — Complete REST API Reference & Endpoint Inventory

**Version:** 1.0.0 (Production Blueprint)  
**Base URL:** `/api`  
**Authentication:** Cookie-based JWT (`skillswap_token`) + Double-Submit CSRF (`x-csrf-token` header vs `skillswap_csrf` cookie)  
**Protocol:** RESTful JSON over HTTPS  
**Author:** Principal Full-Stack Architect & API Engineer  
**Evaluation Date:** 2026-11-06  

---

## Global Response Formats

### Success Envelope
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Success Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided.",
    "statusCode": 400,
    "details": [
      {
        "field": "email",
        "message": "Invalid email address format."
      }
    ],
    "timestamp": "2026-11-06T12:00:00.000Z",
    "requestId": "uuid-v4-string"
  }
}
```

---

## 1. System Health & Telemetry

### `GET /api/health`
- **Purpose:** System heartbeat and database connection pool verification.
- **Auth:** Public.
- **Role:** All.
- **Request Body:** None.
- **Response:** `200 OK`
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "queryLatencyMs": 2.4,
    "uptime": 86400,
    "timestamp": "2026-11-06T12:00:00.000Z"
  }
  ```
- **DB Operations:** Executes `SELECT 1` ping via PostgreSQL connection pool.
- **Error Cases:** `503 Service Unavailable` if database disconnected.
- **Source Files:** `server/src/routes/health.routes.ts`, `server/src/controllers/health.controller.ts`.

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/register`
- **Purpose:** Register new user account.
- **Auth:** Public.
- **Role:** All.
- **Request Body:**
  ```json
  {
    "name": "Alice Johnson",
    "username": "alice",
    "email": "alice@example.com",
    "password": "Password123!"
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": 1, "name": "Alice Johnson", "username": "alice", "email": "alice@example.com", "role": "USER", "isOnboarded": false }
    }
  }
  ```
- **DB Operations:** Reads `User` for duplicate email/username; inserts row into `User` with Argon2id hash; enqueues `EmailQueue` welcome email.
- **Error Cases:** `409 Conflict` (duplicate email or username), `400 Bad Request` (reserved username or weak password).
- **Source Files:** `server/src/routes/auth.routes.ts`, `server/src/controllers/auth.controller.ts`.

### `POST /api/auth/login`
- **Purpose:** Authenticate user and issue HTTP-only JWT and CSRF cookies.
- **Auth:** Public (Rate limited: 15/15min).
- **Request Body:** `{ "email": "alice@example.com", "password": "Password123!" }`
- **Response:** `200 OK` with user profile. Attaches cookies `skillswap_token` (httpOnly) and `skillswap_csrf`.
- **DB Operations:** Reads `User` by email; verifies Argon2id hash.
- **Error Cases:** `401 Unauthorized` (generic "Invalid email or password"), `403 Forbidden` (account suspended or deactivated).

### `POST /api/auth/logout`
- **Purpose:** Invalidate session and clear auth cookies.
- **Auth:** Authenticated.
- **Response:** `200 OK` with cookies cleared (`Max-Age=0`).

### `GET /api/auth/me`
- **Purpose:** Return current authenticated user session.
- **Auth:** Authenticated (`skillswap_token` cookie required).
- **Response:** `200 OK` with user profile and role.
- **Error Cases:** `401 Unauthorized` (missing/expired token).

### `POST /api/auth/change-password`
- **Purpose:** Update user password securely.
- **Auth:** Authenticated.
- **Request Body:** `{ "currentPassword": "...", "newPassword": "..." }`
- **Response:** `200 OK`.
- **DB Operations:** Verifies current password hash; updates `User.passwordHash` with new Argon2id hash.
- **Error Cases:** `400 Bad Request` (incorrect current password or new password < 8 chars).

---

## 3. Onboarding & Skills Catalog (`/api/onboarding`, `/api/skills`)

### `GET /api/skills`
- **Purpose:** Fetch 35-skill global taxonomy catalog with categories.
- **Auth:** Public.
- **Response:** `200 OK` with array of skill objects `{ id, name, category, description }`.
- **DB Operations:** Served from in-memory cache (< 2ms) populated from `Skill` table.

### `POST /api/onboarding`
- **Purpose:** Atomically complete 4-step onboarding wizard.
- **Auth:** Authenticated.
- **Request Body:**
  ```json
  {
    "bio": "Full-stack engineer learning UI/UX design.",
    "location": "San Francisco, CA",
    "teachingSkills": [
      { "skillId": 1, "proficiency": "ADVANCED" }
    ],
    "learningSkills": [
      { "skillId": 4, "priority": "HIGH" }
    ],
    "availability": [
      { "dayOfWeek": "MONDAY", "startTime": "09:00", "endTime": "12:00" }
    ]
  }
  ```
- **Response:** `200 OK` with `{ "isOnboarded": true }`.
- **DB Operations:** Atomic transaction: updates `User.bio`, `location`, `isOnboarded=true`; inserts into `UserTeachingSkill`, `UserLearningSkill`, `UserAvailability`, and `UserXP`.
- **Error Cases:** `400 Bad Request` (empty skills or overlapping teach/learn skills).

---

## 4. Discovery & Reciprocal Matching (`/api/users`, `/api/matches`)

### `GET /api/users`
- **Purpose:** Paginated search and discovery directory.
- **Auth:** Authenticated.
- **Query Params:** `page`, `limit`, `search`, `category`.
- **Response:** `200 OK` with paginated user list (excluding self and un-onboarded users).
- **DB Operations:** Queries `User` joined with skills, filtering `isActive=true, isSuspended=false`.

### `GET /api/matches`
- **Purpose:** Deterministic 5-factor reciprocal matching engine.
- **Auth:** Authenticated.
- **Response:** `200 OK` with ranked array of reciprocal partner cards:
  ```json
  [
    {
      "user": { "id": 2, "name": "Bob", "username": "bob" },
      "compatibilityScore": 92,
      "breakdown": {
        "reciprocalScore": 60,
        "secondaryScore": 12,
        "scheduleScore": 11,
        "reputationScore": 9
      },
      "reciprocalSkills": ["React", "UI/UX Design"]
    }
  ]
  ```
- **DB Operations:** Queries candidate users with complementary skill combinations; calculates schedule intersection.

---

## 5. Swap Requests (`/api/swap-requests`)

### `POST /api/swap-requests`
- **Purpose:** Propose a reciprocal skill exchange.
- **Auth:** Authenticated.
- **Request Body:**
  ```json
  {
    "receiverId": 2,
    "senderSkillId": 1,
    "receiverSkillId": 4,
    "message": "Hi Bob, let's exchange React for UI/UX!"
  }
  ```
- **Response:** `201 Created` with proposal record.
- **DB Operations:** Validates reciprocal skills; inserts `SwapRequest` (`PENDING`); enqueues notification.
- **Error Cases:** `409 Conflict` (active request exists), `403 Forbidden` (Free plan quota exceeded: max 3).

### `GET /api/swap-requests/incoming` & `GET /api/swap-requests/outgoing`
- **Purpose:** Fetch incoming or outgoing proposals for current user.
- **Auth:** Authenticated.
- **Response:** `200 OK` with proposal arrays.

### `PATCH /api/swap-requests/:id/accept`
- **Purpose:** Accept incoming proposal and initialize conversation.
- **Auth:** Authenticated (Must be `receiverId`).
- **Response:** `200 OK` with `{ conversationId: 10 }`.
- **DB Operations:** Atomic transaction: updates `SwapRequest.status = ACCEPTED`; creates `Conversation` and two `ConversationParticipant` rows.

### `PATCH /api/swap-requests/:id/reject` & `PATCH /api/swap-requests/:id/cancel`
- **Purpose:** Reject or cancel proposal.
- **Auth:** Authenticated.
- **Response:** `200 OK`.

---

## 6. Conversations & Messaging (`/api/conversations`)

### `GET /api/conversations`
- **Purpose:** List active conversations for current user with unread counts.
- **Auth:** Authenticated.
- **Response:** `200 OK` with conversation array.

### `GET /api/conversations/:id/messages`
- **Purpose:** Cursor-paginated message history for a conversation.
- **Auth:** Authenticated (Must be participant).
- **Response:** `200 OK` with message array.
- **Error Cases:** `403 Forbidden` (non-participants).

### `POST /api/conversations/:id/messages`
- **Purpose:** Send message (REST fallback to Socket.IO).
- **Auth:** Authenticated.
- **Request Body:** `{ "content": "Hello!", "clientMessageId": "uuid-123" }`
- **Response:** `201 Created`.
- **DB Operations:** Deduplicates via `clientMessageId`; inserts `Message`; updates `Conversation.updatedAt`.

### `PATCH /api/conversations/:id/read`
- **Purpose:** Mark all messages in conversation as read.
- **Auth:** Authenticated.
- **Response:** `200 OK`.

---

## 7. Sessions & Video Meetings (`/api/sessions`)

### `POST /api/sessions`
- **Purpose:** Schedule a reciprocal session.
- **Auth:** Authenticated.
- **Request Body:**
  ```json
  {
    "swapRequestId": 1,
    "hostId": 1,
    "attendeeId": 2,
    "teachingSkillId": 1,
    "startTime": "2026-11-10T15:00:00.000Z",
    "endTime": "2026-11-10T16:00:00.000Z"
  }
  ```
- **Response:** `201 Created` with tokenized `jitsiRoom`.
- **DB Operations:** Conflict checks; inserts into `Session` (`SCHEDULED`).

### `POST /api/sessions/:id/complete`
- **Purpose:** Mark session as completed.
- **Auth:** Authenticated (Host or Attendee).
- **Response:** `200 OK`.
- **DB Operations:** Updates `Session.status = COMPLETED`; awards +40 XP in `XPTransaction`.
- **Error Cases:** `400 Bad Request` if completed before start time minus 15 minutes.

---

## 8. Reviews & Ratings (`/api/reviews`)

### `POST /api/reviews`
- **Purpose:** Submit verified review for completed session.
- **Auth:** Authenticated.
- **Request Body:**
  ```json
  {
    "sessionId": 5,
    "rating": 5,
    "comment": "Exceptional React teacher!"
  }
  ```
- **Response:** `201 Created`.
- **DB Operations:** Atomic transaction: validates session is COMPLETED; inserts `Review`; recalculates `User.averageRating`, `totalReviews`, and `completedTeachingSessions`.
- **Error Cases:** `409 Conflict` (duplicate review), `403 Forbidden` (non-participant).

---

## 9. Community Forums & Study Groups (`/api/community`)

### `GET /api/community/posts` & `POST /api/community/posts`
- **Purpose:** List community posts with filters; create new post (`DISCUSSION`, `QUESTION`, `RESOURCE`).
- **Auth:** `GET` is public; `POST` is authenticated.
- **DB Operations:** Reads/inserts `CommunityPost`.

### `POST /api/community/posts/:id/comments`
- **Purpose:** Add comment or threaded reply.
- **Auth:** Authenticated.
- **DB Operations:** Inserts `PostComment`; increments `CommunityPost.commentsCount`.

### `POST /api/community/comments/:id/accept`
- **Purpose:** Question author marks comment as accepted answer.
- **Auth:** Authenticated (Must be question author).
- **Response:** `200 OK` (awards +25 XP to answer author).

### `POST /api/community/vote`
- **Purpose:** Upvote/downvote post or comment (toggle).
- **Auth:** Authenticated.
- **DB Operations:** Inserts or deletes from `CommunityVote`.

### `GET /api/community/groups` & `POST /api/community/groups`
- **Purpose:** List study groups; create study group.
- **Auth:** `GET` is public; `POST` is authenticated.

### `POST /api/community/groups/:id/join`
- **Purpose:** Join public study group or request to join private group.
- **Auth:** Authenticated.
- **DB Operations:** Inserts into `StudyGroupMember`.

---

## 10. Platform Administration (`/api/admin`)

### `GET /api/admin/overview`
- **Purpose:** Real-time platform metrics and health indicators.
- **Auth:** Authenticated.
- **Role Required:** `ADMIN` or `MODERATOR`.
- **Response:** `200 OK` with platform aggregates.

### `POST /api/admin/users/:id/suspend` & `POST /api/admin/users/:id/reactivate`
- **Purpose:** Suspend or reactivate user account.
- **Auth:** Authenticated.
- **Role Required:** `ADMIN` (Moderators receive 403).
- **DB Operations:** Updates `User.isSuspended`; inserts into `AdminAuditLog`.

### `GET /api/admin/reports` & `PATCH /api/admin/reports/:id`
- **Purpose:** Moderation abuse report queue and resolution.
- **Auth:** Authenticated.
- **Role Required:** `ADMIN` or `MODERATOR`.

### `GET /api/admin/audit`
- **Purpose:** Inspect immutable administrative audit logs.
- **Auth:** Authenticated.
- **Role Required:** `ADMIN`.

---

## 11. SaaS Monetization & Subscriptions (`/api/billing`)

### `GET /api/billing/plans`
- **Purpose:** Public catalog of plans (`FREE`, `PRO`, `PREMIUM`).
- **Auth:** Public.

### `POST /api/billing/checkout`
- **Purpose:** Create checkout session for Pro/Premium.
- **Auth:** Authenticated.
- **Request Body:** `{ "planId": 2, "billingCycle": "MONTHLY" }`
- **Response:** `201 Created` with `{ "checkoutUrl": "..." }`.

### `POST /api/billing/webhook`
- **Purpose:** Stripe webhook endpoint with HMAC signature verification.
- **Auth:** Stripe signature header.
- **DB Operations:** Idempotent processing of subscription activation, renewal, and failure.

---

## 12. AI Features (`/api/ai`)

### `POST /api/ai/similarity`
- **Purpose:** Semantic skill similarity calculation without external dependencies.
- **Auth:** Public.
- **Request Body:** `{ "termA": "JS", "termB": "JavaScript" }`
- **Response:** `200 OK` with `{ "score": 1.0, "relationship": "ALIAS" }`.

### `POST /api/ai/roadmaps` & `GET /api/ai/roadmaps`
- **Purpose:** Generate and retrieve personalized 4-stage learning roadmaps.
- **Auth:** Authenticated.
- **Response:** `201 Created` with structured milestones.

### `POST /api/ai/assistant/chat`
- **Purpose:** AI learning assistant for session preparation.
- **Auth:** Authenticated (Rate limited: 30/min).
- **Request Body:** `{ "message": "How do I explain React closures?" }`
- **Response:** `200 OK` with conversational guidance and follow-up topics.

