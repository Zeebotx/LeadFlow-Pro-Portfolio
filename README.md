# LeadFlow Pro

**A shared workspace for capturing, qualifying, and following up on sales enquiries.**

[Zuhayr Mollagee](https://github.com/Zeebotx) · Lead System Developer · [Email](mailto:mollageezuhayr@gmail.com)

Next.js / React · Node.js / Express · PostgreSQL · Gemini

LeadFlow Pro brings social enquiries and manually entered leads into a workspace where teams review priority, assign follow-up, and track activity. I worked across the frontend and backend from May–November 2026 as part of a collaborative project.

**Project ownership:** LeadFlow Pro is owned by **Maphikeng Innovation Hub**. I served as the **Lead System Developer**, responsible for the project’s code and technical implementation. The full application repository remains private because it belongs to the Hub; sharing its source requires the Hub’s authorization.

![Dashboard with recent leads, scores, and statuses; contact details redacted](screenshots/dashboard.png)

*Application capture, 2 November 2026. Contact details are redacted.*

## Implemented features

| Capability | Delivered functionality |
| --- | --- |
| Lead management | Search and filters, paginated lists and pipeline views, assignment, status updates, follow-up notes, activity history, and CSV export |
| Shared workspaces | Personal and team workspaces, invitations, membership roles, and assignment-based record access |
| Social integrations | Facebook, Instagram, and TikTok connection workflows and supported event capture; inbound WhatsApp messages with sender-linked history |
| Lead qualification | Deterministic rules, Gemini-assisted evaluation, score breakdowns and history, and manager overrides |
| Campaigns and analytics | Local campaign attribution, tracked content metrics, dashboard charts, and printable owner reports |
| Notifications | Transactional email and queued hot-lead alerts with recipient permission checks |
| Subscription workflows | Paystack checkout, subscription state, owner billing controls, and plan-based workspace access |

## My contribution

- Built account flows and dashboard views, then worked on social connections, webhook capture, and Gemini-assisted qualification.
- Added shared-workspace and team workflows, including invitations, recipient checks, workspace isolation, and migrations.
- Worked on email notifications, access-control fixes, and regression tests.

[Contribution details](docs/my-contributions.md)

## Engineering highlights

**Durable webhook capture across workspaces.** Signed events are persisted in PostgreSQL before acknowledgement. Event identity, worker leases, transactional routing checks, and quarantine handling protect the capture workflow through redelivery and account changes.

[Webhook routing, retries, and transaction boundaries →](docs/technical-challenges.md#1-webhook-retries-and-workspace-routing)

**Consistent AI scoring with human control.** Evaluation runs outside the write transaction. Before saving, the worker locks and rechecks the lead, rejects stale results, and preserves a manager’s override. Score audits and effective-score updates commit together.

[Scoring concurrency and manual overrides →](docs/technical-challenges.md#2-stale-ai-results-and-manual-overrides)

## Inspect the public code

The full application is private. Two source-based adaptations show its [signed webhook inbox](examples/webhook-inbox.js) and [safe scoring writes](examples/lead-scoring.js), with a reduced PostgreSQL schema and synthetic inputs. Their [workflow tests](examples/workflows.test.js) exercise persistence, retries, routing changes, and scoring races.

Run with Node.js 22 or newer. Tests use an isolated embedded PostgreSQL database; no provider credentials are needed:

```sh
npm ci
npm test
```

[Run and explore the workflow examples](examples/README.md)

<details>
<summary>More application views</summary>

![Workspace lead table with filtering and assignment controls; identities redacted](screenshots/lead-management.png)

*Lead management: search, status, assignment, and history. Contact details and the assignee handle are redacted.*

![Scoring drawer with score components and reasoning; contact identity redacted](screenshots/lead-scoring.png)

*Scoring detail: score components, model-reported confidence, and reasoning.*

</details>

## Technical reference

[Architecture](docs/architecture.md) · [Database](docs/database-design.md) · [Scoring](docs/ai-lead-scoring.md) · [All reference notes](docs/README.md)

The technical references connect these features to their API, database, integration, and testing mechanisms. Access to the private application source for technical review is subject to authorization from Maphikeng Innovation Hub.
