# SkillSwap — Phase 17: SaaS Monetization & Subscription Management Report

**Date:** November 6, 2026  
**Status:** COMPLETE & VERIFIED  
**Engine:** Node.js Express 5 + TypeScript, Prisma v8 RC Contract ORM, PostgreSQL, React 19, Tailwind CSS v4, TanStack Query  
**Payment Engine:** Stripe Integration & Mock Sandbox Abstraction Layer (`IPaymentProvider`)

---

## 1. Executive Summary

Phase 17 successfully adds an enterprise-grade SaaS subscription, monetization, and feature entitlement framework to the SkillSwap platform without disrupting the foundational peer-to-peer reciprocal skill-exchange mission.

SkillSwap remains 100% free for core reciprocal learning and community interaction. Monetization is designed around professional power tools, high-volume swap capacity, deeper analytics, and priority discovery visibility, while strictly enforcing our core platform guarantee: **User safety, harassment reporting, moderation, and account security can never be paywalled.**

All implementations follow sandbox-first safety principles: zero live external credit cards charged, zero mock data in production backend, non-destructive additive database migrations, full signature verification, and automated idempotency.

---

## 2. Payment Provider Evaluation: Stripe vs. Razorpay

| Criterion | Stripe (Selected Recommendation) | Razorpay | Evaluation & Verdict |
| :--- | :--- | :--- | :--- |
| **Recurring Subscriptions** | Native `Stripe Billing`, Customer Portal, proration, automated retries with Smart Retries | Supported, but requires specialized subscription mandate workflows (e-mandates / UPI Autopay in India) | **Stripe is superior** for global SaaS recurring memberships with cross-currency support. |
| **Hosted Checkout** | `Stripe Checkout` with zero PCI scope and branded redirection | Razorpay Standard Checkout popup/redirect | Both provide secure hosted forms; Stripe handles global VAT/sales tax calculation out of the box. |
| **Customer Portal** | Out-of-the-box self-service portal for card updates, invoice downloads, cancellations | Custom UI required or localized link generation | **Stripe** provides instant self-service without custom frontend billing forms. |
| **Webhook Security** | HMAC-SHA256 signatures (`stripe-signature` header with timestamp tolerance check) | HMAC-SHA256 signature (`x-razorpay-signature`) | Both provide cryptographic signatures; Stripe includes replay attack protection via timestamps. |
| **Sandbox & Local Dev** | Deterministic test clocks, mock webhook events, mock provider fallback | Test mode API keys | **Stripe abstraction** with our built-in `MockPaymentProvider` guarantees flawless local CI/CD with zero external network dependencies. |

**Architectural Decision:** Implemented the `IPaymentProvider` contract interface. `StripePaymentProvider` powers live Stripe REST API operations, while `MockPaymentProvider` powers local development and automated CI integration tests. Switching between providers requires only updating `PAYMENT_PROVIDER=stripe` or `PAYMENT_PROVIDER=mock` in `.env`.

---

## 3. Subscription Tier Architecture & Quotas

```
+----------------------------------------------------------------------------------------------------+
|                                    SKILLSWAP MEMBERSHIP TIERS                                      |
+------------------------------------+--------------------------------+------------------------------+
| FREE TIER ($0/forever)             | PRO TIER ($15/mo or $144/yr)   | PREMIUM TIER ($29/mo or $288)|
+------------------------------------+--------------------------------+------------------------------+
| * 3 Concurrent Active Swap Props   | * 10 Concurrent Active Swaps   | * 50 Concurrent Active Swaps |
| * Standard Reciprocal Matching     | * Priority Matching Visibility | * Top Priority Matching      |
| * Real-Time Socket.IO Messaging    | * Advanced Discovery Filters   | * Advanced Discovery Filters |
| * Jitsi Video Sessions (Unlimited) | * Pro Profile Badge            | * Dedicated Premium Badge    |
| * Core Reviews & Ratings           | * Extended Session Notes       | * Learning Analytics & Stats |
| * ALWAYS FREE: Moderation & Safety | * Basic Usage Analytics        | * Full Data & Invoice Export |
+------------------------------------+--------------------------------+------------------------------+
```

### Safety & Fairness Guarantee:
- **Reciprocal Matching Invariant:** A Pro or Premium subscriber must still have reciprocal compatibility with another user to propose a swap (they teach what the peer wants to learn, and learn what the peer teaches). High-paying users cannot bypass reciprocity or spam non-matching users.
- **Unrestricted Safety:** Reporting bad actors, blocking abusive profiles, submitting moderation disputes, updating passwords, and deactivating accounts remain 100% free and accessible to all users.

---

## 4. Database Schema Extensions (Prisma v8 RC Contract)

All schema changes were performed non-destructively through the contract-based workflow:
`contract.prisma` -> `prisma contract emit` -> `prisma db update` -> `prisma db verify`.

```
                  +--------------------------------+
                  |              User              |
                  |  + subscriptionTier: String    |
                  +---------------+----------------+
                                  |
                                  | 1:1 / 1:N
        +-------------------------+-------------------------+
        |                         |                         |
+-------v---------------+ +-------v---------------+ +-------v---------------+
|   SubscriptionPlan    | |   UserSubscription    | |     UserUsage         |
|  - code (FREE/PRO/PRE)| |  - status (ACTIVE/...) | |  - activeSwapsCount   |
|  - monthlyPriceCents  | |  - billingCycle       | |  - periodStart        |
|  - yearlyPriceCents   | |  - providerCustomerId | |  - periodEnd          |
|  - entitlements JSON  | |  - providerSubId      | +-----------------------+
+-----------------------+ |  - cancelAtPeriodEnd  |
                          +-------+---------------+
                                  | 1:N
        +-------------------------+-------------------------+
        |                                                   |
+-------v---------------+                           +-------v---------------+
|  PaymentTransaction   |                           |    BillingInvoice     |
|  - providerPaymentId  |                           |  - invoiceNumber      |
|  - amountCents        |                           |  - amountPaidCents    |
|  - status (SUCCEEDED) |                           |  - invoicePdfUrl      |
|  - currency (USD)     |                           |  - hostedInvoiceUrl   |
+-----------------------+                           +-----------------------+

+-----------------------------------------------------------+
|                   BillingWebhookEvent                     |
|  - eventId (unique deduplication key)                     |
|  - eventType (checkout.session.completed, ...)            |
|  - processed (boolean)                                    |
|  - processedAt (timestamp)                                |
+-----------------------------------------------------------+
```

---

## 5. Backend Architecture & Services

1. **`IPaymentProvider` Abstraction:**
   - Interface defining `createCheckoutSession`, `createCustomerPortalSession`, `cancelSubscription`, `reactivateSubscription`, and `verifyWebhookSignature`.
   - `MockPaymentProvider`: Generates cryptographic HMAC-SHA256 signatures, provides deterministic mock checkout and portal URLs, and simulates webhook payloads.
   - `StripePaymentProvider`: Production Stripe API implementation using direct HTTPS requests and official Stripe signature verification.

2. **`EntitlementService` (`server/src/services/billing/entitlement.service.ts`):**
   - Central authority for plan features and quotas.
   - Enforces `maxActiveSwaps` in `SwapRequestService.createSwapRequest` (step 2 check). If an authenticated Free user attempts to initiate a 4th pending proposal, the system rejects it immediately with HTTP 403 Forbidden (`QuotaExceededError`) and a clear upgrade prompt.

3. **`BillingService` (`server/src/services/billing/billing.service.ts`):**
   - Coordinates checkout sessions, cancellations, reactivations, portal sessions, and webhook processing.
   - Computes platform MRR, ARR, active paid subscribers, conversion rate, and churn analytics.

4. **Webhook Idempotency & Raw Body Preservation:**
   - Express 5 `app.ts` captures `req.rawBody` Buffer before JSON parsing for `/api/billing/webhook`.
   - CSRF middleware explicitly exempts `/api/billing/webhook`.
   - Incoming events are recorded in `BillingWebhookEvent` with unique `eventId`. Duplicate deliveries are safely acknowledged with HTTP 200 without duplicate execution.

5. **Transactional Billing Email Notifications:**
   - `SUBSCRIPTION_ACTIVATED`: Welcome and feature enablement overview.
   - `SUBSCRIPTION_RENEWED`: Renewal receipt with PDF invoice download link.
   - `SUBSCRIPTION_CANCELED`: End-of-period access notice with one-click reactivation.
   - `PAYMENT_FAILED`: Immediate grace-period warning with portal update instructions.

---

## 6. Frontend SaaS Implementation

1. **`Pricing.tsx` (`/pricing`):**
   - Public and authenticated access.
   - Interactive Billing Cycle Toggle (Monthly vs. Annual with 20% discount savings badge).
   - Dynamic Plan Cards (Free, Pro, Premium) displaying features, quotas, active state badges, and direct checkout action buttons.
   - Comprehensive Feature Comparison Matrix and SaaS Billing FAQs.

2. **`BillingSettings.tsx` (`/settings/billing`):**
   - Overview of active tier and renewal date.
   - Real-time active swap quota progress bar (e.g. `1 / 3 used`).
   - Customer Billing Portal launcher for updating payment methods.
   - Safe subscription cancellation modal with grace period warning and instant one-click reactivation.
   - Paginated Tax Invoice and Receipt history table with direct download links.

3. **`AdminSubscriptions.tsx` (`/admin/subscriptions`):**
   - Real-time SaaS Financial KPIs: MRR, ARR, Total Lifetime Revenue, Paid Subscribers, Conversion Rate, Failed Payment Rate.
   - Tier Distribution cards (Free vs. Pro vs. Premium).
   - Subscriber Directory with status filters (`ACTIVE`, `PAST_DUE`, `CANCELED`) and plan filters.
   - Real-Time Payment Transaction Ledger displaying currency amounts, timestamps, payment IDs, and failure reasons.

4. **Navigation Integration:**
   - Header navigation (`Navbar.tsx`): Direct link to `/pricing`.
   - Member Sidebar (`Sidebar.tsx`): Dedicated `💳 Billing & Plans` item.
   - Account Settings (`Settings.tsx`): Dedicated `Membership & Billing` card with live tier indicator.
   - Admin Center (`AdminLayout.tsx`): `Subscriptions & Revenue` navigation item.

---

## 7. Verification & Automated Test Results

### 1. Billing SaaS Integration Tests (`server/tests/integration/billing_saas.test.ts`):
- **Test 1:** Seeded Free, Pro, and Premium plans are retrieved with entitlements (200 OK).
- **Test 2:** EntitlementService grants default Free limits (3 active swaps, standard search).
- **Test 3:** Initiates checkout session for Pro plan returning secure checkout URL (200 OK).
- **Test 4:** Rejects invalid plan code during checkout (400 Bad Request).
- **Test 5:** Webhook signature verification fails with tampered signature (400 Bad Request).
- **Test 6:** Webhook signature verification passes with valid HMAC signature.
- **Test 7:** Webhook `checkout.session.completed` activates Pro plan and creates transaction record.
- **Test 8:** Webhook idempotency suppresses duplicate event processing without double-counting.
- **Test 9:** Quota enforcement: Free user with 3 active swap requests is blocked from creating a 4th (403 QuotaExceededError).
- **Test 10:** Pro upgrade raises quota allowing up to 10 active swaps.
- **Test 11:** Cancellation schedules downgrading at end of billing period (`cancelAtPeriodEnd = true`).
- **Test 12:** Reactivation restores auto-renew before billing period expiration.
- **Test 13:** Webhook `invoice.paid` generates invoice record and records payment transaction.
- **Test 14:** Webhook `invoice.payment_failed` marks status as `PAST_DUE` and dispatches alert.
- **Test 15:** Admin Overview returns calculated MRR, ARR, and subscriber metrics.
- **Test 16:** Admin Subscriptions endpoint lists subscribers with pagination and filters.
- **Test 17:** Customer Portal session generates self-service management link.
- **Result:** **17/17 PASSED (1320ms)**

### 2. Regression Integration Suites:
- Admin SaaS Tests (`server/tests/integration/admin_saas.test.ts`): **16/16 PASSED**
- Session & Video Tests (`server/tests/integration/session.test.ts`): **20/20 PASSED**
- Health & Monitoring Tests (`server/tests/integration/health.test.ts`): **9/9 PASSED**
- End-to-End User Journeys (`server/tests/integration/e2e_journeys.test.ts`): **8/8 PASSED**

### 3. Build & Static Analysis:
- `npm --prefix client run lint`: **0 errors, 0 warnings**
- `npm --prefix client run build`: **Built cleanly in 3.42s**
- `npm --prefix server run build`: **TypeScript compiles cleanly with 0 errors**

---

## 8. Sandbox Testing Guide for Evaluators

1. **Viewing Available Plans:**
   Navigate to `http://localhost:5173/pricing`. Toggle between Monthly and Yearly billing cycles.
2. **Testing Pro / Premium Checkout:**
   Sign in to any user account and click **Upgrade to Pro** or **Upgrade to Premium**. In local development mode (`PAYMENT_PROVIDER=mock`), the checkout session immediately redirects to the simulated checkout completion URL and activates the subscription.
3. **Verifying Quota Enforcement:**
   On a Free account, initiate 3 swap proposals. Attempting to send a 4th proposal displays an upgrade modal explaining that the 3-proposal limit has been reached.
4. **Inspecting Admin SaaS Analytics:**
   Sign in with an admin account (`admin@skillswap.local` / `AdminPass123!`), open the Admin Center, and navigate to **Subscriptions & Revenue** (`/admin/subscriptions`) to view real-time MRR, ARR, and subscriber distributions.

