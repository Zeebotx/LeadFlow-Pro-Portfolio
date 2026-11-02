# Security and privacy

[Portfolio](../README.md) · [Architecture](architecture.md)

Identity verification, workspace authorization, encrypted provider credentials, and controlled data flows are implemented across the API, database, and background workers.

## Identity and sessions

Passwords use bcrypt. JWT authentication checks the user’s current authentication version. Refresh credentials are hashed and rotated under transaction/locking. Password reset consumes an expiring hashed token, increments the authentication version, and revokes refresh credentials.

Cookies are HTTP-only with runtime-dependent secure/same-site settings. The shared client supplies the application’s bearer credential and coordinates refresh when an eligible request encounters an expired session.

Google sign-in uses a one-use handoff into the application session. Provider callbacks consume expiring state and recheck identity and management rights. Login/recovery limiters and unsafe-origin checks provide additional controls.

## Workspace authorization

The backend validates the selected workspace against membership, applies role gates, and restricts ordinary lead readers by assignment. Campaign relationships use same-workspace validation and composite foreign keys. Assignments require a same-workspace Sales Agent. Billing is owner-only; invitation acceptance checks the signed-in recipient email.

Webhook signatures establish origin. Routing separately requires one active account mapping; ambiguous mappings are quarantined. Frontend role visibility complements these API checks.

## Data handling

Provider credentials use AES-GCM encryption before storage. Database values use parameterized SQL; dynamic structure uses allowlists. Applicable capture paths sanitize text, email templates escape it, and CSV export handles quoting and formula prefixes. Webhook signatures use retained raw bytes and timing-safe comparisons.

A dedicated fetch helper constrains public destinations, redirects, request time, and response size for content scraping.

The model receives fixed labels and limited metadata rather than raw enquiries or contact values. The database still retains contacts, message history, inbox payloads, and scoring audit material. [Scoring details](ai-lead-scoring.md) explains that boundary.

## Auditable sales activity

Assignment, status, follow-up notes, score overrides, and WhatsApp messages are recorded in lead history. Coordinated mutations write their history in the same transaction as the lead change. Scoring records retain component values, reasoning, model metadata, and minimized input snapshots.

Hot-lead notifications are enqueued with the qualifying lead change. Before delivery, the worker rechecks current membership, role, assignment, and the workspace alert preference. This connects recorded sales activity to the same workspace permissions used by the application.
