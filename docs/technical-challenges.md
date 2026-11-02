# Two engineering case studies

[Portfolio](../README.md) · [Architecture](architecture.md)

These case studies describe the application’s implementation. My responsibilities are listed separately in [My contributions](my-contributions.md). Application test references below come from source inspection; those suites were not run for this portfolio.

## 1. Webhook retries and workspace routing

A provider can redeliver an event after a timeout. Meanwhile, the connected account may have been removed or reassigned. A valid signature establishes the sender; it does not authorize delivery into a particular workspace.

The application separates receipt from capture:

1. Verify the signature over the raw request bytes and persist the event batch in PostgreSQL before acknowledging receipt. A unique provider/event key handles redelivery.
2. A worker claims due work using a lease and resolves one active account connection. Missing, ambiguous, or unsupported routing goes to quarantine.
3. Inside the capture transaction, recheck the current connection, write the lead/activity, and mark the event complete together. A unique inbox reference guards against repeated capture.
4. Schedule scoring after the capture commits. Processing failures retry; expired leases allow interrupted work to be reclaimed.

The important distinction is between **delivery identity** and **business identity**. Two deliveries can refer to one event; two genuine messages can belong to the same lead. WhatsApp uses a workspace/sender mapping for conversation continuity, separately from event deduplication.

**Trade-off:** PostgreSQL supplies durable reception without an additional broker, but retained events, failed work, and quarantine require operational handling. Capture and completion share a local transaction; external effects have separate delivery semantics.

**Tests inspected:** migrated database fixtures cover persistence and workspace isolation; WhatsApp tests cover redelivery, parallel capture, and message ordering.

**Public adaptation:** [webhook-inbox.js](../examples/webhook-inbox.js) retains signature verification, SQL persistence, leases, and routing rechecks. The `webhook:` cases in [the workflow tests](../examples/workflows.test.js) run against an embedded PostgreSQL database, including rollback and an account moving during enrichment. Provider envelopes are replaced with one synthetic contract.

Private implementation references: `webhookInbox.js`, `whatsappCapture.js`, `webhookSignature.js`, and migrations 015–016.

## 2. Stale AI results and manual overrides

A manager can change an enquiry or apply a score while a model request is in flight. Saving the old result blindly would replace current context or human judgement. Holding a database transaction open during the model request would tie database resources to external latency.

The scoring worker loads a snapshot, computes local rules, and makes the external request outside the write transaction. Before saving, it locks the current lead and compares the scoring-content hash and workspace. A changed snapshot is discarded. Score audit insertion and effective-score update commit together, and the update respects the current manual override.

This handles two distinct races: changed input invalidates a computed result, while a new override remains authoritative even if an otherwise current computation finishes later. WhatsApp changes during active work request a follow-up scoring pass.

**Trade-off:** the hash covers selected fields rather than a universal record revision. Stale-result rejection also does not guarantee a replacement job for every edit path. Queue state is process-local, so pending work is lost on restart and is not coordinated across replicas. Durable scoring recovery is a remaining improvement.

**Tests inspected:** score API assertions cover an override entered during scoring; queue and WhatsApp tests cover asynchronous updates.

**Public adaptation:** [lead-scoring.js](../examples/lead-scoring.js) retains snapshot evaluation, content-hash/workspace rechecks, row locking, audit insertion, and manual override precedence. The `scoring:` cases in [the workflow tests](../examples/workflows.test.js) exercise edits and overrides during a pending evaluation. The evaluator is injected and the hashed fields/schema are reduced; [sample boundaries](../examples/README.md) explain the differences.

Private implementation references: `scoringQueue.js`, `geminiScoringService.js`, and `leadActivityController.js`. See [scoring details](ai-lead-scoring.md) for model inputs and fallback behavior.
