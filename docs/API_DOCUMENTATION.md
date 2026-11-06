# SkillSwap — Comprehensive API Documentation

**Version:** 2.1 (Production)  
**Base URL:** `/api`  
**Authentication:** Cookie-based JWT (`skillswap_token`) + Double-Submit CSRF (`x-csrf-token` header vs `skillswap_csrf` cookie)  
**Protocol:** RESTful JSON over HTTPS & WebSockets (Socket.IO v4)

---

## Table of Contents
1. [Authentication & Security Architecture](#authentication--security-architecture)
2. [Global Error & Response Formats](#global-error--response-formats)
3. [Health & Telemetry](#health--telemetry)
4. [Authentication Endpoints (`/api/auth`)](#authentication-endpoints)
5. [User Onboarding & Profile (`/api/onboarding`, `/api/users`)](#user-onboarding--profile-endpoints)
6. [Skills Catalog (`/api/skills`)](#skills-catalog-endpoints)
7. [Discovery & Matching Engine (`/api/matches`, `/api/discover`)](#discovery--matching-engine-endpoints)
8. [Swap Requests (`/api/swap-requests`)](#swap-requests-endpoints)
9. [Conversations & Chat (`/api/conversations`)](#conversations--chat-endpoints)
10. [Sessions & Video Meetings (`/api/sessions`)](#sessions--video-meetings-endpoints)
11. [Reviews & Ratings (`/api/reviews`)](#reviews--ratings-endpoints)
12. [Notifications (`/api/notifications`)](#notifications-endpoints)
13. [Socket.IO Real-Time Gateway](#socketio-real-time-gateway)
14. [User Reports (`/api/reports`)](#user-reports-endpoints)
15. [Platform Administration (`/api/admin`)](#platform-administration-endpoints)
16. [SaaS Monetization & Billing (`/api/billing`, `/api/admin/billing`)](#saas-monetization--billing-endpoints)
17. [AI-Powered Matching, Learning & Scheduling (`/api/ai`)](#ai-powered-endpoints)
18. [Gamification & Learning Analytics (`/api/gamification`, `/api/learning-analytics`, `/api/learning-goals`)](#gamification--learning-analytics-endpoints)
19. [Community Features & Study Groups (`/api/community`, `/api/community/groups`)](#community-features--study-groups-endpoints)
20. [Collaborative Learning & Group Sessions (`/api/community/groups/:id/...`)](#collaborative-learning--group-sessions-endpoints)
21. [Progressive Web App & Push Notifications (`/api/notifications/push/...`)](#progressive-web-app--push-notification-endpoints)


---

## 1. Authentication & Security Architecture

SkillSwap implements enterprise-grade authentication and authorization:
- **Session Tokens:** Signed JWT access tokens stored in `httpOnly`, `SameSite=Lax`, `Secure` (production) cookies named `skillswap_token`.
- **CSRF Defense:** Double-Submit CSRF strategy. Upon login/registration, a random cryptographically secure token is set in cookie `skillswap_csrf`. Every state-mutating HTTP request (`POST`, `PUT`, `PATCH`, `DELETE`) must supply this token in the `x-csrf-token` header.
- **Account Status Guard:** Deactivated accounts (`isDeactivated = true`) are rejected immediately by auth middleware and WebSocket connection handlers.
- **Onboarding Route Guard:** Users with `isOnboarded = false` are blocked from accessing operational application endpoints until completing onboarding.
- **Rate Limiting:** Auth routes enforce a strict limit of 5 failed attempts per 15-minute window per IP.

---

## 2. Global Error & Response Formats

### Standard Success Envelope
`````


json
{
  "success": true,
  "data": { ... }
}
`````




### Standard Paginated Envelope
`````


json
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
`````




### Standard Error Envelope
`````


json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided.",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address format."
      }
    ]
  }
}
`````




---

## 3. Health & Telemetry

### `GET /api/health`
Inspects server runtime and live PostgreSQL connection pool status.

- **Auth Required:** No
- **Response `200 OK`:**
`````


json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "latencyMs": 4
  },
  "uptimeSeconds": 14285,
  "timestamp": "2026-11-05T23:00:00.000Z"
}
`````




---

## 4. Authentication Endpoints

### `POST /api/auth/register`
Creates a new user record with Argon2id password hashing and sets session cookies.

- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
`````


json
{
  "name": "Jane Doe",
  "username": "janedoe",
  "email": "jane@example.com",
  "password": "Password123!"
}
`````



- **Response `201 Created`:** Sets `skillswap_token` & `skillswap_csrf` cookies.
`````


json
{
  "success": true,
  "data": {
    "user": {
      "id": 42,
      "name": "Jane Doe",
      "username": "janedoe",
      "email": "jane@example.com",
      "isOnboarded": false,
      "createdAt": "2026-11-05T23:00:00.000Z"
    }
  }
}
`````




### `POST /api/auth/login`
Authenticates user credentials and returns session cookies.

- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
`````


json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
`````



- **Response `200 OK`:** Sets `skillswap_token` & `skillswap_csrf` cookies.

### `GET /api/auth/me`
Retrieves currently authenticated session user.

- **Auth Required:** Yes
- **Response `200 OK`:** Returns user profile summary.

### `POST /api/auth/logout`
Terminates session and clears authentication cookies.

- **Auth Required:** Yes
- **Headers:** `x-csrf-token: <csrf_token>`
- **Response `200 OK`:** Clears `skillswap_token` & `skillswap_csrf`.

### `POST /api/auth/forgot-password`
Generates one-time 32-byte cryptographic password reset token (stored as SHA-256 in DB, 1-hour expiry). Zero token exposure in HTTP response.

- **Auth Required:** No
- **Request Body:** `{"email": "jane@example.com"}`
- **Response `200 OK`:** `{"success": true, "message": "If that email exists, password reset instructions have been sent."}`

### `POST /api/auth/reset-password`
Consumes one-time reset token, updates password hash with Argon2id, and invalidates token.

- **Auth Required:** No
- **Request Body:**
`````


json
{
  "token": "a4f8b912c...",
  "password": "NewSecurePassword456!"
}
`````



- **Response `200 OK`:** `{"success": true, "message": "Password successfully reset."}`

---

## 5. User Onboarding & Profile Endpoints

### `POST /api/onboarding`
Atomically completes user onboarding profile, skills, and availability in a database transaction.

- **Auth Required:** Yes
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "bio": "Full-stack engineer passionate about teaching React.",
  "location": "San Francisco, CA",
  "teachingSkills": [
    { "skillId": 12, "proficiencyLevel": "Expert" }
  ],
  "learningSkills": [
    { "skillId": 8, "targetLevel": "Beginner" }
  ],
  "availability": [
    { "day": "Monday", "slots": ["09:00 - 10:00", "14:00 - 15:00"] },
    { "day": "Wednesday", "slots": ["10:00 - 11:00"] }
  ]
}
`````



- **Response `200 OK`:** Returns updated profile with `isOnboarded: true`.

### `GET /api/users/me`
Fetches complete user profile including teaching skills, learning skills, availability schedule, reputation stats, and account settings.

- **Auth Required:** Yes
- **Response `200 OK`**

### `PATCH /api/users/me`
Updates core user profile fields (name, location, bio).

- **Auth Required:** Yes
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "name": "Jane Doe",
  "location": "New York, NY",
  "bio": "Updated bio..."
}
`````




### `GET /api/users/:username`
Public user profile endpoint for peer discovery. Returns verified ratings, review count, public teaching skills, learning goals, and public availability slots. Excludes sensitive security information.

- **Auth Required:** Yes

### `POST /api/users/me/change-password`
Changes current user's password after verifying existing password hash with Argon2id.

- **Auth Required:** Yes
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
`````




### `POST /api/users/me/deactivate`
Soft-deletes user account (`isDeactivated = true`). Immediately revokes authentication and hides profile from discovery.

- **Auth Required:** Yes
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:** `{"confirmation": "DEACTIVATE"}`

---

## 6. Skills Catalog Endpoints

### `GET /api/skills`
Returns the standardized global skills catalog with category classification.

- **Auth Required:** Yes
- **Query Params:**
  - `category` (optional): Filter by category (e.g. `Development`, `Design`, `Creative`, `Business`, `Languages`)
  - `search` (optional): Keyword search against skill names
- **Response `200 OK`:** Array of skill objects `{ id, name, category, description }`.

---

## 7. Discovery & Matching Engine Endpoints

### `GET /api/discover`
Search and filter community members with pagination.

- **Auth Required:** Yes
- **Query Params:**
  - `query`: Keyword text search (matches name, bio, teaching skills)
  - `category`: Filter by skill category
  - `level`: Filter by proficiency level
  - `page`: Page index (default: 1)
  - `limit`: Items per page (default: 12)

### `GET /api/matches`
Executes the SkillSwap Two-Way Reciprocal Matching Engine. Calculates match compatibility scores based on:
1. **Reciprocal Skill Match (60% weight):** Peer teaches what you want to learn AND learns what you can teach.
2. **Schedule Overlap (25% weight):** Shared availability slots across the week.
3. **Reputation & Ratings (15% weight):** Average star rating and completed swap count.

- **Auth Required:** Yes
- **Response `200 OK`:** Array of matches with detailed breakdown:
`````


json
{
  "success": true,
  "data": [
    {
      "user": { "id": 54, "name": "Bob Smith", "username": "bobsmith" },
      "matchScore": 92,
      "reasons": {
        "reciprocalSkills": true,
        "sharedSlots": 4,
        "rating": 4.9
      },
      "theyTeachYouLearn": [{ "id": 8, "name": "UI/UX Design" }],
      "youTeachTheyLearn": [{ "id": 12, "name": "React Dev" }]
    }
  ]
}
`````




---

## 8. Swap Requests Endpoints

### `POST /api/swap-requests`
Submits a reciprocal skill swap proposal.
**Validation Matrix:**
1. Sender cannot send request to themselves (`400 Bad Request`).
2. Sender must teach `senderSkillId` in their active teaching profile (`400 Bad Request`).
3. Sender must have `receiverSkillId` in their active learning goals (`400 Bad Request`).
4. Receiver must teach `receiverSkillId` in their active teaching profile (`400 Bad Request`).
5. Receiver must have `senderSkillId` in their active learning goals (`400 Bad Request`).
6. Active request cannot already exist between parties for these skills (`409 Conflict`).

- **Auth Required:** Yes
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "receiverId": 54,
  "senderSkillId": 12,
  "receiverSkillId": 8,
  "message": "Hi Bob! I'd love to exchange React tutoring for UI/UX mentoring."
}
`````



- **Response `201 Created`**

### `GET /api/swap-requests/incoming`
Lists all incoming pending swap requests for the authenticated user.

### `GET /api/swap-requests/outgoing`
Lists all outgoing swap requests sent by the authenticated user.

### `POST /api/swap-requests/:id/accept`
Accepts a swap request. **Atomically:**
1. Updates request status to `ACCEPTED`.
2. Automatically provisions a shared 1-on-1 `Conversation` record in PostgreSQL.
3. Dispatches real-time Socket.IO notification to the sender.

### `POST /api/swap-requests/:id/reject`
Rejects a swap request with status `REJECTED`.

### `POST /api/swap-requests/:id/cancel`
Cancels an outgoing swap request before receiver responds.

---

## 9. Conversations & Chat Endpoints

### `GET /api/conversations`
Lists all active conversations for the authenticated user with last message preview, timestamp, unread counter badge, and peer details.

### `GET /api/conversations/unread-count`
Returns total number of unread messages across all user conversations.

### `GET /api/conversations/:id/messages`
Retrieves cursor-paginated chat messages for a conversation.

- **Query Params:**
  - `cursor` (optional): Message ID for cursor pagination
  - `limit`: Number of messages (default: 50)

### `POST /api/conversations/:id/messages`
REST fallback for sending a chat message. Automatically persists in PostgreSQL and emits `receive_message` to the Socket.IO room.

- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:** `{"content": "Hello! Looking forward to our session."}`

### `POST /api/conversations/:id/read`
Marks all messages in the conversation as read for the authenticated user. Updates unread counters and emits read receipt.

---

## 10. Sessions & Video Meetings Endpoints

### `POST /api/sessions`
Schedules a learning session tied to an accepted swap request.
**Reciprocal Architecture:** A completed swap involves two paired sessions:
- Direction 1: User A teaches User B Skill 1.
- Direction 2: User B teaches User A Skill 2.

- **Auth Required:** Yes
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "swapRequestId": 18,
  "teacherId": 42,
  "learnerId": 54,
  "skillId": 12,
  "scheduledStart": "2026-11-10T14:00:00.000Z",
  "duration": 60,
  "notes": "Introduction to React Hooks & State Management"
}
`````



- **Response `201 Created`**

### `GET /api/sessions`
Lists user's upcoming and past sessions with filters:
- `status`: `SCHEDULED` | `COMPLETED` | `CANCELLED` | `RESCHEDULE_PROPOSED`
- `role`: `teacher` | `learner` | `all`

### `POST /api/sessions/:id/reschedule`
Proposes a new time for a scheduled session. Moves status to `RESCHEDULE_PROPOSED`.

### `POST /api/sessions/:id/reschedule/accept`
Peer accepts proposed reschedule time. Updates `scheduledStart` and sets status back to `SCHEDULED`.

### `POST /api/sessions/:id/reschedule/reject`
Peer rejects proposed time; session reverts to previous scheduled time.

### `POST /api/sessions/:id/cancel`
Cancels session with reason. Updates status to `CANCELLED`.

### `GET /api/sessions/:id/meeting`
Generates a secure Jitsi Meet room name and URL.
- Enforces access window: room only accessible from 15 minutes before scheduled start until 60 minutes after scheduled end.
- Authorizes only verified session teacher and learner.

### `POST /api/sessions/:id/complete`
Teacher marks session as completed. Transitions status to `PENDING_CONFIRMATION`.

### `POST /api/sessions/:id/complete/confirm`
Learner confirms session completion.
- Sets session status to `COMPLETED`.
- Increments `completedSessions` count for both participants.
- If both reciprocal directions are completed, marks parent `SwapRequest` as `COMPLETED`.
- Unlocks review submission for the learner.

---

## 11. Reviews & Ratings Endpoints

### `POST /api/reviews`
Submits a verified rating and written feedback.
**Security & Integrity Rules:**
1. Can only review sessions with status `COMPLETED`.
2. Only the learner (who received the teaching) can submit a review for the teacher.
3. Maximum 1 review per session (enforces uniqueness constraint).
4. Rating must be an integer between 1 and 5.

- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "sessionId": 85,
  "rating": 5,
  "feedback": "Outstanding mentor! Explained React custom hooks clearly with great practical examples."
}
`````



- **Response `201 Created`:** Automatically updates teacher's `averageRating` and `reviewCount` in PostgreSQL.

### `GET /api/reviews/user/:userId`
Retrieves public reviews and verified ratings received by a specific user.

- **Response `200 OK`:** Returns reviews list and reputation summary `{ averageRating, totalReviews, ratingDistribution }`.

---

## 12. Notifications Endpoints

### `GET /api/notifications`
Fetches user notifications with pagination.

### `GET /api/notifications/unread-count`
Returns count of unread notifications for badge display.

### `PATCH /api/notifications/:id/read`
Marks single notification as read.

### `POST /api/notifications/mark-all-read`
Marks all user notifications as read.

### `GET /api/users/me/notification-preferences`
Retrieves user's notification delivery preferences.

### `PATCH /api/users/me/notification-preferences`
Updates notification delivery toggles (e.g. disable email or push for specific categories).

---

## 13. Socket.IO Real-Time Gateway

**Namespace:** `/`  
**Authentication:** Cookie extraction on handshake (`skillswap_token`). Deactivated users rejected on connect.

### Client-to-Server Events
| Event | Payload | Description |
|---|---|---|
| `join_conversation` | `{ conversationId: number }` | Subscribes socket to conversation room (`conversation_<id>`). |
| `leave_conversation`| `{ conversationId: number }` | Unsubscribes from conversation room. |
| `send_message` | `{ conversationId: number, content: string }` | Sends message. Persists in DB and broadcasts. |
| `typing_start` | `{ conversationId: number }` | Broadcasts typing indicator to peers in room. |
| `typing_stop` | `{ conversationId: number }` | Broadcasts typing cessation to peers in room. |
| `mark_read` | `{ conversationId: number }` | Marks messages read and emits receipt. |

### Server-to-Client Events
| Event | Payload | Description |
|---|---|---|
| `receive_message` | `ChatMessage` | New chat message delivered to room participants. |
| `user_typing` | `{ conversationId: number, userId: number }` | Peer typing status update. |
| `user_stopped_typing`| `{ conversationId: number, userId: number }` | Peer typing cessation update. |
| `message_read` | `{ conversationId: number, userId: number }` | Read receipt acknowledgment. |
| `user_presence` | `{ userId: number, status: 'ONLINE' \| 'OFFLINE' }` | Global presence transition update. |
| `notification` | `Notification` | Real-time push notification for swap requests, sessions, reviews. |
| `error` | `{ message: string, code: string }` | Emitted when a socket operation violates authorization or fails. |

---

## 14. User Reports Endpoints (`/api/reports`)

### `POST /api/reports`
Submits a community moderation report against a user.

- **Authentication:** Required (`USER`, `MODERATOR`, or `ADMIN`)
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "reportedUserId": 42,
  "reason": "HARASSMENT",
  "description": "User exhibited unprofessional conduct and repeatedly sent inappropriate messages."
}
`````



- **Validation Rules:**
  - `reportedUserId`: positive integer. Self-reporting returns `400 Bad Request`.
  - `reason`: one of `HARASSMENT`, `SPAM`, `INAPPROPRIATE_BEHAVIOR`, `NO_SHOW`, `OFFENSIVE_CONTENT`, `OTHER`.
  - `description`: 10 to 2000 characters.
  - **Spam Guard:** Maximum 1 report per reporter against the same user per 24 hours. Duplicate attempts return `400 Bad Request`.
- **Response `201 Created`:**
`````


json
{
  "success": true,
  "data": {
    "report": {
      "id": 12,
      "reporterId": 7,
      "reportedUserId": 42,
      "reason": "HARASSMENT",
      "status": "PENDING",
      "createdAt": "2026-11-06T10:00:00.000Z"
    }
  }
}
`````




---

## 15. Platform Administration Endpoints (`/api/admin`)

Administrative endpoints require either `MODERATOR` or `ADMIN` role. Sensitive operational endpoints strictly require `ADMIN` role.

### Overview & Telemetry

#### `GET /api/admin/overview`
Returns platform-wide summary metrics.
- **Access:** `MODERATOR`, `ADMIN`
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "overview": {
      "users": { "total": 215, "active": 210, "suspended": 5, "onboarded": 198 },
      "skills": { "total": 85, "active": 83 },
      "swaps": { "total": 140, "pending": 12, "accepted": 35, "completed": 78, "rejected": 10, "cancelled": 5 },
      "sessions": { "total": 92, "scheduled": 8, "completed": 80, "cancelled": 4 },
      "reviews": { "total": 78, "averageRating": 4.88 },
      "reports": { "pending": 2 }
    }
  }
}
`````




#### `GET /api/admin/analytics/trends?days=30`
Returns chronological activity histograms grouped by day.
- **Access:** `MODERATOR`, `ADMIN`
- **Query Params:** `days` (default 30, max 90)
- **Response `200 OK`:** Returns array of daily `{ date, users, sessions, swaps }`.

#### `GET /api/admin/analytics/skills-popularity?limit=10`
Returns top skills ranked by teaching supply and learning demand.
- **Access:** `MODERATOR`, `ADMIN`
- **Response `200 OK`:** Returns array of `{ id, name, category, teachingCount, learningCount }`.

### User Directory & Lifecycle

#### `GET /api/admin/users?page=1&limit=20&search=john&status=ACTIVE&role=USER`
Paginated search across platform user accounts.
- **Access:** `MODERATOR`, `ADMIN`
- **Response `200 OK`:** Paginated list of users including status, role, session counts, and rating.

#### `POST /api/admin/users/:id/suspend`
Suspends a user account and revokes active access.
- **Access:** `ADMIN` strictly
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:** `{ "reason": "Repeated violation of code of conduct" }`
- **Response `200 OK`:** Automatically enqueues `ACCOUNT_SUSPENDED` transactional notification and records audit log. Self-suspension rejected with `400 Bad Request`.

#### `POST /api/admin/users/:id/reactivate`
Reactivates a previously suspended user account.
- **Access:** `ADMIN` strictly
- **Headers:** `x-csrf-token: <csrf_token>`
- **Response `200 OK`:** Clears suspension flags and records audit log.

#### `PATCH /api/admin/users/:id/role`
Updates a user's role.
- **Access:** `ADMIN` strictly
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:** `{ "role": "MODERATOR" }`
- **Response `200 OK`:** Updates role and records audit log. Self-demotion rejected with `400 Bad Request`.

### Community Moderation

#### `GET /api/admin/reports?status=PENDING&page=1&limit=20`
Lists submitted abuse reports with reporter and target user details.
- **Access:** `MODERATOR`, `ADMIN`
- **Response `200 OK`:** Paginated array of report tickets.

#### `PATCH /api/admin/reports/:id`
Resolves or dismisses a moderation report.
- **Access:** `MODERATOR`, `ADMIN`
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "status": "RESOLVED",
  "adminNotes": "Account warned for disrespectful language.",
  "suspendUser": false
}
`````



- **Response `200 OK`:** Updates report status and records resolution audit entry.

### Skill Catalog Administration

#### `POST /api/admin/skills`
Creates a new global skill in the platform catalog.
- **Access:** `ADMIN` strictly
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:** `{ "name": "Rust Programming", "category": "Development", "description": "Systems programming language" }`
- **Response `201 Created`:** Returns created skill.

#### `PATCH /api/admin/skills/:id`
Updates a skill or soft-disables it from active selection.
- **Access:** `ADMIN` strictly
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:** `{ "isDisabled": true }`
- **Response `200 OK`:** Non-destructive soft-disable preserving relational integrity.

### Platform Settings & Governance

#### `GET /api/admin/settings`
Retrieves all dynamic platform configuration toggles.
- **Access:** `ADMIN` strictly
- **Response `200 OK`:** Key-value map of platform settings.

#### `PUT /api/admin/settings`
Updates runtime platform settings.
- **Access:** `ADMIN` strictly
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "settings": {
    "registration_enabled": "true",
    "maintenance_mode": "false",
    "email_notifications_enabled": "true"
  }
}
`````



- **Response `200 OK`:** Persists configuration and logs audit action.

### Transactional Email & Reminder Queue

#### `GET /api/admin/emails?page=1&limit=20&status=PENDING`
Monitors outbound transactional email delivery jobs.
- **Access:** `MODERATOR`, `ADMIN`
- **Response `200 OK`:** Paginated queue jobs and status counters.

#### `POST /api/admin/emails/trigger-reminders`
Manually triggers an execution pass of the session reminder background worker.
- **Access:** `ADMIN` strictly
- **Headers:** `x-csrf-token: <csrf_token>`
- **Response `200 OK`:** Returns `{ "scanned": 12, "remindersQueued": 4 }`.

### Audit Logs

#### `GET /api/admin/audit?page=1&limit=50&action=USER_SUSPEND`
Retrieves immutable chronological audit trail of administrative actions.
- **Access:** `ADMIN` strictly
- **Response `200 OK`:** Paginated logs with acting administrator identity, action verb, target entity, metadata diff, IP, and timestamp.

---

## 16. SaaS Monetization & Billing Endpoints

### Public & Member Billing

#### `GET /api/billing/plans`
Retrieves public catalog of active subscription plans and plan entitlements.
- **Access:** Public (Unauthenticated & Authenticated)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": 1,
        "code": "FREE",
        "name": "Free Community",
        "monthlyPriceCents": 0,
        "yearlyPriceCents": 0,
        "currency": "USD",
        "features": ["3 Active Swap Proposals", "Standard Matching", "Jitsi Video Sessions"],
        "entitlements": { "maxActiveSwaps": 3, "advancedFilters": false, "priorityMatching": false }
      },
      {
        "id": 2,
        "code": "PRO",
        "name": "SkillSwap Pro",
        "monthlyPriceCents": 1500,
        "yearlyPriceCents": 14400,
        "currency": "USD",
        "features": ["10 Active Swap Proposals", "Priority Matching", "Advanced Filters"],
        "entitlements": { "maxActiveSwaps": 10, "advancedFilters": true, "priorityMatching": true }
      }
    ]
  }
}
`````




#### `GET /api/billing/subscription`
Returns current user subscription, status, entitlements, and real-time quota usage.
- **Access:** Authenticated User
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "subscription": {
      "planCode": "FREE",
      "status": "ACTIVE",
      "billingCycle": "NONE",
      "cancelAtPeriodEnd": false
    },
    "entitlements": {
      "planCode": "FREE",
      "planName": "Free Community",
      "status": "ACTIVE",
      "entitlements": { "maxActiveSwaps": 3, "advancedFilters": false },
      "usage": { "activeSwaps": 1, "maxActiveSwaps": 3 }
    }
  }
}
`````




#### `POST /api/billing/checkout`
Initiates a secure Stripe or Sandbox checkout session for upgrading to Pro or Premium.
- **Access:** Authenticated User
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "planCode": "PRO",
  "billingCycle": "MONTHLY",
  "successUrl": "https://skillswap.local/settings/billing?status=success",
  "cancelUrl": "https://skillswap.local/pricing"
}
`````



- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "sessionId": "cs_mock_1793943683593",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_mock_1793943683593",
    "provider": "mock"
  }
}
`````




#### `POST /api/billing/cancel`
Schedules subscription cancellation at the end of the current billing cycle. Access remains active until period end.
- **Access:** Authenticated User
- **Headers:** `x-csrf-token: <csrf_token>`
- **Response `200 OK`:** `{ "success": true, "message": "Subscription scheduled for cancellation at the end of billing period" }`

#### `POST /api/billing/reactivate`
Reactivates an active subscription that was previously scheduled for cancellation.
- **Access:** Authenticated User
- **Headers:** `x-csrf-token: <csrf_token>`
- **Response `200 OK`:** `{ "success": true, "message": "Subscription reactivated successfully" }`

#### `GET /api/billing/invoices?page=1&limit=20`
Returns paginated tax invoices and billing receipts with direct PDF and hosted download URLs.
- **Access:** Authenticated User (IDOR protected: strictly filtered to `req.user.id`)
- **Response `200 OK`:** Paginated invoice objects with `amountPaidCents`, `currency`, `invoiceNumber`, `invoicePdfUrl`.

#### `POST /api/billing/portal`
Generates a secure Stripe Customer Billing Portal session URL for managing cards and subscriptions.
- **Access:** Authenticated User
- **Headers:** `x-csrf-token: <csrf_token>`
- **Response `200 OK`:** `{ "success": true, "data": { "portalUrl": "https://billing.stripe.com/session/..." } }`

#### `POST /api/billing/webhook`
Cryptographically verified webhook receiver for Stripe / payment provider asynchronous lifecycle events.
- **Security:** HMAC-SHA256 signature verification (`stripe-signature` header), raw body verification, exempted from CSRF.
- **Idempotency:** Unique `eventId` deduplication via `BillingWebhookEvent`. Duplicate events return HTTP 200 without duplicate execution.
- **Handled Events:** `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.

---

### Admin Subscription & Revenue Endpoints

#### `GET /api/admin/billing/overview`
Returns real-time financial metrics, recurring revenues, and subscriber conversion rates.
- **Access:** `ADMIN` strictly
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "mrrCents": 15000,
    "arrCents": 180000,
    "totalRevenueCents": 45000,
    "activeSubscribers": 10,
    "conversionRate": 4.8,
    "failedPaymentRate": 0.0,
    "tiers": { "free": 190, "pro": 8, "premium": 2 },
    "subscriptionStatuses": { "active": 10, "pastDue": 0, "canceled": 1, "free": 190, "total": 201 }
  }
}
`````




#### `GET /api/admin/billing/subscriptions?page=1&limit=20&status=ACTIVE&planCode=PRO`
Lists subscriber profiles with filters and pagination.
- **Access:** `ADMIN` strictly
- **Response `200 OK`:** Paginated subscriber records with user details, current period start/end, and auto-renew status.

#### `GET /api/admin/billing/transactions?page=1&limit=20`
Chronological payment transaction ledger.
- **Access:** `ADMIN` strictly
- **Response `200 OK`:** Paginated transactions including amounts, currencies, statuses (`SUCCEEDED`, `FAILED`), payment IDs, and error reasons.

---

<a name="ai-powered-endpoints"></a>
## 17. AI-Powered Matching, Learning & Scheduling Endpoints (`/api/ai`)

#### `POST /api/ai/similarity`
Analyzes semantic similarity between two skill terms.
- **Access:** Public (No authentication required)
- **Request Body:**
`````


json
{
  "skillA": "React.js",
  "skillB": "React"
}
`````



- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "skillA": "React.js",
    "skillB": "React",
    "similarity": 0.95,
    "relationship": "ALIAS",
    "isCanonicalMatch": true,
    "canonicalSkillA": { "id": 1, "name": "React" },
    "canonicalSkillB": { "id": 1, "name": "React" },
    "explanation": "Approved alias: \"React.js\" and \"React\" resolve to canonical skill \"React\"."
  }
}
`````




#### `GET /api/ai/recommendations?page=1&limit=10&minScore=30`
Returns explainable reciprocal match recommendations ranked by multi-factor score.
- **Access:** Authenticated User (Onboarded)
- **Guarantees:** Strictly 100% two-way reciprocal eligibility. Suppressed users from negative feedback are excluded.
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": [
    {
      "userId": 42,
      "name": "Bob Mentor",
      "username": "bob_mentor",
      "avatarUrl": null,
      "location": "San Francisco, CA",
      "averageRating": 4.9,
      "totalReviews": 14,
      "score": 92,
      "recommendationReason": "Strong reciprocal match with mutual weekend availability",
      "explanation": "Alice teaches React matching Bob's learning goal; Bob teaches UI/UX Design matching Alice's learning goal. Both users available Saturday afternoon.",
      "matchedTeachingSkill": "UI/UX Design",
      "matchedLearningSkill": "React",
      "matchingDays": ["Saturday"],
      "userTimezone": "America/New_York",
      "partnerTimezone": "America/Los_Angeles"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
`````




#### `POST /api/ai/recommendations/feedback`
Submits feedback on a recommended user to tune future recommendations.
- **Access:** Authenticated User
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "recommendedUserId": 42,
  "feedbackType": "NOT_INTERESTED",
  "reason": "Looking for mobile design specific mentors"
}
`````



- **Response `200 OK`:** `{ "success": true, "data": { "id": 1, "feedbackType": "NOT_INTERESTED" } }`

#### `POST /api/ai/roadmaps`
Generates a personalized 4-stage learning roadmap.
- **Access:** Authenticated User
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "skillName": "React",
  "currentProficiency": "Beginner",
  "targetProficiency": "Advanced",
  "learningObjective": "Build full-stack web applications and master state management",
  "preferredPace": "MODERATE"
}
`````



- **Response `201 Created`:** Structured roadmap object with 4 milestones, estimated weeks, and progress tracking.

#### `GET /api/ai/roadmaps`
Lists authenticated user's active and completed learning roadmaps.
- **Access:** Authenticated User
- **Response `200 OK`:** Array of roadmaps with overall progress percentages.

#### `GET /api/ai/roadmaps/:id`
Retrieves detailed learning roadmap with milestones and suggested community mentors.
- **Access:** Authenticated User (IDOR protected: owner only)
- **Response `200 OK`:** Full roadmap with milestones array and `suggestedPartners` array of active community members teaching the skill.

#### `PATCH /api/ai/roadmaps/:id/milestones/:milestoneId`
Toggles milestone completion status and recalculates roadmap progress percentage.
- **Access:** Authenticated User (IDOR protected)
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:** `{ "isCompleted": true }`
- **Response `200 OK`:** Updated milestone object.

#### `DELETE /api/ai/roadmaps/:id`
Deletes a learning roadmap and associated milestones.
- **Access:** Authenticated User (IDOR protected)
- **Headers:** `x-csrf-token: <csrf_token>`
- **Response `200 OK`:** `{ "success": true, "message": "Learning roadmap deleted successfully" }`

#### `GET /api/ai/scheduling/suggestions?partnerId=42&durationMinutes=60`
Computes conflict-free, timezone-converted session meeting slots.
- **Access:** Authenticated User
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "partnerId": 42,
    "userTimezone": "America/New_York",
    "partnerTimezone": "America/Los_Angeles",
    "suggestions": [
      {
        "date": "2026-11-15",
        "dayOfWeek": "Saturday",
        "startTimeIso": "2026-11-15T19:00:00.000Z",
        "endTimeIso": "2026-11-15T20:00:00.000Z",
        "userLocalTime": "2:00 PM",
        "partnerLocalTime": "11:00 AM",
        "userTimezone": "America/New_York",
        "partnerTimezone": "America/Los_Angeles",
        "confidenceScore": 95,
        "reason": "Mutual Afternoon slot on Saturday"
      }
    ]
  }
}
`````




#### `POST /api/ai/assistant/chat`
Interacts with the guardrailed AI learning assistant for session preparation.
- **Access:** Authenticated User (Rate limited: 20 req / 10 min)
- **Headers:** `x-csrf-token: <csrf_token>`
- **Request Body:**
`````


json
{
  "question": "What questions should I ask my UI/UX mentor?",
  "context": {
    "targetSkill": "UI/UX Design",
    "sessionTopic": "Design Systems"
  }
}
`````



- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "reply": "Here are 3 key questions to ask your UI/UX mentor...",
    "suggestedFollowUps": [
      "How do I prepare wireframes?",
      "What design tools should I learn first?"
    ],
    "model": "SkillSwap-AI-Local"
  }
}
`````




#### `GET /api/ai/admin/overview`
Returns aggregate AI usage metrics, latency, and estimated token costs.
- **Access:** `ADMIN` or `MODERATOR`
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "totalRequests": 142,
    "totalPromptTokens": 28400,
    "totalCompletionTokens": 14200,
    "totalTokens": 42600,
    "totalEstimatedCostUsd": 0.0426,
    "averageLatencyMs": 18,
    "byFeature": {
      "RECOMMENDATION": { "requests": 50, "tokens": 15000, "estimatedCostUsd": 0.015 },
      "ROADMAP_GEN": { "requests": 40, "tokens": 16000, "estimatedCostUsd": 0.016 },
      "ASSISTANT_CHAT": { "requests": 52, "tokens": 11600, "estimatedCostUsd": 0.0116 }
    },
    "byProvider": {
      "LOCAL_DETERMINISTIC": { "requests": 142, "tokens": 42600, "estimatedCostUsd": 0.0426 }
    }
  }
}
`````




---

## 18. Gamification & Learning Analytics Endpoints

### 18.1 Gamification Status & Progress (`/api/gamification`)

#### `GET /api/gamification/status`
Returns the authenticated user's current level, title, XP breakdown, progress to next level, and streak info.
- **Access:** Authenticated User
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "levelInfo": {
      "currentLevel": 2,
      "title": "Active Learner",
      "totalXp": 140,
      "currentLevelXp": 100,
      "nextLevelXp": 250,
      "xpInCurrentLevel": 40,
      "xpRequiredForNextLevel": 150,
      "progressPercent": 26.67
    },
    "streak": {
      "currentStreak": 3,
      "longestStreak": 5,
      "lastActiveDate": "2026-11-06T12:00:00.000Z",
      "isEnabled": true
    }
  }
}
`````




#### `GET /api/gamification/achievements`
Returns the badge catalog with unlocked status, unlock timestamps, and featured states for the authenticated user.
- **Access:** Authenticated User
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": 1,
        "code": "FIRST_SWAP",
        "title": "First Swap Exchange",
        "description": "Complete your first reciprocal skill swap agreement",
        "category": "COMMUNITY",
        "badgeIcon": "Handshake",
        "xpReward": 50,
        "criteriaType": "SWAPS_COUNT",
        "criteriaThreshold": 1,
        "unlocked": true,
        "unlockedAt": "2026-11-06T10:00:00.000Z",
        "isFeatured": true
      }
    ]
  }
}
`````




#### `PATCH /api/gamification/achievements/:code/feature`
Toggles whether an unlocked achievement is featured on the user's public profile (maximum 3 featured badges).
- **Access:** Authenticated User
- **Request Body:**
`````


json
{
  "isFeatured": true
}
`````



- **Response `200 OK`:**
`````


json
{
  "success": true,
  "message": "Badge featured status updated"
}
`````




#### `GET /api/gamification/history`
Returns paginated XP transaction history for the authenticated user.
- **Access:** Authenticated User
- **Query Parameters:** `limit` (default 20), `offset` (default 0)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "userId": 42,
        "amount": 40,
        "actionType": "SESSION_LEARN",
        "idempotencyKey": "SESSION_LEARN:101",
        "description": "Completed verified learning session",
        "metadata": "{\"sessionId\":101}",
        "createdAt": "2026-11-06T11:00:00.000Z"
      }
    ],
    "total": 1
  }
}
`````




#### `POST /api/gamification/streak/toggle`
Enables or disables learning streak tracking for the user.
- **Access:** Authenticated User
- **Request Body:**
`````


json
{
  "isEnabled": false
}
`````



- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "streak": {
      "currentStreak": 3,
      "longestStreak": 5,
      "lastActiveDate": "2026-11-06T12:00:00.000Z",
      "isEnabled": false
    }
  }
}
`````




#### `PATCH /api/gamification/privacy`
Updates public profile gamification visibility preferences.
- **Access:** Authenticated User
- **Request Body:**
`````


json
{
  "showLevel": true,
  "showBadges": true,
  "showStats": true,
  "showActivityHeatmap": false,
  "showLearningGoals": false
}
`````



- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "privacy": {
      "showLevel": true,
      "showBadges": true,
      "showStats": true,
      "showActivityHeatmap": false,
      "showLearningGoals": false
    }
  }
}
`````




#### `GET /api/gamification/users/:username`
Returns public gamification summary for a user, respecting their privacy preferences.
- **Access:** Public (Optional Authenticated)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "levelInfo": {
      "currentLevel": 2,
      "title": "Active Learner",
      "totalXp": 140
    },
    "badges": [
      {
        "code": "FIRST_SWAP",
        "title": "First Swap Exchange",
        "description": "Complete your first reciprocal skill swap agreement",
        "badgeIcon": "Handshake",
        "isFeatured": true,
        "unlockedAt": "2026-11-06T10:00:00.000Z"
      }
    ],
    "stats": {
      "totalSessionsTaught": 3,
      "totalSessionsLearned": 4,
      "totalHoursTaught": 3.0,
      "totalHoursLearned": 4.0
    }
  }
}
`````




---

### 18.2 Learning Analytics (`/api/learning-analytics`)

#### `GET /api/learning-analytics/overview`
Aggregated learning analytics KPI metrics with time range filtering.
- **Access:** Authenticated User
- **Query Parameters:** `range` (`7d`, `30d`, `90d`, `all`; default `30d`)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "rangeDays": 30,
    "levelInfo": { ... },
    "xp": {
      "totalXp": 140,
      "earnedInRange": 80
    },
    "sessions": {
      "totalSessions": 4,
      "sessionsLearned": 2,
      "sessionsTaught": 2,
      "hoursLearned": 2.0,
      "hoursTaught": 2.0,
      "totalHours": 4.0
    },
    "skillsPracticed": 3,
    "roadmapStats": {
      "totalRoadmaps": 1,
      "completedMilestones": 3,
      "totalMilestones": 8,
      "completionPercent": 37.5
    },
    "goalsStats": {
      "activeGoals": 2,
      "completedGoals": 1
    },
    "streak": { ... },
    "privacy": { ... }
  }
}
`````




#### `GET /api/learning-analytics/activity`
Returns 365-day GitHub-style SVG activity heatmap breakdown by date.
- **Access:** Authenticated User
- **Query Parameters:** `year` (e.g. `2026`), `timezone` (e.g. `UTC`, `America/New_York`)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "year": 2026,
    "timezone": "UTC",
    "totalContributions": 12,
    "maxDayCount": 4,
    "days": [
      {
        "date": "2026-11-06",
        "count": 2,
        "level": 2,
        "sessionsLearned": 1,
        "sessionsTaught": 1,
        "milestones": 0
      }
    ]
  }
}
`````




#### `GET /api/learning-analytics/skills`
Returns breakdown of user's practice hours, sessions, and ratings per skill.
- **Access:** Authenticated User
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skillName": "React",
        "sessionsTaught": 2,
        "sessionsLearned": 0,
        "hoursTaught": 2.0,
        "hoursLearned": 0,
        "totalHours": 2.0,
        "averageRating": 5.0
      }
    ]
  }
}
`````




---

### 18.3 Personal Learning Goals (`/api/learning-goals`)

#### `GET /api/learning-goals`
List learning goals for the authenticated user with optional status filter.
- **Access:** Authenticated User
- **Query Parameters:** `status` (`IN_PROGRESS`, `COMPLETED`, `ABANDONED`)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "goals": [
      {
        "id": 1,
        "userId": 42,
        "title": "Complete 5 React Sessions",
        "goalType": "SESSIONS_COUNT",
        "targetValue": 5,
        "currentValue": 2,
        "unit": "sessions",
        "skillName": "React",
        "deadline": "2026-12-01T00:00:00.000Z",
        "status": "IN_PROGRESS",
        "completedAt": null,
        "progressPercent": 40.0
      }
    ]
  }
}
`````




#### `POST /api/learning-goals`
Create a new personal learning goal.
- **Access:** Authenticated User
- **Request Body:**
`````


json
{
  "title": "Complete 5 React Sessions",
  "goalType": "SESSIONS_COUNT",
  "targetValue": 5,
  "unit": "sessions",
  "skillName": "React",
  "deadline": "2026-12-01T00:00:00.000Z"
}
`````



- **Response `201 Created`**

#### `PATCH /api/learning-goals/:id`
Update a learning goal's title, currentValue, status, or deadline. If `currentValue >= targetValue` or `status` becomes `COMPLETED`, automatically awards +50 XP (idempotently).
- **Access:** Authenticated User (Owner Only; IDOR Protected)
- **Request Body:**
`````


json
{
  "currentValue": 5,
  "status": "COMPLETED"
}
`````



- **Response `200 OK`**

#### `DELETE /api/learning-goals/:id`
Delete a learning goal.
- **Access:** Authenticated User (Owner Only; IDOR Protected)
- **Response `200 OK`**

---

## 19. Community Features & Study Groups Endpoints

### Overview
The Community module provides discussion forums, skill-based categorization, Q&A with verified accepted answers (+25 XP integration), bounded threaded comments (depth 0, 1, 2), composite-unique voting, public & private study groups with role hierarchy, member queues, search, and abuse reporting.

---

### Community Posts & Discussions

#### `GET /api/community/posts`
List community discussion posts with optional filtering, search, and pagination. Excludes posts in private study groups unless the user is an active member or admin.
- **Access:** Public or Authenticated (context-aware member visibility)
- **Query Parameters:**
  - `categoryId` (optional, string or number): Filter by Skill ID or `'general'`
  - `postType` (optional): `DISCUSSION` | `QUESTION` | `RESOURCE`
  - `search` (optional, string): Case-insensitive keyword search on title and content
  - `sort` (optional): `newest` (default) | `most_upvoted` | `most_discussed`
  - `studyGroupId` (optional, number): Filter by specific study group cohort
  - `page` (optional, number, default 1)
  - `limit` (optional, number, default 20)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "Best practices for React 19 server actions",
        "content": "What are your recommended patterns for optimistic updates?",
        "postType": "QUESTION",
        "categoryId": 1,
        "studyGroupId": null,
        "isPinned": false,
        "isLocked": false,
        "isResolved": false,
        "acceptedCommentId": null,
        "upvotesCount": 5,
        "commentsCount": 3,
        "tags": ["react", "frontend"],
        "createdAt": "2026-11-06T10:00:00.000Z",
        "author": {
          "id": 2,
          "name": "Alice Developer",
          "username": "alicedev",
          "avatarUrl": null
        },
        "category": {
          "id": 1,
          "name": "React"
        },
        "userVote": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
`````




#### `POST /api/community/posts`
Create a new community discussion or question.
- **Access:** Authenticated User
- **Request Body:**
`````


json
{
  "title": "How to structure Prisma v8 RC contract models?",
  "content": "Can anyone share tips on multi-file contract modularization?",
  "postType": "QUESTION",
  "categoryId": 2,
  "studyGroupId": null,
  "tags": ["prisma", "database"]
}
`````



- **Response `201 Created`:** Returns created post object.

#### `GET /api/community/posts/:id`
Retrieve detailed post information, author details, category, associated study group, and current user's vote status.
- **Access:** Public or Authenticated (403 if post belongs to a private group the caller has not joined)
- **Response `200 OK`**

#### `PATCH /api/community/posts/:id`
Update an existing post's title, content, or tags.
- **Access:** Authenticated User (Author only; IDOR protected)
- **Request Body:**
`````


json
{
  "title": "Updated post title",
  "content": "Updated content with more clarity.",
  "tags": ["prisma", "postgres"]
}
`````



- **Response `200 OK`**

#### `DELETE /api/community/posts/:id`
Delete a community post and cascade clean associated comments and votes.
- **Access:** Authenticated User (Post Author or Moderator/Admin)
- **Response `200 OK`**

#### `POST /api/community/posts/:id/vote`
Toggle upvote on a community post. Strictly single vote per user (composite unique constraint). If user has already upvoted, vote is removed; otherwise upvote is cast.
- **Access:** Authenticated User
- **Request Body:** `{ "value": 1 }`
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "upvotesCount": 6,
    "userVote": 1
  }
}
`````




---

### Threaded Comments & Accepted Answers

#### `GET /api/community/posts/:id/comments`
Retrieve structured comment hierarchy for a post (depth 0, 1, 2) with soft-delete placeholders and caller's vote status.
- **Access:** Public or Authenticated
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "postId": 1,
      "parentId": null,
      "content": "Use useOptimistic combined with server actions.",
      "isAcceptedAnswer": true,
      "isDeleted": false,
      "upvotesCount": 4,
      "userVote": 1,
      "author": { "id": 3, "name": "Bob Senior", "username": "bobsenior", "avatarUrl": null },
      "replies": [
        {
          "id": 11,
          "postId": 1,
          "parentId": 10,
          "content": "Agreed! That ensures zero latency feeling.",
          "isAcceptedAnswer": false,
          "isDeleted": false,
          "upvotesCount": 1,
          "userVote": 0,
          "author": { "id": 2, "name": "Alice Developer", "username": "alicedev", "avatarUrl": null },
          "replies": []
        }
      ]
    }
  ]
}
`````




#### `POST /api/community/posts/:id/comments`
Create a top-level comment or threaded reply. Enforces max depth of 2 (replies to depth 2 attach to depth 2).
- **Access:** Authenticated User
- **Request Body:**
`````


json
{
  "content": "Here is the recommended pattern...",
  "parentId": 10
}
`````



- **Response `201 Created`**

#### `PATCH /api/community/comments/:id`
Edit comment content.
- **Access:** Authenticated User (Comment Author only)
- **Request Body:** `{ "content": "Updated explanation..." }`
- **Response `200 OK`**

#### `DELETE /api/community/comments/:id`
Soft-delete comment. Content replaced with `[Comment deleted by user]` to preserve threaded reply tree integrity.
- **Access:** Authenticated User (Comment Author or Moderator/Admin)
- **Response `200 OK`**

#### `POST /api/community/comments/:id/vote`
Toggle upvote on a comment. Strictly single vote per user (composite unique constraint).
- **Access:** Authenticated User
- **Request Body:** `{ "value": 1 }`
- **Response `200 OK`**

#### `POST /api/community/posts/:id/accept-answer`
Designate a comment as the accepted solution for a `QUESTION` post. Marks the post as `isResolved: true`, sets `acceptedCommentId`, and idempotently awards +25 XP to the answer author via the Gamification Engine.
- **Access:** Authenticated User (Post Author or Moderator/Admin)
- **Request Body:** `{ "commentId": 10 }`
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "post": { "id": 1, "isResolved": true, "acceptedCommentId": 10 },
    "xpAwarded": 25
  }
}
`````




---

### Study Groups & Cohorts

#### `GET /api/community/groups`
List public study groups and user's joined private groups.
- **Access:** Public or Authenticated
- **Query Parameters:** `visibility` (`PUBLIC` | `PRIVATE`), `search`, `page`, `limit`
- **Response `200 OK`**

#### `POST /api/community/groups`
Create a new study group cohort. Creator automatically becomes `OWNER` with active status.
- **Access:** Authenticated User
- **Request Body:**
`````


json
{
  "name": "Full-Stack TypeScript Study Cohort",
  "description": "Weekly deep-dives into modern TypeScript architectures and Prisma.",
  "skillId": 1,
  "visibility": "PUBLIC"
}
`````



- **Response `201 Created`**

#### `GET /api/community/groups/:id`
Get study group details, caller membership status, role, and member counts.
- **Access:** Public or Authenticated
- **Response `200 OK`**

#### `PATCH /api/community/groups/:id`
Update study group metadata.
- **Access:** Authenticated User (Group `OWNER`, `MODERATOR`, or Platform Admin)
- **Request Body:** `{ "name": "New Name", "description": "New Desc", "visibility": "PRIVATE" }`
- **Response `200 OK`**

#### `POST /api/community/groups/:id/join`
Join a study group. If `visibility: PUBLIC`, membership is immediately `APPROVED`. If `PRIVATE`, creates a `PENDING` request in the owner/moderator queue.
- **Access:** Authenticated User
- **Response `200 OK`**

#### `POST /api/community/groups/:id/leave`
Leave a study group. If the leaving user is the sole `OWNER`, ownership is automatically and safely transferred to the senior moderator or oldest member.
- **Access:** Authenticated User (Active Member)
- **Response `200 OK`**

#### `GET /api/community/groups/:id/members`
List approved members and pending join requests.
- **Access:** Authenticated User (Group Member or Admin)
- **Response `200 OK`**

#### `PATCH /api/community/groups/:id/members/:userId`
Approve/reject pending requests or promote/demote member roles (`MODERATOR`, `MEMBER`).
- **Access:** Authenticated User (Group `OWNER` or `MODERATOR`)
- **Request Body:** `{ "status": "APPROVED", "role": "MODERATOR" }`
- **Response `200 OK`**

#### `DELETE /api/community/groups/:id/members/:userId`
Remove or kick a member from the study group.
- **Access:** Authenticated User (Group `OWNER` or `MODERATOR`)
- **Response `200 OK`**

---

### Community Reporting & Analytics

#### `POST /api/community/reports`
Report inappropriate, spammy, or harassing posts or comments. Integrates with the platform moderation queue (`UserReport`).
- **Access:** Authenticated User
- **Request Body:**
`````


json
{
  "targetType": "POST",
  "targetId": 1,
  "reason": "SPAM",
  "details": "Contains unauthorized affiliate links."
}
`````



- **Response `201 Created`**

#### `GET /api/community/analytics`
Retrieve aggregated platform community KPIs.
- **Access:** Authenticated User
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "totalPosts": 42,
    "totalQuestions": 18,
    "resolvedQuestions": 14,
    "totalComments": 156,
    "totalGroups": 8,
    "totalMembers": 94
  }
}
`````




---

## 20. Collaborative Learning & Group Sessions Endpoints

Base path: `/api/community/groups/:id` (where `:id` is the study group ID).  
All endpoints require authentication (`skillswap_token` cookie + `x-csrf-token` header for mutating methods).

### Group Sessions & Jitsi Video Conferences

#### `GET /api/community/groups/:id/sessions`
List scheduled and completed sessions for a study group.
- **Access:** Active Group Members (or any authenticated user for PUBLIC groups)
- **Query Parameters:** `status` (optional: `SCHEDULED`, `LIVE`, `COMPLETED`, `CANCELED`)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "groupId": 14,
      "hostId": 42,
      "title": "React Server Components Architecture Review",
      "description": "Deep-dive session examining streaming SSR.",
      "topic": "Frontend Architecture",
      "startTime": "2026-11-10T14:00:00.000Z",
      "endTime": "2026-11-10T15:30:00.000Z",
      "timezone": "UTC",
      "maxParticipants": 15,
      "status": "SCHEDULED",
      "meetingRoomId": "skillswap-group-3a7b8e...",
      "meetingUrl": "https://meet.jit.si/skillswap-group-3a7b8e...",
      "host": { "id": 42, "name": "Sarah Connor", "username": "sarahc" },
      "participantCount": 8,
      "userRegistered": true,
      "canJoinMeeting": false
    }
  ]
}
`````




#### `POST /api/community/groups/:id/sessions`
Schedule a new cohort session with automatic Jitsi room provisioning.
- **Access:** Group `OWNER` or `MODERATOR`
- **Request Body:**
`````


json
{
  "title": "System Design Workshop: Distributed Caching",
  "description": "Designing Redis cluster architecture.",
  "topic": "System Design",
  "startTime": "2026-11-12T16:00:00.000Z",
  "endTime": "2026-11-12T17:30:00.000Z",
  "timezone": "UTC",
  "maxParticipants": 20
}
`````



- **Response `201 Created`**

#### `POST /api/community/groups/:id/sessions/:sessionId/cancel`
Cancel a scheduled group session.
- **Access:** Session Host, Group `OWNER`, or Group `MODERATOR`
- **Request Body:** `{ "reason": "Host emergency reschedule required." }`
- **Response `200 OK`**

---

### Registration & Verified Attendance

#### `POST /api/community/groups/:id/sessions/:sessionId/register`
Register for an upcoming group session. If current registered count reaches `maxParticipants`, registrant is automatically placed in the FIFO `WAITLIST`.
- **Access:** Active Group Member
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": {
    "status": "REGISTERED",
    "message": "Successfully registered for session."
  }
}
`````




#### `POST /api/community/groups/:id/sessions/:sessionId/unregister`
Cancel session registration. Automatically promotes the earliest waitlisted participant (`status: 'WAITLIST' -> 'REGISTERED'`) and dispatches a notification.
- **Access:** Registered User (Host cannot unregister)
- **Response `200 OK`:**
`````


json
{
  "success": true,
  "data": { "message": "Successfully unregistered from session." }
}
`````




#### `GET /api/community/groups/:id/sessions/:sessionId/participants`
List all registered, waitlisted, and attended participants for a session.
- **Access:** Group Members
- **Response `200 OK`**

#### `PATCH /api/community/groups/:id/sessions/:sessionId/participants/:participantUserId/attendance`
Host or moderator marks verified attendance for a participant.
- **Access:** Session Host, Group `OWNER`, or Group `MODERATOR`
- **Request Body:**
`````


json
{
  "isVerifiedAttendance": true,
  "status": "ATTENDED",
  "notes": "Actively participated in live exercises."
}
`````



- **Response `200 OK`**

---

### Shared Learning Resources & File Storage

#### `GET /api/community/groups/:id/resources`
List shared materials with filtering and search.
- **Access:** Group Members (or Public group)
- **Query Parameters:** `resourceType` (`LINK`, `NOTE`, `FILE`, `IMAGE`), `search` (keyword)
- **Response `200 OK`**

#### `POST /api/community/groups/:id/resources`
Upload notes, share external links, or upload documents/images (max 10MB, safe MIME whitelist).
- **Access:** Active Group Member
- **Request Body (Link / Note):**
`````


json
{
  "title": "Prisma v8 RC Architecture Whitepaper",
  "description": "Contract-based ORM reference.",
  "resourceType": "LINK",
  "url": "https://prisma.io/docs/v8",
  "visibility": "MEMBERS"
}
`````



- **Request Body (File Upload):**
`````


json
{
  "title": "Distributed Systems Cheatsheet",
  "resourceType": "FILE",
  "fileName": "distributed-systems.pdf",
  "mimeType": "application/pdf",
  "fileData": "<base64_encoded_binary_string>",
  "visibility": "MEMBERS"
}
`````



- **Response `201 Created`**

#### `GET /api/community/groups/:id/resources/:resourceId/download`
Authorized streaming download of private resource binary file. Validates active cohort membership before serving and increments `downloadCount` atomically.
- **Access:** Active Group Member
- **Response:** Binary stream with `Content-Disposition: attachment; filename="<filename>"`

#### `DELETE /api/community/groups/:id/resources/:resourceId`
Delete a shared resource and remove physical file from disk if present.
- **Access:** Resource Uploader, Group `OWNER`, or Group `MODERATOR`
- **Response `200 OK`**

---

### Collaborative Tasks & Learning Milestones

#### `GET /api/community/groups/:id/tasks`
List Kanban tasks for study group.
- **Access:** Group Members
- **Query Parameters:** `status` (`TODO`, `IN_PROGRESS`, `COMPLETED`), `assigneeId`
- **Response `200 OK`**

#### `POST /api/community/groups/:id/tasks`
Create a collaborative task with priority and optional assignee.
- **Access:** Active Group Member
- **Request Body:**
`````


json
{
  "title": "Build Real-Time Notification Microservice",
  "description": "Implement Redis Pub/Sub with Socket.IO gateway.",
  "priority": "HIGH",
  "assigneeId": 42,
  "dueDate": "2026-11-20T18:00:00.000Z"
}
`````



- **Response `201 Created`**

#### `PATCH /api/community/groups/:id/tasks/:taskId`
Update task progress, assignee, or priority. Transitioning to `COMPLETED` automatically sets `completedAt`.
- **Access:** Active Group Member
- **Request Body:** `{ "status": "COMPLETED" }`
- **Response `200 OK`**

#### `DELETE /api/community/groups/:id/tasks/:taskId`
Delete a collaborative task.
- **Access:** Task Creator, Group `OWNER`, or Group `MODERATOR`
- **Response `200 OK`**

#### `GET /api/community/groups/:id/milestones`
List cohort learning milestones.
- **Access:** Group Members
- **Response `200 OK`**

#### `POST /api/community/groups/:id/milestones`
Create a shared cohort milestone.
- **Access:** Group `OWNER` or `MODERATOR`
- **Request Body:** `{ "title": "Complete Capstone Project", "targetDate": "2026-12-01T00:00:00.000Z" }`
- **Response `201 Created`**

#### `PATCH /api/community/groups/:id/milestones/:milestoneId`
Update milestone status (`TODO`, `IN_PROGRESS`, `ACHIEVED`) and verification flag.
- **Access:** Group `OWNER` or `MODERATOR`
- **Response `200 OK`**

#### `DELETE /api/community/groups/:id/milestones/:milestoneId`
Delete milestone.
- **Access:** Group `OWNER` or `MODERATOR`
- **Response `200 OK`**

---

### Group Chat, Announcements & Analytics

#### `GET /api/community/groups/:id/messages`
Chronological message history for group chat.
- **Access:** Active Group Member
- **Query Parameters:** `limit` (default 50)
- **Response `200 OK`**

#### `POST /api/community/groups/:id/messages`
Send chat message to cohort room and broadcast in real time via Socket.IO `group:message:new`.
- **Access:** Active Group Member
- **Request Body:** `{ "content": "Welcome to our Saturday cohort session!" }`
- **Response `201 Created`**

#### `GET /api/community/groups/:id/announcements`
List announcements with pinned notices sorted first.
- **Access:** Group Members
- **Response `200 OK`**

#### `POST /api/community/groups/:id/announcements`
Publish an announcement to the group stream.
- **Access:** Group `OWNER` or `MODERATOR`
- **Request Body:** `{ "title": "Midterm Checkpoint", "content": "Please submit tasks before Friday.", "isPinned": true }`
- **Response `201 Created`**

#### `DELETE /api/community/groups/:id/announcements/:announcementId`
Delete an announcement.
- **Access:** Author, Group `OWNER`, or Group `MODERATOR`
- **Response `200 OK`**

#### `GET /api/community/groups/:id/analytics`
Retrieve aggregated live PostgreSQL learning and participation KPIs.
- **Access:** Group Members (or Public group)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "groupId": 14,
    "groupName": "Frontend Architecture Cohort",
    "totalMembers": 28,
    "scheduledSessions": 4,
    "completedSessions": 2,
    "totalSessions": 6,
    "verifiedAttendanceCount": 18,
    "sharedResourcesCount": 12,
    "totalTasks": 15,
    "completedTasks": 11,
    "taskCompletionRate": 73.3,
    "totalMilestones": 4,
    "achievedMilestones": 3,
    "milestoneProgressRate": 75.0,
    "totalMessages": 142
  }
}
```

---

## 21. Progressive Web App & Push Notification Endpoints

SkillSwap implements standards-based Web Push notifications compliant with RFC 8292 (VAPID) and the W3C Push API.

### `GET /api/notifications/push/public-key`
Retrieve the application server's VAPID public key required by browser `PushManager.subscribe()`.
- **Access:** Public (No authentication required)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "publicKey": "BEMJEc0SSeD7V7hSKwinFmepDVt_BTMoWnleMePjKvIm03PK6Cx7o5WQ1mOLwcj3sAVDVK7SRL3rppxJufQd4Kg"
  }
}
```

### `POST /api/notifications/push/subscribe`
Register or update an active browser device push subscription.
- **Access:** Authenticated User
- **Request Headers:**
  - `Content-Type: application/json`
  - `x-csrf-token: <csrf-token>`
  - `User-Agent: <client-browser-agent>`
- **Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/token-string",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0AgtkyVEqphWO646TG45En8G3TJXC3+fukn4=",
    "auth": "tBHItJI5svbpez7KI4CCXg=="
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Push subscription registered successfully",
  "data": {
    "id": 14,
    "endpoint": "https://fcm.googleapis.com/fcm/send/token-string",
    "createdAt": "2026-11-06T15:00:00.000Z",
    "subscription": {
      "id": 14,
      "endpoint": "https://fcm.googleapis.com/fcm/send/token-string",
      "createdAt": "2026-11-06T15:00:00.000Z"
    }
  }
}
```

### `POST /api/notifications/push/unsubscribe`
Unregister a device push subscription. Protected against IDOR.
- **Access:** Authenticated User
- **Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/token-string"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Push subscription removed successfully"
}
```
- **Error `404 Not Found`:** Returned if the specified endpoint does not belong to the authenticated user.

### `GET /api/notifications/push/subscriptions`
List all active push endpoints registered to the authenticated user's account.
- **Access:** Authenticated User
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": 14,
        "endpoint": "https://fcm.googleapis.com/fcm/send/token-string",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        "createdAt": "2026-11-06T15:00:00.000Z"
      }
    ]
  }
}
```

### `POST /api/notifications/push/test`
Send an instant test push notification to all active devices registered to the user.
- **Access:** Authenticated User
- **Request Body (Optional):**
```json
{
  "title": "Test Push Notification",
  "body": "Checking real-time browser push delivery"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Test push notification dispatched",
  "data": {
    "sentCount": 1,
    "failureCount": 0
  }
}
```

### `PATCH /api/users/me/notification-preferences` (Extended)
Update push delivery preferences and granular channels.
- **Access:** Authenticated User
- **Request Body:**
```json
{
  "pushEnabled": true,
  "pushSwapRequests": true,
  "pushMessages": true,
  "pushSessions": true,
  "pushReminders": true,
  "pushGroupActivity": false
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "data": {
    "preferences": {
      "swapRequests": true,
      "messages": true,
      "sessions": true,
      "reviews": true,
      "emailAlerts": true,
      "pushEnabled": true,
      "pushSwapRequests": true,
      "pushMessages": true,
      "pushSessions": true,
      "pushReminders": true,
      "pushGroupActivity": false
    }
  }
}
```
