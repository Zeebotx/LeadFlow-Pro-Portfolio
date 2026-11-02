# API overview

[Portfolio](../README.md) · [Security](security-and-privacy.md)

## Contract and organization

Express exposes application resources beneath `/api`. Authentication/OAuth, leads, campaigns, team, workspaces, billing, platforms, and analytics have separate routers. Signed provider deliveries arrive beneath `/webhooks`, independently of the browser REST resources. This is a descriptive selection of product-facing endpoints, not a complete operational API reference.

The design is resource-oriented JSON over HTTP, with action endpoints for rescore, assignment, notes, checkout, and synchronization. It is not uniformly REST-pure: methods and response wrappers reflect the implementation. No generated OpenAPI contract or versioned API namespace was found.

## Access model

Protected requests carry a bearer credential or accepted access-token cookie. The shared frontend client sends `x-workspace-id`; the backend validates selection against current membership. Most feature routes also require access through the workspace owner's subscription. Missing identity, unavailable subscription access, and insufficient permissions are distinct conditions.

In the table, **Member** means verified identity, selected-workspace membership, and the ordinary subscription gate. **Manager** means Owner or Sales Manager in that workspace. **Assigned reader** means an agent or Viewer can read only assigned leads, while managers can read all workspace leads. Viewer mutations are denied. Assignment targets must be Sales Agents in the same workspace; this constrains practical Viewer use.

## Selected endpoint reference

| Method | Path | Purpose | Authorization | High-level request | Response behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | Create application identity | Public | Email, password, profile names | 201 with user summary; validation/conflict responses |
| POST | `/api/auth/login` | Sign in | Public, login limiter | Email, password, remember preference | User/access credential and session cookies on success |
| POST | `/api/auth/refresh` | Rotate session | Valid refresh credential | Cookie or accepted request credential | New access credential and replacement refresh cookie |
| POST | `/api/auth/forgot-password` | Request recovery | Public, reset limiter | Email | Generic account-existence message on ordinary success; delivery errors can fail |
| POST | `/api/auth/reset-password` | Consume recovery link | Valid reset token and identity | Link token, email, new password | Password change and session revocation, or invalid/expired response |
| GET | `/api/workspaces` | List available workspaces | Verified identity | No ordinary workspace membership gate | Workspace roles and access availability; can bootstrap personal workspace |
| POST | `/api/workspaces` | Create shared workspace | Verified identity, entitlement check | Workspace name | 201 with workspace; owner membership created transactionally |
| GET | `/api/leads` | Filter visible leads | Member; assigned-reader restriction | Page, limit, search, status, platform, campaign/attribution filters | Lead list and pagination; duplicates hidden |
| POST | `/api/leads` | Record a lead/interaction | Member + Manager | Platform, name, optional contact, campaign, enquiry/context | 201 with lead and duplicate indicator; scoring scheduled after commit |
| PUT | `/api/leads/:id` | Edit permitted lead fields | Member; Manager or assigned Sales Agent | Manager allowlist; agent status only | Updated lead; status history written transactionally |
| PUT | `/api/leads/:id/assignment` | Assign or unassign | Member + Manager in handler | Same-workspace Sales Agent ID or null | Updated lead and assignment history |
| POST | `/api/leads/:id/notes` | Append follow-up | Member; Manager or assigned Sales Agent | Note text | 201; append-only history entry |
| GET | `/api/leads/:id/history` | Read activity | Member + assigned-reader restriction | Optional `before` cursor | Up to 100 events plus next cursor |
| GET | `/api/leads/:id/scores` | Read scoring history | Member + assigned-reader restriction | Lead ID | Latest audit and up to 25 score records |
| POST | `/api/leads/:id/rescore` | Request qualification | Member + Manager | Lead ID | Completed result or queued status; cooldown can return 429 |
| PUT | `/api/leads/:id/override-score` | Apply human priority | Member + Manager | Numeric score and rationale | Rounded effective score and authored override history |
| GET | `/api/leads/export` | Export matching leads | Member + Owner | Supported lead filters | CSV of matching records beyond the current UI page |
| GET | `/api/campaigns` | Read local campaigns | Member + Manager | Page and limit | Campaigns with lead/content aggregates and pagination |
| POST | `/api/campaigns` | Create attribution record | Member + Manager | Name, platform, optional budget/counters/dates | 201 with local campaign; no ad-provider publishing |
| GET | `/api/analytics/overview` | Platform summary | Member + Manager | Selected workspace | Platform/lead/content summary; some failures return empty data |
| GET | `/api/analytics/summary` | Owner reporting totals | Member + Owner | Supported days/campaign inputs | Totals, time series, statuses and campaign data |
| POST | `/api/analytics/sync-media` | Pull connected content | Member + Manager | Provider or all | Normalized saved content metrics and count |
| POST | `/api/auth/facebook/start` | Start connection OAuth | Member + Manager | Selected workspace | Authorization URL; analogous Instagram/TikTok starts exist |
| GET | `/api/platforms` | List connections | Member + Manager | Selected workspace | Public connection metadata, without stored tokens |
| GET | `/api/team` | Read workspace roster | Member | Selected workspace | Members; pending invitation details restricted to Owner |
| POST | `/api/team/invite` | Invite collaborator | Member + Owner | Email and permitted role | Created/renewed invitation with delivery information |
| GET | `/api/billing` | Read owner plan state | Verified selected-workspace Owner | Selected workspace | Plan availability, subscription and access state |
| POST | `/api/billing/checkout` | Initialize subscription payment | Verified selected-workspace Owner | Supported plan | Provider authorization URL and checkout reference |
| PUT | `/api/workspaces/email-alerts` | Change alert preference | Member + Owner | Boolean enabled value | Persisted workspace preference |

IDs shown above are route parameters, never real customer values. Simulation and low-level provider insight routes are intentionally omitted from this public selection. Actual source remains authoritative for exact payloads and every edge case.

## Lists and responses

Leads and campaigns default to 25 rows, with a maximum of 100; content metrics default to 20, also capped at 100. The helper returns page, limit, total, totalPages, hasNext, and hasPrev. Some lists expose both a named resource array and a `data` alias. History instead uses a descending ID cursor; scoring history is bounded without general pagination.

Lead search covers name, email, phone, and initial notes using bound SQL values. Campaign/general attribution means a campaign ID is present/absent. List totals obtained through a window count cannot establish the total from an empty out-of-range page. Offset pagination is straightforward but does not guarantee a stable view during concurrent writes. CSV export uses a read-only repeatable-read transaction, cursor batches, backpressure handling, quoting, and spreadsheet-formula prefix handling.

## Validation and errors

Validation checks supported platforms/statuses, contact formats, selected string lengths, numeric score bounds, editable field allowlists, and same-workspace campaign relationships. Assignment and mutations re-read relevant membership/record state in transactions. Generic helpers do not imply every endpoint shares the same validator.

Errors are not one universal schema: handlers may return `message`, `errors`, `error`, resource arrays, and status-specific fields. Registration/login use some 422 responses, while many product validators use 400. Other meaningful statuses include 401, 402, 403, 404, 409, 429, and upstream/unavailable errors. The final server handler hides production stacks, but controller behavior still varies. Empty analytics success responses should not be used as a health guarantee.

## External dependencies

Authentication can depend on Google; social connection and synchronization depend on provider grants and API behavior; scoring can call Gemini; billing depends on Paystack; recovery/invitation/alert mail depends on configured delivery. Webhook receipt validates a provider signature rather than a browser JWT. Acknowledgement, local persistence, downstream processing, and external acceptance represent different outcomes.

## Evidence locators

Mounts: `backend/server.js`. Contracts: `backend/routes/authRoutes.js`, `oauthRoutes.js`, `leadsRoutes.js`, `campaignsRoutes.js`, `analyticsRoutes.js`, `platformRoutes.js`, `workspaceRoutes.js`, `teamRoutes.js`, `billingRoutes.js`. Behavior: corresponding controllers, `backend/utils/pagination.js`, `validation.js`, `backend/middleware/teamMiddleware.js` and `backend/services/billing.js`.

Assertions inspected: `backend/tests/pagination.test.js`, `workspaceDatabase.test.js`, `leadScoringApi.test.js`, `team.test.js`, `billing.test.js`, `remediation.test.js`. Endpoints were verified statically, not called during this review.
