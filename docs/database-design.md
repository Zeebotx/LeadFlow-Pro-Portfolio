# Database design

[Portfolio](../README.md) · [Architecture](architecture.md)

PostgreSQL is accessed through parameterized `pg` queries and explicit transactions. The base schema and migrations 001–019 define the documented model.

## Tenant identity

`workspace_id` determines tenancy; creator `user_id` records authorship. Membership supplies role, and `assigned_to` restricts ordinary lead visibility. Personal records move into shared workspaces through an explicit import workflow.

## Core relationship diagram

```mermaid
erDiagram
    USERS ||--o{ WORKSPACES : owns
    USERS ||--o{ WORKSPACE_MEMBERS : joins
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
    WORKSPACES ||--o{ PLATFORM_CONNECTIONS : connects
    WORKSPACES ||--o{ CAMPAIGNS : organizes
    WORKSPACES ||--o{ LEADS : contains
    CAMPAIGNS o|--o{ LEADS : attributes
    CAMPAIGNS o|--o{ PLATFORM_METRICS : attributes
    LEADS ||--o{ LEAD_SCORES : evaluated_by
    LEADS ||--o{ LEAD_HISTORY : records
    WEBHOOK_INBOX o|--o| LEADS : captured_from
    WEBHOOK_INBOX o|--o| LEAD_HISTORY : activity_from
    LEADS ||--o{ WHATSAPP_SENDERS : maps
    WORKSPACES ||--o{ WHATSAPP_SENDERS : scopes
    LEADS ||--o{ EMAIL_OUTBOX : triggers
    USERS ||--o{ EMAIL_OUTBOX : receives
```

Selected foreign-key relationships are shown; authentication, billing, invitation, and some actor relationships are omitted.

## Constraints that carry business rules

| Rule | Database support |
| --- | --- |
| Campaign and lead stay in one workspace | Composite campaign ID/workspace foreign keys; also used by content metrics |
| Membership is unique | Unique workspace/user pair |
| Provider redelivery does not create another inbox event | Unique provider/event key |
| Reprocessing does not repeat the same lead/activity capture | Separate unique nullable inbox references on leads and history |
| WhatsApp conversation stays within its workspace | Workspace/sender primary key and composite lead/workspace FK |
| Receiving WhatsApp account has one workspace | Unique receiving-account constraint |
| Alert is queued once per recipient for a lead | Unique workspace/lead/recipient triple |

The lead and activity inbox references are separate: one event may produce a lead, an activity, both, or neither. There is no universal unique person identity. Manual contact/name matching is heuristic and can race; tracked content URLs also lack a uniqueness guarantee.

## Transactions and migrations

Workspace import locks source and target, moves related business records in one transaction, clears assignments, and records history. Deferrable same-workspace campaign constraints support the coordinated move.

The migration runner takes an advisory lock, orders filenames, and applies each unapplied migration transactionally. Some migrations move or delete data. Startup checks a required migration filename; it does not automatically migrate.

JSONB holds payloads, custom fields, and score/history details. Due-work and lead/history indexes support polling and retrieval, but production query plans were not measured. Lead deletion cascades some histories; these records are not an immutable archive.

Application authorization relies on Express and SQL predicates. RLS enablement in migrations does not establish effective hosted-role policy. No live database or applied migration ledger was checked for this portfolio.
