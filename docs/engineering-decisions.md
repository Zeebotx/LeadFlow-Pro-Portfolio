# Engineering decisions and trade-offs

[Portfolio](../README.md) · [Technical challenges](technical-challenges.md)

These are records of approaches present in the code, not reconstructed meeting minutes. **Observed** identifies implementation evidence. **Interpretation** identifies a benefit or trade-off inferred from that evidence. Historical alternatives are not recorded in the reviewed material, so the alternatives below are discussion options, not claims about what contributors evaluated.

## 1. Next.js pages with a separate Express API

**Context:** The interface needs public/authentication pages and interactive workspace screens, while the server handles providers, webhooks, and database work.

**Observed approach:** App Router pages and React components call a separately composed CommonJS Express service. Next.js can proxy `/api` when configured; signed webhooks target the backend directly.

**Interpretation:** Independent server composition keeps provider callbacks and workers beside their data-access logic. The cost is coordination across origins, cookies, callback URLs, frontend build inputs, and deployment revisions. Route-level client gating provides convenient navigation but must remain subordinate to backend authorization.

**Alternatives/limits:** Consolidating into framework server handlers is a possible redesign, not an evaluated historical option. No evidence shows separate deployability was benchmarked against a consolidated design.

**Evidence:** `frontend/src/app/layout.js`, `frontend/src/components/WorkspaceProvider.js`, `frontend/src/lib/api.js`, `frontend/next.config.mjs`, `backend/server.js`.

## 2. Explicit SQL and migration-defined integrity

**Context:** Tenant-sensitive lead, campaign, assignment, history, and provider workflows require coordinated state changes.

**Observed approach:** Direct parameterized `pg` queries, explicit transactions, row/advisory locks where needed, numbered migrations, and compound same-workspace relationships.

**Interpretation:** Database behavior and transaction boundaries stay visible. Relational constraints reject certain inconsistent links even if a handler is mistaken. Query composition is dispersed and repetitive; an absent repository boundary increases the work of changing contracts consistently.

**Alternatives/limits:** An ORM/query builder or narrower data-access module could centralize patterns, but no documented comparison supports a historical rejection. JSONB is used selectively; comprehensive indexing or measured query-performance advantages are not established.

**Evidence:** `backend/config/db.js`, `backend/run_migration.js`, `backend/controllers/leadActivityController.js`, migrations 013 and 016; `backend/tests/workspaceDatabase.test.js`.

## 3. Workspace membership plus assignment as separate access concepts

**Context:** Shared sales work needs management access without giving every collaborator every lead; personal records should remain private until deliberately shared.

**Observed approach:** A verified workspace context supplies role/owner; managers have workspace visibility, ordinary readers are assigned-record restricted, and personal-to-shared import is explicit. Creator identity stays on records independently.

**Interpretation:** This models collaboration more accurately than treating a record creator as the tenant. The cost is enforcing the same scope in every read, write, export, aggregate, background job, and relationship. Viewer assignment semantics and post-plan-change seat behavior need product review.

**Alternatives/limits:** Creator-only ownership and workspace-wide access for all members are possible simpler models, not documented alternatives. RLS enablement is not a substitute for the application's current membership logic.

**Evidence:** `backend/utils/getWorkspaceContext.js`, `backend/middleware/teamMiddleware.js`, `backend/controllers/leadsController.js`, `leadActivityController.js`, `backend/routes/workspaceRoutes.js`, migrations 012–014.

## 4. A durable social inbox before asynchronous capture

**Context:** Providers retry deliveries; downstream requests and process failures can interrupt processing.

**Observed approach:** Verify signatures, commit normalized event entries before acknowledgement, claim by lease, recheck connection state, and commit capture/completion together. Unmapped/ambiguous work is quarantined.

**Interpretation:** Reception is decoupled from provider lookups and scoring latency. Unique event/business references reduce repeated side effects. Retained payloads and retry states add storage, privacy, and operational triage responsibilities.

**Alternatives/limits:** A dedicated broker is a possible future choice. None is present or documented as rejected. The database design does not imply exactly-once delivery across external systems or unlimited horizontal scale.

**Evidence:** `backend/webhooks/router.js`, `backend/services/webhookInbox.js`, migrations 015–016, `backend/tests/workspaceDatabase.test.js`, `whatsapp.test.js`.

## 5. Hybrid scoring with a narrow model payload

**Context:** Priority needs both structured contact/channel signals and qualitative enquiry context, with human review and reduced external data exposure.

**Observed approach:** Local rules plus Gemini evaluation of fixed derived labels/metadata; local response normalization, result auditing, stale-input checks, and manual override precedence.

**Interpretation:** Local control makes scores bounded and preserves a useful path when the provider is unavailable. Fixed labels reduce disclosed text while sacrificing semantic nuance. A more elaborate model evaluation cannot recover detail withheld from its input.

**Alternatives/limits:** Rules-only scoring, a fuller redacted-text payload, and a trained classifier are discussion alternatives; no evidence establishes they were experimentally compared. The implemented model is an external service, and its quality/fairness is unbenchmarked.

**Evidence:** `backend/services/deterministicScoring.js`, `piiSanitizer.js`, `geminiScoringService.js`, `scoringQueue.js`; `backend/tests/modelPrivacy.test.js`, `leadScoringApi.test.js`.

## 6. Process-local scoring alongside database-backed delivery work

**Context:** Lead capture should return promptly without introducing an additional queue service.

**Observed approach:** A singleton scoring queue bounds concurrency, suppresses active duplicates, skips unchanged content, and schedules a WhatsApp follow-up pass on changes. Inbox and email work are persisted separately.

**Interpretation:** This is operationally small and avoids running a broker. Scoring jobs, cooldowns, and follow-up state vanish on restart and do not coordinate across processes. The durability guarantee is intentionally described per component in this portfolio; historical intent behind that asymmetry is not documented.

**Alternatives/limits:** A persistent scoring table/queue could improve recovery. It is a proposed direction, not an implemented feature.

**Evidence:** `backend/services/scoringQueue.js`, `webhookInbox.js`, `emailOutbox.js`; `backend/tests/scoringQueue.test.js`, `whatsappScoring.test.js`.

## 7. Database-triggered hot-lead outbox

**Context:** A qualifying lead change should queue alerts consistently, including scoring and assignment changes, without immediately blocking on mail delivery.

**Observed approach:** A trigger inserts unique workspace/lead/recipient work in the lead transaction. The worker leases jobs, rechecks eligibility/opt-out, persists the message, and records delivery/retry state.

**Interpretation:** Enqueueing is coupled to the actual committed database mutation. This requires understanding trigger side effects and migration behavior. Once-per-recipient deduplication suppresses repeated threshold alerts; eligibility checks cannot retract mail already sent.

**Alternatives/limits:** Application-only enqueue or a change-data-capture service would have different consistency/operational costs; no historical evaluation is recorded. SMTP cannot provide the same provider idempotency behavior as the Resend call.

**Evidence:** migration 019, `backend/services/emailOutbox.js`, `backend/config/mailer.js`, `backend/tests/emailOutbox.test.js`.

## 8. Custom application sessions and provider OAuth handoffs

**Context:** The app supports password and Google sign-in plus separate social-account linking, while retaining application-owned users and workspace authorization.

**Observed approach:** bcrypt/JWT sessions, hashed rotating refresh credentials, authentication versions, one-use Google handoffs, and provider-specific saved OAuth state. Passport is initialized without a mounted server session store.

**Interpretation:** The identity model stays under the application API, but cookie/origin behavior, token storage, account linking, revocation, and recovery become ongoing application responsibilities. These costs are visible in tests and compatibility paths.

**Alternatives/limits:** Managed identity could reduce some custom logic; it was not documented as a rejected option. Browser-side access-token persistence remains part of the implementation, and operational assurance needs separate review.

**Evidence:** `backend/controllers/authController.js`, `oauthController.js`, `backend/config/passport.js`, `backend/middleware/authMiddleware.js`, `oauthState.js`; `frontend/src/lib/session.js`, `api.js`.
