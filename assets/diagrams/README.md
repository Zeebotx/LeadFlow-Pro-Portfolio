# Diagram index

[Portfolio](../../README.md)

Mermaid definitions are embedded in Markdown for native GitHub rendering. They describe the reviewed source, not a verified hosted environment.

| View | Location | Meaning |
| --- | --- | --- |
| System components | [Main README](../../README.md#system-architecture) | Browser, API, database, providers, scoring, inbox and outbox |
| Incoming lead sequence | [Architecture](../../docs/architecture.md#lead-ingestion-sequence) | Persist-before-acknowledge reception and later transactional capture/scoring |
| Scoring flow | [AI scoring](../../docs/ai-lead-scoring.md#evaluation-pipeline) | Local rules, model privacy boundary, fallbacks, recheck and persistence |
| Selected physical relationships | [Database design](../../docs/database-design.md#core-relationship-diagram) | Actual foreign-key relationships with explicit omissions |
| Social OAuth | [Integrations](../../docs/integrations.md#social-oauth-lifecycle) | Start, saved state, provider callback, permission recheck and encrypted connection |
| Google authentication sequence | [Authentication](authentication.md) | Provider login followed by one-use application-session handoff |

Arrows represent the type of relationship explained by the surrounding document. ER lines indicate real FKs; architecture arrows indicate calls/data flow; sequence arrows indicate order. The diagrams intentionally exclude credentials, provider/customer IDs, infrastructure hostnames, prompts, and exact operational policy settings.

Definitions receive structural checks during the publication review. Native GitHub rendering remains an owner preview item; no renderer was installed for this task.
