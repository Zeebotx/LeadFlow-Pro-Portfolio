# Security and privacy

[Portfolio](../README.md) · [Publication review](verification-and-publication-review.md)

This document explains source-visible safeguards. It is not a penetration-test certificate, legal assessment, or claim that every deployment control is configured. Security-sensitive operational details and exploitation guidance are excluded.

## Identity and session controls

Email/password registration hashes passwords with bcrypt. Login issues a short-lived JWT and a refresh credential whose hash is stored in PostgreSQL. Refresh consumes the prior credential under transaction/locking before recording its replacement. Middleware verifies the signature and compares the user's current authentication version with the signed version. Password reset consumes an expiring hashed recovery token, increments that version, and revokes stored refresh credentials.

Cookies are HTTP-only and receive secure/same-site behavior based on runtime/request configuration. The client also stores an access credential locally for bearer requests. Consequently, the system should not be described as cookie-only, fully immune to browser script compromise, or immediately invalidating every existing access credential on ordinary logout. Token lifetime, version-based revocation, refresh revocation, and browser cleanup have different roles.

Google OAuth uses Passport and a short-lived one-use handoff for session exchange. Social connection callbacks consume expiring provider-specific state, then recheck user version and management access. Browser-correlation handling has a compatibility path, so universal strict browser binding is not claimed. Route-level login/recovery rate limiters and unsafe-origin checks provide additional controls without implying a complete abuse-prevention system.

## Workspace and record authorization

| Boundary | Implemented control |
| --- | --- |
| Identity → workspace | Selected ID validated against actual membership; explicit unauthorized selection rejected |
| Workspace → feature | Route role gates and owner-funded subscription access |
| Member → lead | Managers see workspace records; ordinary agents/Viewers are assignment-restricted |
| Lead → campaign | Controller validation and composite same-workspace campaign FKs |
| Manager → assignee | Assignment requires a Sales Agent in the same workspace |
| User → billing | Selected workspace's actual Owner must match the requesting identity |
| Invitation → membership | Pending/unexpired invitation and matching signed-in account email |
| External event → tenant | Signature validation plus exactly one active account mapping; ambiguity quarantined |

The backend rechecks membership/record state in important mutation transactions. Frontend role visibility is user experience, not a replacement for API checks. Creator identity is not tenant identity. A Viewer role exists, but assignment restrictions make its intended product experience an owner-review item.

## Secrets and integration credentials

Connected provider credentials use AES-GCM encryption before persistence and are decrypted only for backend provider requests. Production operation requires deliberate key management, access restriction, and rotation planning; encryption code alone does not establish secure deployment configuration. Ordinary connection list responses return metadata rather than credentials.

Secret values are supplied through environment configuration/secret injection. `NEXT_PUBLIC_` values are browser-facing build inputs and must not contain secrets. This portfolio includes names only where useful, with no environment files, provider account identifiers, database URLs, callback hosts, or credential material.

## Input, transport, and output controls

Database values use parameterized SQL, with controlled field/table allowlists where SQL structure is assembled. Validation covers relevant platform/status enums, contact formats, lengths, numerical bounds, relationship scope, and mutation fields. HTML-like text is sanitized on applicable capture paths, mail templates escape untrusted text, and CSV output quotes fields and handles dangerous spreadsheet prefixes. These controls vary by endpoint and output context; a shared helper is not proof of complete validation coverage.

Social and payment webhook signatures use raw request bytes and timing-safe comparisons. TikTok signature handling includes timestamp checks. The JSON parser bounds request size and rejects compressed JSON in the configured path. A dedicated public-platform fetch helper restricts destinations, public-address resolution, redirects, time, and response size for scraping; this should not be generalized to every provider request.

The final error handler omits production stack traces. Controllers and health/error responses are not entirely uniform, so this is not a claim that all diagnostic information is universally redacted. Console logging and retained operational payloads require deployment-specific log access and retention policies.

## AI data minimization

The model payload uses locally derived fixed intent labels and a small set of allowlisted categories/flags. It does not send raw messages, names, contact values, arbitrary source/campaign text, or arbitrary custom fields. Tests inspect the constructed SDK request to check this property. Model normalization bounds scores and explanatory fields; manual override remains available.

The application's database still stores contact details, original enquiry text, message history, inbox payloads, and score audit material. Restricting AI input is not complete anonymization of the application or evidence of consent. Model-provider terms, data residency, retention, and operational access were not verified.

## Personal information and lifecycle

Personal/shared workspace separation limits accidental sharing during team onboarding; moving personal business records requires an explicit owner action. Access-sensitive notification delivery is rechecked before send. Lead deletion and FK actions remove some dependent records, but that does not establish end-to-end erasure from inboxes, backups, logs, external providers, or previously delivered mail.

Privacy, terms, and data-deletion pages exist. Their presence does not implement a full data-subject request workflow or establish POPIA/GDPR compliance. No formal legal review, consent ledger, comprehensive retention schedule, backup-erasure process, or cross-border assessment was evidenced. No legal compliance claim is made here.

## Assurance limits and responsible follow-up

Deployment hardening, database transport/roles, browser credential exposure, provider lifecycle management, and comprehensive logging/retention controls warrant owner-led operational review. This public document does not enumerate exploitable conditions or publish private configuration. Measured security assurance would require a separately scoped review of the actual environment.

RLS enablement appears in migrations, while application authorization relies on the Express service and workspace SQL predicates. The effective hosted database role and Data API permissions were not checked. No generalized claim of browser-accessible per-user RLS policies is made.

## Evidence locators

Private source: `backend/controllers/authController.js`, `leadActivityController.js`, `teamController.js`, `whatsappController.js`; `backend/middleware/authMiddleware.js`, `teamMiddleware.js`, `oauthState.js`, `webhookSignature.js`, `rateLimiter.js`; `backend/utils/getWorkspaceContext.js`, `validation.js`; `backend/services/userService.js`, `piiSanitizer.js`, `platformHttp.js`, `emailOutbox.js`; `backend/config/mailer.js`, `db.js`; migrations 011–019; `frontend/src/lib/api.js`, `session.js`, `popupAuth.js`.

Assertions inspected: `backend/tests/auth.test.js`, `workspaceAccess.test.js`, `workspaceDatabase.test.js`, `team.test.js`, `modelPrivacy.test.js`, `webhooks.test.js`, `videoSecurity.test.js`, `emailOutbox.test.js`, `leadScoringApi.test.js`. Tests were not freshly executed and no live security probes were performed.
