# Proposed educational code examples

[Portfolio](../README.md) · [Engineering decisions](../docs/engineering-decisions.md)

**No code samples are included or approved for publication.** Original application source is private. The proposals below would be independently rewritten, simplified teaching examples with synthetic data and no project imports. Proposed filenames do not refer to files already present.

| Proposed file | Demonstrates | Safe scope | Required distinction |
| --- | --- | --- | --- |
| `bounded-priority.js` | Input validation and a bounded deterministic output | Invented signals and weights; no production scoring policy, domain lists, prompt, or thresholds | Educational arithmetic, not LeadFlow's scoring implementation |
| `event-idempotency.js` | Separating repeated delivery identity from business identity | A tiny in-memory simulation with invented events; no provider signatures, payload schemas, account IDs, or production SQL | Illustrates deduplication; does not claim durable/exactly-once delivery |
| `stale-result-guard.js` | Rechecking a version before accepting asynchronous results | Synthetic records and a version number; no production hash composition, locking SQL, or application data | Demonstrates a concurrency concept, not the deployed guard |
| `request-coordinator.js` | Sharing an in-flight request and cleaning up on failure | Fake promises with no network, authentication, domains, storage keys, or tokens | An isolated coordination example, not the actual API client |
| `output-validation.js` | Normalizing untrusted structured output | Invented schema, values and bounds; no model prompt or proprietary lead policy | Local validation example, not a model-quality guarantee |

Each sample should have a short explanation of inputs, outputs, failure behavior, simplifications, and a small runnable assertion set appropriate to the concept. Avoid copying production structure or renaming confidential code and calling it independent. Inspect third-party rights if any external material is used.

## Approval workflow

The owner must explicitly approve the specific examples before code is added for publication. Approval should confirm the intended concepts, the right to share them, and the independent educational scope. The present request authorizes this proposal list, not actual code samples. No sample implementation or source archive was created.

After approval, reviewed samples would belong under this directory, with clear illustrative headers and no credentials, private dependencies, real contact information, prompts, environment configuration, or private repository links. Licensing remains subject to [license review](../LICENSE-REVIEW.md).
