# LeadFlow workflow examples

[Portfolio](../README.md)

Two source-based adaptations show how LeadFlow Pro handles signed lead capture and asynchronous score writes. They retain the relevant SQL and transaction boundaries while using a reduced schema and synthetic fixtures.

## Run

Use Node.js 22 or newer. From the repository root:

```sh
npm ci
npm test
```

Tests use PGlite, an embedded PostgreSQL engine, with an isolated in-memory database and synthetic provider/evaluator fixtures. The workflow checks exercise SQL persistence and transaction behavior locally.

These executable checks cover the public adaptations. Application regression references elsewhere in the portfolio describe assertions inspected in the private project.

## Webhook capture

Read [webhook-inbox.js](webhook-inbox.js), then the `webhook:` cases in [workflows.test.js](workflows.test.js).

The receiver verifies HMAC against the original bytes and commits an inbox event before returning an acknowledgement. The worker claims a lease, resolves the account connection, performs enrichment outside the capture transaction, then rechecks the lease and connection before writing. Lead capture and event completion commit together. Ambiguous accounts are quarantined; failures retry.

Tests cover signature tampering, redelivery, untrusted workspace selection, ambiguous routing, an account moving during enrichment, expired/superseded leases, retry exhaustion, and rollback after lead insertion.

## Scoring persistence

Read [lead-scoring.js](lead-scoring.js), then the `scoring:` cases in the test suite.

The evaluator runs outside the write transaction. Persistence locks the current lead, checks content and workspace, inserts a score audit, and updates the effective score with `COALESCE(manual_score_override, ...)`. Tests change content, workspace, or manual override while evaluation is pending and verify atomic rollback on failure.

## Relationship to the application

| Sample | Private implementation basis | Public example contract |
| --- | --- | --- |
| Webhook inbox | `webhookSignature.js`, `webhookInbox.js`, migration 015 | One invented event envelope; provider adapters and credential handling omitted |
| Scoring write | `ScoringQueue.executeJob` in `scoringQueue.js` | Injected normalized evaluator; only notes hashed; workspace-scoped sample lookup replaces creator-scoped job lookup and recheck |
| [Schema](schema.sql) | Inbox, lead, and score relationships | Only fields needed for these workflows; not an application migration |

The evaluator seam represents the application’s local-rules/Gemini service. Fixtures supply normalized results so the tests can control when evaluation completes and inspect the subsequent writes. Proprietary prompts, weights, and the privacy transform remain in the private application. PGlite exercises SQL constraints and rollback through a single-session adapter with controlled workflow interleavings.

[Case studies](../docs/technical-challenges.md) · [License status](../LICENSE-REVIEW.md)
