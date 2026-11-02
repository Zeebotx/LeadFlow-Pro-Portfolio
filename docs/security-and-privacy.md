# Security and privacy

[Portfolio](../README.md) · [Review scope](verification-and-publication-review.md)

These are implementation controls, not an assessment of a deployed environment.

## Identity and sessions

Passwords use bcrypt. JWT authentication checks the user’s current authentication version. Refresh credentials are hashed and rotated under transaction/locking. Password reset consumes an expiring hashed token, increments the authentication version, and revokes refresh credentials.

Cookies are HTTP-only with runtime-dependent secure/same-site settings. The client also persists an access credential locally for bearer requests, so browser script compromise remains relevant. Ordinary logout and version-based revocation have different effects on issued access credentials.

Google sign-in uses a one-use handoff into the application session. Provider callbacks consume expiring state and recheck identity and management rights. Login/recovery limiters and unsafe-origin checks provide additional controls.

## Workspace authorization

The backend validates the selected workspace against membership, applies role gates, and restricts ordinary lead readers by assignment. Campaign relationships use same-workspace validation and composite foreign keys. Assignments require a same-workspace Sales Agent. Billing is owner-only; invitation acceptance checks the signed-in recipient email.

Webhook signatures establish origin. Routing separately requires one active account mapping; ambiguous mappings are quarantined. Frontend role visibility complements these API checks.

## Data handling

Provider credentials use AES-GCM encryption before storage. Database values use parameterized SQL; dynamic structure uses allowlists. Applicable capture paths sanitize text, email templates escape it, and CSV export handles quoting and formula prefixes. Webhook signatures use retained raw bytes and timing-safe comparisons.

A dedicated fetch helper constrains public destinations, redirects, time, and size for content scraping. These controls vary by path and require ongoing maintenance.

The model receives fixed labels and limited metadata rather than raw enquiries or contact values. The database still retains contacts, message history, inbox payloads, and scoring audit material. [Scoring details](ai-lead-scoring.md) explains that boundary.

## Operational work remaining

Deployment keys/rotation, database privileges, provider grants, logging, retention, backups, and erasure need environment-specific review. Deleting a lead removes some related database rows but cannot retract delivered email or establish erasure from logs, backups, and providers. Published policy pages do not establish a complete consent or data-subject workflow. No legal-compliance claim is made.
