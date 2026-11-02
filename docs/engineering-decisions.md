# Engineering decisions

[Portfolio](../README.md) · [Technical reference](README.md)

The implemented architecture combines explicit data boundaries, transactional workflows, and reusable application infrastructure. These notes describe the approaches present in the code and the engineering purpose each serves.

| Approach | Implementation | Engineering value |
| --- | --- | --- |
| Next.js interface and Express API | Shared client requests reach a backend containing authorization, provider callbacks, and workers | Organizes interface, business workflows, and external service interactions |
| Direct SQL and numbered migrations | Parameterized queries, explicit transactions, row locks, and relational constraints | Makes data integrity and coordinated writes visible in the implementation |
| Workspace membership and lead assignment | Verified membership, workspace roles, assignment filters, and same-workspace relationships | Controls both tenant access and responsibility for individual leads |
| PostgreSQL webhook inbox | Persist-before-acknowledge reception, unique event identities, leased processing, and quarantine | Supports recoverable capture and repeat-delivery handling |
| Local rules with Gemini evaluation | Derived intent labels, bounded outputs, score breakdowns, audit records, and manager overrides | Provides reviewable qualification with explicit input and output controls |
| Process-local scoring coordination | Concurrency limits, active-job deduplication, content-hash checks, and rescore cooldowns | Coordinates asynchronous qualification and avoids redundant work |
| Database-triggered email outbox | Alert enqueueing within the lead transaction, recipient rechecks, leases, and retries | Connects committed sales activity to permission-aware notification delivery |
| Application sessions | bcrypt, JWT authentication versions, rotating refresh credentials, and one-use OAuth handoffs | Supports password and Google sign-in with application-owned workspace authorization |

[The two case studies](technical-challenges.md) trace webhook capture and scoring updates through their transaction boundaries. [Architecture](architecture.md) shows runtime components; [security and privacy](security-and-privacy.md) explains implemented identity and data controls.
