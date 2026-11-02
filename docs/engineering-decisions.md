# Engineering trade-offs

[Portfolio](../README.md) · [Technical reference](README.md)

These notes explain choices present in the implementation and their costs. They do not reconstruct the team’s original deliberations.

| Approach | Benefit | Cost or remaining work |
| --- | --- | --- |
| Separate Next.js interface and Express API | Provider callbacks, workers, and business logic share one backend | Origins, cookies, callback URLs, and deployments must stay coordinated |
| Direct SQL and numbered migrations | Transaction boundaries, locks, and relational constraints remain visible | Query responsibility is dispersed; a narrower data-access layer would simplify consistent changes |
| Workspace membership plus lead assignment | Separates tenant access from responsibility for individual records | Reads, writes, exports, aggregates, and jobs all need the same scope rules |
| PostgreSQL webhook inbox | Persists receipt before acknowledgement and supports retry recovery | Payload retention, polling, and quarantine need operational ownership |
| Local rules plus Gemini | Provides bounded, reviewable scores with a local fallback | Restricted model input loses nuance; predictive quality remains unmeasured |
| In-memory scoring queue | Bounds concurrent work with few runtime dependencies | Jobs disappear on restart and do not coordinate across replicas |
| Database-triggered email outbox | Alert enqueueing commits with the lead change | Trigger side effects complicate maintenance; once-per-recipient deduplication suppresses later repeat alerts |
| Application-owned sessions | Keeps identity and workspace authorization in the backend | Rotation, revocation, recovery, browser storage, and provider linking remain application responsibilities |

The clearest follow-up is durable scoring recovery. The webhook and email paths already persist work, while scoring depends on the current process. A persistent queue or reconciliation scan would need to handle retries, duplicate claims, and manual override precedence together.

[The two case studies](technical-challenges.md) explain the failure sequences behind these trade-offs. [Architecture](architecture.md) shows component boundaries; [security and privacy](security-and-privacy.md) covers authorization and data handling.
