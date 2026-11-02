# Two engineering case studies

[Portfolio](../README.md) · [Architecture](architecture.md)

These case studies trace two implemented workflows from their engineering problem to the processing and persistence mechanisms. My responsibilities are listed separately in [My contributions](my-contributions.md).

## 1. Webhook retries and workspace routing

A provider can redeliver an event after a timeout. Meanwhile, the connected account may have been removed or reassigned. A valid signature establishes the sender; it does not authorize delivery into a particular workspace.

The application separates receipt from capture:

1. Verify the signature over the raw request bytes and persist the event batch in PostgreSQL before acknowledging receipt. A unique provider/event key handles redelivery.
2. A worker claims due work using a lease and resolves one active account connection. Missing, ambiguous, or unsupported routing goes to quarantine.
3. Inside the capture transaction, recheck the current connection, write the lead/activity, and mark the event complete together. A unique inbox reference guards against repeated capture.
4. Schedule scoring after the capture commits. Processing failures retry; expired leases allow interrupted work to be reclaimed.

The important distinction is between **delivery identity** and **business identity**. Two deliveries can refer to one event; two genuine messages can belong to the same lead. WhatsApp uses a workspace/sender mapping for conversation continuity, separately from event deduplication.

**Engineering result:** PostgreSQL retains the event through processing attempts, unique event references guard against repeated capture, and lead/activity writes commit with event completion. Workspace routing is rechecked at the point of capture.

**Application test evidence:** migrated database assertions cover persistence and workspace isolation; WhatsApp assertions cover redelivery, parallel capture, and message ordering.

**Public adaptation:** [webhook-inbox.js](../examples/webhook-inbox.js) retains signature verification, SQL persistence, leases, and routing rechecks. The `webhook:` cases in [the workflow tests](../examples/workflows.test.js) run against an embedded PostgreSQL database, including rollback and an account moving during enrichment. Provider envelopes are replaced with one synthetic contract.

Private implementation references: `webhookInbox.js`, `whatsappCapture.js`, `webhookSignature.js`, and migrations 015–016.

## 2. Stale AI results and manual overrides

A manager can change an enquiry or apply a score while a model request is in flight. Saving the old result blindly would replace current context or human judgement. Holding a database transaction open during the model request would tie database resources to external latency.

The scoring worker loads a snapshot, computes local rules, and makes the external request outside the write transaction. Before saving, it locks the current lead and compares the scoring-content hash and workspace. A changed snapshot is discarded. Score audit insertion and effective-score update commit together, and the update respects the current manual override.

This handles two distinct races: changed input invalidates a computed result, while a new override remains authoritative even if an otherwise current computation finishes later. WhatsApp changes during active work request a follow-up scoring pass.

**Engineering result:** scoring-content checks reject obsolete results before persistence. Audit and score writes share a transaction, and a manager’s current override remains the effective priority when a model result arrives later.

**Application test evidence:** score API assertions cover an override entered during scoring; queue and WhatsApp assertions cover asynchronous updates.

**Public adaptation:** [lead-scoring.js](../examples/lead-scoring.js) retains snapshot evaluation, content-hash/workspace rechecks, row locking, audit insertion, and manual override precedence. The `scoring:` cases in [the workflow tests](../examples/workflows.test.js) exercise edits and overrides during a pending evaluation. The evaluator is injected and the hashed fields/schema are reduced; [sample boundaries](../examples/README.md) explain the differences.

Private implementation references: `scoringQueue.js`, `geminiScoringService.js`, and `leadActivityController.js`. See [scoring details](ai-lead-scoring.md) for model inputs and fallback behavior.
