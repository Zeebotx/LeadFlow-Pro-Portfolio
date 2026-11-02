# Technical challenges

[Portfolio](../README.md) · [Engineering decisions](engineering-decisions.md)

These case studies explain source-visible problems and mechanisms. They are not personal anecdotes or assertions that every production edge case has been resolved. Test references identify inspected scenarios, not fresh execution results.

## 1. Three kinds of duplication

**Problem:** Repeated enquiries, redelivered webhooks, and repeated messages from one sender represent different identities. Treating them as one deduplication problem could lose activity or merge unrelated people.

**Constraints:** Providers retry; manual inputs can share names; customers can contact different workspaces; sales activity should remain visible.

**Implemented approach:** Manual entry compares same-workspace, same-platform name/contact values, retains a duplicate row linked to an original, increments the original interaction count, and queues the original for scoring. Social inbox rows use unique provider/event keys, and lead capture has a unique inbox-event reference. WhatsApp maps workspace/sender to a lead and appends separate timestamped message activity.

**Trade-offs and current limits:** Manual matching is heuristic and may confuse shared names. It is not protected by a universal unique person identity and can race under simultaneous creation. Generic webhook capture does not automatically apply the manual person matcher. Provider identity and sender identity address repeat processing and conversation continuity, not global cross-channel identity resolution.

**Lesson:** State the unit of identity before choosing a uniqueness mechanism. The durable event and WhatsApp paths have specific transactional/schema safeguards; claims about universal duplicate elimination would exceed the evidence.

**Evidence:** `backend/controllers/leadsController.js`; `backend/services/webhookInbox.js`, `whatsappCapture.js`; migrations 008–009, 015–016; `backend/tests/workspaceDatabase.test.js`, `whatsapp.test.js`.

## 2. Safe routing after a webhook has been acknowledged

**Problem:** A valid provider delivery may arrive before an account is connected, after a connection is removed, or while account mappings change.

**Constraints:** The provider signature establishes origin, not tenant authorization. HTTP success must not mean an event was silently dropped, and choosing an arbitrary matching workspace would violate isolation.

**Implemented approach:** Persist the batch transactionally before returning success. The worker resolves one active account connection, leases work, and rechecks the current connection inside the capture transaction. Unknown/ambiguous or unsupported work is quarantined; processing failures retry. Completion and business writes commit together.

**Trade-offs and current limits:** Retained events require storage/retention and operational attention. Quarantine is not automatic repair. Lease-based recovery requires the service to run again; no deployed triage dashboard or operational alert system was verified. This does not guarantee exactly-once effects outside the local database.

**Lesson:** Separate authenticity, reception durability, tenant routing, and downstream success. Each has a different proof and failure mode.

**Evidence:** `backend/middleware/webhookSignature.js`; `backend/services/webhookInbox.js`; migration 015; signature assertions in `backend/tests/webhooks.test.js` and persistence/isolation assertions in `workspaceDatabase.test.js`.

## 3. Human scoring decisions during slow AI work

**Problem:** A model request can finish after enquiry content changes or a manager enters an override. Saving the old result blindly would overwrite current context or human judgement.

**Constraints:** Model calls are asynchronous; job deduplication is process-local; the user should not hold a database transaction open while awaiting the model.

**Implemented approach:** Compute from a loaded snapshot, perform the external work, then lock the current lead and compare content hash and workspace before saving. Audit insertion and effective-score update share a transaction. The update respects the current manual override. WhatsApp changes during active work request a subsequent pass.

**Trade-offs and current limits:** Hashing is based on selected fields and serialization, not a universal record version. A stale result is discarded, but automatic re-enqueue is not guaranteed for every edit path. In-memory scheduling remains vulnerable to restart loss. No scoring-quality benchmark was established.

**Lesson:** Preserve the distinction between computed recommendation and effective business decision; revalidate assumptions immediately before persistence.

**Evidence:** `backend/services/scoringQueue.js`, `geminiScoringService.js`; `backend/controllers/leadActivityController.js`; `backend/tests/leadScoringApi.test.js`, `whatsappScoring.test.js`, `scoringQueue.test.js`.

## 4. Moving records without crossing tenant relationships

**Problem:** Introducing shared workspaces changes who can see existing records. Campaigns, leads, content metrics, history, assignment, and conversations cannot be moved independently without risking inconsistent links.

**Constraints:** Existing personal records should remain private; campaign links must remain within a workspace; assignments should not survive a move into a different team blindly.

**Implemented approach:** Migrations establish personal workspaces, backfill required tenant IDs, detach/audit incompatible legacy campaign links, and add compound relationship constraints. The owner import route locks source/target workspaces, defers supported constraints, moves related records in one transaction, clears lead assignments, and records movement history. WhatsApp mapping follows its compound lead/workspace FK update behavior.

**Trade-offs and current limits:** Data-moving migrations require careful operational review; they are not reversible merely because they are SQL files. Related external connections and prior notifications have distinct lifecycles. The import is an explicit business-data move, not a universal migration of every provider or billing object.

**Lesson:** Model tenant identity in the schema and define a coordinated migration workflow; do not rely on replacing a filter in the UI.

**Evidence:** migrations 012–016; `backend/routes/workspaceRoutes.js`; `backend/tests/workspaceDatabase.test.js`, `whatsapp.test.js`.

## 5. Alert delivery after permissions change

**Problem:** A lead can become high priority, queue an email, and then be reassigned or lose an eligible recipient before delivery.

**Constraints:** Triggering cannot depend on mail-provider availability; repeated scoring should not flood the same recipients; retries must preserve delivery identity.

**Implemented approach:** A database trigger queues eligible workspace recipients in the lead transaction, deduplicated by workspace/lead/recipient. A leased worker rechecks current membership, role, assignment, and opt-out before sending. It retains the message and uses a stable provider delivery key. Failed jobs retry with bounded state, and expired leases can recover.

**Trade-offs and current limits:** A once-per-triple key deliberately suppresses repeat alerts. The retained payload is a notification snapshot, not guaranteed to describe the latest lead state. SMTP's delivery semantics differ from Resend's idempotency support. A race after the eligibility recheck and mail already delivered cannot be undone.

**Lesson:** Put enqueue consistency in the database transaction and revalidate authority before an external side effect; avoid claiming cross-system atomicity.

**Evidence:** migration 019; `backend/services/emailOutbox.js`; `backend/config/mailer.js`; rollback, retry, recipient-revocation and opt-out assertions in `backend/tests/emailOutbox.test.js`.

## 6. Reconciling social content without overstating measurement

**Problem:** Different providers expose different IDs, URLs, titles, counts, token lifetimes, and account structures. A uniform dashboard can obscure missing or estimated information.

**Constraints:** Available data depends on grants, account eligibility, API versions and request limits. Scraped content can be incomplete, and account identity is not reliably proved by a display name alone.

**Implemented approach:** Provider services normalize returned media to a common content shape, apply title/URL fallbacks, and refresh TikTok connections on supported unauthorized paths. Sync updates or inserts workspace metrics. URL tracking uses supported-platform detection and bounded destination fetching; some ownership checks/fallbacks are heuristic. Campaign queries aggregate leads and content separately before joining to avoid multiplying rows.

**Trade-offs and current limits:** Some metrics are estimates, asset pagination is not exhaustive, and URL lookup has no database uniqueness guarantee. Overlapping sync requests can race. Browser auto-sync is not server-side scheduling. Some analytics errors are represented as empty data, weakening observability.

**Lesson:** Preserve metric provenance, distinguish connection status from successful data acquisition, and test aggregation cardinality. The code demonstrates normalization work; it does not establish audited marketing attribution.

**Evidence:** `backend/services/platformMediaService.js`, `videoScraperService.js`, `platformHttp.js`; `backend/controllers/analyticsController.js`, `campaignsController.js`; `frontend/src/app/analytics/PlatformAnalytics.js`; `backend/tests/videoSecurity.test.js`, `workspaceDatabase.test.js`.
