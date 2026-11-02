# Development journey

[Portfolio](../README.md) · [My contributions](my-contributions.md) · [Verification](verification-and-publication-review.md)

## Evidence and attribution

The earlier read-only source review recorded 73 commits reachable from the reviewed HEAD, dated 19 May–2 November 2026, with the repository not marked shallow. That establishes the available history, not that deleted branches, prior repositories, or all development work are available. This portfolio folder has no Git history; that count was not independently rerun during the attribution update.

On 2 November 2026, the portfolio owner confirmed that the account in nine supplied GitHub commit-history screenshots is theirs. Those entries support the personal contribution categories in [My contributions](my-contributions.md), including implementation work and separate merge activity. The landing-page rebrand and Paystack billing entries visibly credit Claude as a co-author. This evidence replaces the earlier unresolved account-attribution note; it does not imply sole authorship of the project.

Contributor contact details, private URLs, raw commit messages, and private commit identifiers are omitted. Dated milestone references below are public narrative labels; the earlier review recorded exact private commits in internal evidence notes outside this portfolio. Commit counts do not measure individual contribution.

## Verified milestone map

| Reference | Commit dates | Verified development evidence | What it supports |
| --- | --- | --- | --- |
| J01 | 19–21 May 2026 | Next.js initialization, frontend structure/welcome work, initial backend/database files | A progression from framework scaffold to application and persistence foundations |
| J02 | 26 May–11 July 2026 | Login client/server fixes, database-connected login work, dashboard/routing and account-recovery work | Identity and navigable interface foundations; not current deployment proof |
| J03 | 21 July–19 August 2026 | Secret-injection setup, dashboard graph work, TikTok/Instagram integration scaffolding and root development scripts | Development tooling and initial cross-provider architecture |
| J04 | 8 October 2026 | A large integration/scoring/testing change adds the scoring service/queue and broader application work | External scoring and integration implementation appear by this date; the commit is not a live-service certification |
| J05 | 10–11 October 2026 | Deployment-oriented scripts/URLs, provider callback/account fixes, policy pages, workspace/team/invitation work, mail integration | Integration hardening and collaboration added to the earlier individual workflow |
| J06 | 26 October 2026 | Access/security changes, workspace-isolation migrations, durable social inbox, migrated database tests and OAuth follow-up | Tenant and asynchronous-processing boundaries become explicit in schema and tests |
| J07 | 27 October 2026 | Inbound WhatsApp capture, frontend identity/navigation work, Paystack subscription billing | Conversation identity and commercial entitlement workflows expand the backend |
| J08 | 28 October 2026 | Email alerts, billing owner/access restrictions, disconnect wiring, replacement of ineffective test checks | Broader negative-path and consistency testing rather than feature presence alone |
| J09 | 29 October 2026 | Shared styling/dialog accessibility work; popup OAuth and platform callback tests | Interaction refinements backed by focused frontend/backend assertions |
| J10 | 2 November 2026 | Broad source-commenting and frontend guidance pass | Maintenance/navigation material, not a measured new runtime capability |

Dates come from commit metadata. These are milestone groupings, not a claim that each subsystem was created entirely on one day. Major merged changes are sometimes bundled, so a commit cannot reveal every design iteration or elapsed effort.

## How the architecture evolved

The early history supports a sequence from public interface and login toward a connected lead workspace. The current design no longer treats creator ownership as the sole boundary: workspace membership, assignment, personal/shared separation, and same-workspace relationships are material additions. Migration evolution is stronger evidence for those changes than conceptual requirement diagrams.

Integration work introduces a second timing model beyond request/response. Current social delivery persists to an inbox, while qualification continues in a process-local queue. WhatsApp later adds sender continuity and out-of-order message handling. Billing and email introduce further external side effects and separate deduplication/delivery state.

This describes observable implementation evolution. It does not prove a planned migration from a formally specified architecture, an intentional microservice strategy, or that every older approach was consciously rejected.

## Testing and refactoring evidence

Current tests combine small function assertions, mocked provider/SQL behavior, HTTP tests, and PGlite fixtures that apply migrations. The late-October history includes changes to queue concurrency tests, mail/outbox behavior, billing fixtures, and negative authorization scenarios. The later popup and modal work adds focused interaction harnesses.

The current inventory is **23 backend test files and 3 frontend test files**. These counts were enumerated from the working tree on 2 November 2026; they are file counts, not passing test counts, coverage percentages, or E2E journey counts. Historical reports mention earlier runs against different snapshots. Those results are not restated as current verification.

Refactoring is visible in shared client/session utilities, modal infrastructure, common styling, and provider callback handling. Broad comment additions improve navigation but do not by themselves establish correctness or regression freedom. Large page/controller modules and distributed SQL responsibility remain visible maintenance costs.

## Challenges and current state

The current tests and source address tenant isolation, invitation identity, signed redelivery, concurrent conversation creation, stale scoring/manual override, and transactional notification enqueue. These are engineering problems visible in the implementation, not invented accounts of what an individual contributor experienced.

Implemented code and documentation are substantial; live provider approvals, current deployment, migration state, recipient mail delivery, billing reconciliation, scoring restart recovery, production load, and predictive scoring quality remain unverified. General CRM synchronization, a user-configurable automation engine, weekly digests, automatic archiving, and provider ad publishing should not be inferred from planning documents or disabled UI controls.

## Personal contribution summary

My attributed work follows the project from frontend/account foundations through social connections, webhook and scoring work, shared workspaces, billing, notifications, and interface refinement. The screenshots support contribution to these areas; detailed technical case studies remain explanations of the project implementation. Claims of exclusive design ownership, precise contribution percentages, or authorship of every underlying change would require additional evidence.

The [contribution breakdown](my-contributions.md) records the visible AI co-authorship and separates implementation from merge activity. It can support a CV description such as: “Contributed across a Next.js/Express lead-management application, including social integrations, Gemini-assisted scoring, multi-tenant workspaces, subscription billing, and regression testing; used AI assistance, with co-authorship recorded on selected changes.”

## Evidence locators

Read-only Git chronology, addition history, and selected changed-file statistics; current source for each milestone's subsystem; migrations 001–019; `backend/tests/`, `frontend/tests/`; `docs/PROJECT_CONTEXT.md`, `docs/sequence-diagrams.md`, and project specification material as secondary references. A specifically named `codebase_complete_analysis.md` was not found in the current file inventory. Existing deleted root README/test-audit files were not restored or modified.
