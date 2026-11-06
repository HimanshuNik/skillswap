# SkillSwap — Phase 18: AI-Powered Matching, Personalized Learning & Smart Scheduling Report

**Date:** November 6, 2026  
**Status:** COMPLETE & VERIFIED (16/16 Integration Tests Passing)  
**Backend:** Node.js Express 5 + TypeScript, Prisma v8 RC Contract ORM, PostgreSQL  
**Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, TanStack Query  
**AI Providers:** Google Gemini REST API (`GeminiAIProvider`) + Offline Deterministic Engine (`LocalDeterministicAIProvider`)  

---

## 1. Executive Summary

Phase 18 extends the SkillSwap platform with practical, explainable, and privacy-preserving AI capabilities while strictly defending the fundamental peer-to-peer reciprocal skill exchange model:
- **Reciprocal Matching Invariant Preserved:** AI never overrides mutual eligibility. Matches strictly require two-way reciprocity: **User A teaches what User B wants to learn AND User B teaches what User A wants to learn**. AI elevates ranking, explains compatibility nuances, and estimates schedule overlap.
- **Semantic Skill Similarity & Canonical Resolution:** Exact catalog matches (1.00), approved aliases (0.95), domain-adjacent related skills (0.50–0.70), and unrelated domains (<0.30) are cleanly disambiguated.
- **Explainable Recommendations & Feedback Loop:** Transparent match rationale is presented to users with feedback controls (`HELPFUL`, `NOT_RELEVANT`, `ALREADY_CONNECTED`, `NOT_INTERESTED`). Negative feedback immediately suppresses non-relevant users from future suggestions.
- **Personalized Multi-Stage Learning Roadmaps:** Generates structured 4-stage learning milestones with actionable topics, practice project ideas, mentor discussion goals, progress tracking (0–100%), and direct discovery of community mentors teaching the subject.
- **Smart Conflict-Free Scheduling:** Computes advisory meeting slots across cross-timezone partners with working-hours clamping, mutual weekly availability mapping, 2-hour notice windows, and automatic slot exclusion when bookings occur.
- **Guardrailed AI Learning Assistant:** Context-aware interactive assistant providing session preparation advice and study plans, protected by prompt injection filters, rate limiters, credential redaction, and strict sandbox safety.
- **Dual-Provider Architecture with Zero CI/CD Cost:** `IAIProvider` contract abstracts external LLM services. Uses `LocalDeterministicAIProvider` for lightning-fast, offline, deterministic execution during development and CI, with seamless failover from `GeminiAIProvider`.
- **Token & Cost Observability:** Every completion records prompt/completion tokens, latency, provider name, and estimated cost in PostgreSQL, accessible via the administrator AI analytics endpoint.

---

## 2. System Architecture & Provider Abstraction

```
+----------------------------------------------------------------------------------------------------+
|                                    SKILLSWAP AI ARCHITECTURE                                       |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ React 19 Frontend ]                                                                             |
|      ├── /matches               (AI Smart Recommendations Tab with explainable scores & feedback)  |
|      ├── /learning-roadmap      (Interactive 4-stage roadmaps, milestone checklists, mentor cards)  |
|      ├── ScheduleSessionModal   (AI Recommended Times chips with timezone conversion)              |
|      └── AIAssistantDrawer      (Floating context-aware learning assistant with follow-up chips)   |
|                                                                                                    |
|                                         │ REST API (/api/ai/*)                                     |
|                                         ▼                                                          |
|  [ Express 5 AI Controllers & Services ]                                                           |
|      ├── RecommendationService  (Reciprocal candidate filtering, multi-factor ranking, feedback)  |
|      ├── SkillSimilarityService (Exact / Alias / Related / Unrelated semantic analysis)            |
|      ├── LearningRoadmapService (Plan generation, milestone tracking, peer partner suggestions)   |
|      ├── SmartSchedulingService (Timezone translation, conflict avoidance, notice window)          |
|      └── AIAssistantService     (Prompt defense, rate limiting, credential leak prevention)        |
|                                                                                                    |
|                                         │ Provider Factory (`getAIProvider()`)                     |
|                                         ▼                                                          |
|  [ IAIProvider Contract ]                                                                          |
|      ├── LocalDeterministicAIProvider  <── Default for offline, CI/CD, fast deterministic scoring  |
|      └── GeminiAIProvider              <── Google Gemini REST API with automatic offline fallback  |
|                                                                                                    |
|                                         │ Contract-based DB Layer                                  |
|                                         ▼                                                          |
|  [ PostgreSQL Schema (Prisma v8 RC Contract) ]                                                     |
|      ├── SkillAlias                     (Approved alias mappings & canonical resolution)           |
|      ├── LearningRoadmap                (User roadmaps, target goals, pace, estimated duration)    |
|      ├── RoadmapMilestone               (Milestones, topics JSON, practice projects JSON, status)  |
|      ├── RecommendationFeedback         (User ratings, feedback type, suppression maps)           |
|      └── AIUsageRecord                  (Tokens, latency, estimated cost, feature analytics)       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### Provider Implementation Comparison

| Capability | `LocalDeterministicAIProvider` | `GeminiAIProvider` |
| :--- | :--- | :--- |
| **Network Requirement** | None (100% offline) | HTTPS to `generativelanguage.googleapis.com` |
| **Latency** | < 5 ms | 400 – 1,200 ms |
| **Cost** | $0.00 | Free tier / Usage-based |
| **Deterministic Testing** | 100% reproducible | Probabilistic |
| **Fallback Handling** | Ultimate fallback target | Gracefully falls back to local provider on error or timeout |
| **Semantic Analysis** | Synonym sets, Jaccard/Levenshtein metrics | Gemini embedding & generative analysis |
| **Roadmap Generation** | Domain-tailored 4-stage milestone templates | Dynamically synthesized curricula |

---

## 3. Semantic Skill Similarity & Canonical Resolution

Skill terms across a peer-to-peer community often have colloquial abbreviations, framework synonyms, or version tags. The `SkillAliasRepository` and `SkillSimilarityService` resolve terms according to four distinct tiers:

1. **Exact Match (`1.00`, `EXACT`):**
   Case-insensitive equality on the global canonical skill catalog (`Skill.name`).
2. **Approved Alias (`0.95`, `ALIAS`):**
   Recognized synonyms pointing to the same canonical catalog skill (`SkillAlias`).
   - `React.js`, `ReactJS`, `React Dev` → resolves to canonical `React`
   - `JS`, `ECMAScript`, `Modern JavaScript` → resolves to canonical `JavaScript`
   - `TS` → resolves to canonical `TypeScript`
   - `User Interface Design`, `UX/UI Design`, `UI Design` → resolves to canonical `UI/UX Design`
   - `Python3`, `Python Programming` → resolves to canonical `Python`
   - `Search Engine Optimization` → resolves to canonical `SEO`
3. **Related Domain Skill (`0.50 – 0.70`, `RELATED`):**
   Skills within the same category/domain that require distinct mastery. They are NOT interchangeable for direct swap fulfillment:
   - `React` vs. `Vue` (0.55 similarity, related frontend frameworks)
   - `React` vs. `React Native` (0.75 similarity, related web vs. mobile frameworks)
   - `Python` vs. `Django` (0.65 similarity, language vs. web framework)
4. **Unrelated Skill (`< 0.30`, `UNRELATED`):**
   Disjoint subject areas (e.g., `React` vs. `Guitar`: 0.05 similarity).

```
GET /api/ai/similarity
POST /api/ai/similarity
Body: { "skillA": "React.js", "skillB": "React" }
Response:
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
```

---

## 4. Reciprocal Matching Preservation & Explainability

### Core Safety Invariant
The platform mandate requires that matches are only valid if both parties benefit:
$$\text{ReciprocalMatch}(A, B) \iff (\text{Teaches}(A) \cap \text{WantsToLearn}(B) \ne \emptyset) \land (\text{Teaches}(B) \cap \text{WantsToLearn}(A) \ne \emptyset)$$

AI matching **never** presents one-way candidates or overrides this rule. Charlie (who teaches Python and learns JS) is never recommended to Alice (who teaches React and learns UI/UX), regardless of how high a semantic or textual score might be.

### Multi-Factor Ranking Score (0 – 100)
When two users satisfy reciprocal eligibility, their ranking score is computed via:
$$S = 0.40 \cdot S_{\text{skills}} + 0.30 \cdot S_{\text{availability}} + 0.15 \cdot S_{\text{reputation}} + 0.15 \cdot S_{\text{activity}}$$
- $S_{\text{skills}}$: Proficiency alignment (e.g., Expert teacher paired with Beginner learner).
- $S_{\text{availability}}$: Day-of-week and time-slot mutual overlap percentage.
- $S_{\text{reputation}}$: Normalized rating score based on completed reviews.
- $S_{\text{activity}}$: Recency of completed sessions and responsiveness.

### Explainable Match Rationale
Every candidate includes transparent human-readable explanations:
> *"Alice teaches React at Advanced level which matches Bob's learning goal; Bob teaches UI/UX Design at Expert level matching Alice's learning goal. Both users are mutually available on Saturday Afternoon."*

### Recommendation Feedback & Suppression
Users can submit feedback for any recommendation:
- `HELPFUL`: Confirms high match relevance.
- `NOT_RELEVANT`: Flags weak domain relevance.
- `ALREADY_CONNECTED`: Indicates external or prior connection.
- `NOT_INTERESTED`: Suppresses the recommended user permanently from future suggestions via the `RecommendationFeedback` repository.

---

## 5. Personalized Learning Roadmaps

Users can generate personalized study roadmaps tailored to their current and target proficiency levels.

```
Roadmap Structure:
├── Stage 1: Foundations & Core Concepts (Weeks 1-2)
│   ├── Topics: [Syntax fundamentals, Core principles, Development environment]
│   ├── Practice Projects: [Starter demo app, Interactive component]
│   └── Mentor Discussion: [Setup debugging, Syntax best practices]
├── Stage 2: Intermediate Patterns & Architecture (Weeks 3-4)
├── Stage 3: Real-World Applications & Integration (Weeks 5-6)
└── Stage 4: Advanced Mastery & Production Readiness (Weeks 7-8)
```

### Features:
- **Milestone Progress Tracking (0–100%):** Toggling milestones (`PATCH /api/ai/roadmaps/:id/milestones/:mId`) automatically recalculates roadmap completion.
- **Peer Mentor Suggestions:** In addition to study topics, the roadmap automatically inspects the `UserTeachingSkill` catalog and surfaces active, high-rated community members teaching the target skill.
- **Ownership Defense (IDOR Protection):** Strict authorization ensures users can only read, update, or delete their own roadmaps (returns `403 Forbidden` on unauthorized access).

---

## 6. Smart Conflict-Free Session Scheduling

Scheduling peer exchange sessions across different time zones is error-prone. The `SmartSchedulingService` automates candidate slot generation:
1. **Timezone Awareness:** Takes user timezone (e.g. `America/New_York`) and partner timezone (e.g. `America/Los_Angeles`) and computes converted start and end times.
2. **Weekly Availability Mapping:** Matches overlapping days from `UserAvailability` slots (Morning: 09:00, Afternoon: 14:00, Evening: 18:00 local time).
3. **2-Hour Notice Window:** Enforces a minimum 2-hour buffer so last-minute meetings cannot be booked without notice.
4. **Conflict Exclusion:** Validates against the `Session` database. Any existing booked or pending session on either user's schedule immediately excludes that slot.

---

## 7. AI Learning Assistant & Security Safeguards

A floating AI Assistant widget (`AIAssistantDrawer`) assists users in session preparation and structured learning.

### Security & Privacy Protections:
- **Prompt Injection Defense:** Strips `system:`, `<system>`, `ignore previous instructions`, and forbidden delimiter tokens.
- **Credential Protection:** Blocks queries requesting API keys, passwords, database credentials, or auth cookies (`400 Bad Request` / safe refusal).
- **Private Data Isolation:** The assistant has zero access to user passwords, reset tokens, or private conversation message histories. Context is strictly limited to session topics and learning goals.
- **Per-User Rate Limiting:** Enforces a maximum of 20 assistant queries per 10-minute window, returning `429 Too Many Requests` on abuse.

---

## 8. Database Schema Extensions (Prisma v8 RC Contract)

Five new models were added to `server/src/prisma/contract.prisma` and applied to PostgreSQL via contract migrations:

```prisma
model SkillAlias {
  id                Int       @id @default(autoincrement())
  alias             String    @unique
  canonicalSkillId  Int
  similarityScore   Float     @default(1.0)
  relationshipType  String    @default("ALIAS") // ALIAS, RELATED, PARENT_CHILD
  isApproved        Boolean   @default(true)
  createdAt         TimestamptzString @default(now())

  @@index([canonicalSkillId])
  @@index([alias])
}

model LearningRoadmap {
  id                  Int       @id @default(autoincrement())
  userId              Int
  skillId             Int?
  skillName           String
  currentProficiency  String    // Beginner, Intermediate, Advanced
  targetProficiency   String    // Intermediate, Advanced, Expert
  learningObjective   String
  preferredPace       String    @default("MODERATE") // RELAXED, MODERATE, INTENSIVE
  estimatedWeeks      Int       @default(8)
  status              String    @default("ACTIVE") // ACTIVE, COMPLETED, ARCHIVED
  progressPercent     Int       @default(0)
  createdAt           TimestamptzString @default(now())
  updatedAt           temporal.updatedAtString()

  @@index([userId])
  @@index([skillId])
}

model RoadmapMilestone {
  id                    Int       @id @default(autoincrement())
  roadmapId             Int
  orderIndex            Int
  title                 String
  description           String?
  topics                String    // JSON string array
  practiceProjects      String    // JSON string array
  suggestedSessionGoals String    // JSON string array
  isCompleted           Boolean   @default(false)
  completedAt           TimestamptzString?
  createdAt             TimestamptzString @default(now())
  updatedAt             temporal.updatedAtString()

  @@index([roadmapId])
}

model RecommendationFeedback {
  id                Int       @id @default(autoincrement())
  userId            Int
  recommendedUserId Int
  feedbackType      String    // HELPFUL, NOT_RELEVANT, ALREADY_CONNECTED, NOT_INTERESTED
  reason            String?
  createdAt         TimestamptzString @default(now())

  @@unique([userId, recommendedUserId])
  @@index([userId])
  @@index([recommendedUserId])
}

model AIUsageRecord {
  id                Int       @id @default(autoincrement())
  userId            Int
  feature           String    // RECOMMENDATION, ROADMAP_GEN, SMART_SCHEDULE, ASSISTANT_CHAT, SIMILARITY
  provider          String    // LOCAL_DETERMINISTIC, GEMINI, OPENAI
  promptTokens      Int       @default(0)
  completionTokens  Int       @default(0)
  totalTokens       Int       @default(0)
  durationMs        Int       @default(0)
  estimatedCostUsd  Float     @default(0.0)
  success           Boolean   @default(true)
  errorMessage      String?
  createdAt         TimestamptzString @default(now())

  @@index([userId])
  @@index([feature])
  @@index([createdAt])
}
```

---

## 9. API Route Reference

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/similarity` | None (Public) | Compute semantic similarity and alias relationship between two terms. |
| `GET` | `/api/ai/recommendations` | Yes (User) | Retrieve reciprocal AI recommendations with ranking and explainability. |
| `POST` | `/api/ai/recommendations/feedback` | Yes (User) | Submit feedback (`HELPFUL`, `NOT_INTERESTED`) to tune recommendation feed. |
| `POST` | `/api/ai/roadmaps` | Yes (User) | Generate a structured 4-stage learning roadmap with milestones. |
| `GET` | `/api/ai/roadmaps` | Yes (User) | Retrieve authenticated user's roadmaps. |
| `GET` | `/api/ai/roadmaps/:id` | Yes (User) | Retrieve specific roadmap with milestones and suggested peer mentors. |
| `PATCH` | `/api/ai/roadmaps/:id/milestones/:mId` | Yes (User) | Toggle milestone completion status and recalculate progress. |
| `DELETE` | `/api/ai/roadmaps/:id` | Yes (User) | Delete learning roadmap and child milestones. |
| `GET` | `/api/ai/scheduling/suggestions` | Yes (User) | Generate conflict-free, timezone-converted session times for a swap partner. |
| `POST` | `/api/ai/assistant/chat` | Yes (User) | Interact with guardrailed AI learning assistant. |
| `GET` | `/api/ai/admin/overview` | Yes (Admin/Mod) | View aggregate AI token consumption, latency, and cost analytics. |

---

## 10. Automated Test Results & Verification

All 16 test cases in `server/tests/integration/ai_features.test.ts` execute against real PostgreSQL and verified endpoints with ephemeral port isolation:

```
> node --import tsx/esm --test tests/integration/ai_features.test.ts

✔ 1. Skill Alias Resolution: Resolves approved aliases to canonical skills (17.99ms)
✔ 2. Semantic Similarity: Distinguishes exact, alias, related, and unrelated skills (22.26ms)
✔ 3. Public API: POST /api/ai/similarity analyzes skill terms without authentication (9.43ms)
✔ 4. Reciprocal Preservation: Recommendations only include valid reciprocal matches (204.11ms)
✔ 5. Ranking & Explainability: Generates human-readable recommendation reasons (138.11ms)
✔ 6. Feedback: User can submit recommendation feedback (HELPFUL) (12.88ms)
✔ 7. Feedback Suppression: NOT_INTERESTED feedback removes user from future recommendations (232.86ms)
✔ 8. Learning Roadmap: Creates structured 4-stage roadmap with milestones and topics (24.17ms)
✔ 9. Roadmap Ownership: User B cannot view or update User A roadmap (403 Forbidden) (21.50ms)
✔ 10. Roadmap Progress: Completing milestones recalculates progress percentage (83.59ms)
✔ 11. Roadmap Partners: Roadmap suggests community skill partners who teach the topic (149.45ms)
✔ 12. Smart Scheduling: Generates conflict-free meeting slots respecting both timezones (63.12ms)
✔ 13. Smart Scheduling: Revalidates and excludes slots when a session is booked (103.51ms)
✔ 14. AI Assistant: Answers session preparation questions and returns follow-ups (15.84ms)
✔ 15. Security & Privacy: AI Assistant refuses requests for passwords, tokens, or credentials (13.51ms)
✔ 16. Admin Analytics: Standard user receives 403; Administrator views AI usage metrics (28.78ms)

ℹ tests 16
ℹ suites 1
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

### Full-Stack Quality Verification:
- **Client Lint:** `npm --prefix client run lint` → 0 errors, 0 warnings.
- **Client Build:** `npm --prefix client run build` → Vite 8 compiled cleanly in 4.99s.
- **Server Build:** `npm --prefix server run build` → TypeScript compiled cleanly with 0 errors.
- **Regression Tests:**
  - `test:ai` (16/16 passing)
  - `test:billing` (17/17 passing)
  - `test:admin` (16/16 passing)

---

## 11. Conclusion & Next Steps

Phase 18 successfully introduces AI into SkillSwap with zero disruption to the core peer-to-peer exchange workflow. Recommendations are explainable and strictly reciprocal; roadmaps provide actionable milestones and community mentor discovery; scheduling suggestions prevent timezone confusion; and the AI assistant offers safe, guardrailed session prep without risking user privacy.

SkillSwap is fully prepared for Phase 19 (or live production deployment).

