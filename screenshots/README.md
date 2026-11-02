# Screenshot capture guide

[Portfolio](../README.md)

Four owner-supplied captures received on 2 November 2026 are included in the portfolio. The owner authorized local cropping and redaction. These are real captures with redactions, not synthetic-data screenshots.

| File | View | Preparation |
| --- | --- | --- |
| `dashboard.png` | Recent incoming leads | Browser chrome and lower rows cropped; contact identities covered with solid rectangles |
| `lead-management.png` | Workspace lead table | Browser chrome and lower rows cropped; contact identities and assignee handle covered |
| `lead-scoring.png` | Scoring drawer | Cropped to the drawer; contact identity covered |
| `landing-page.png` | Public marketing page | Browser chrome and lower content cropped; illustrative prospect cards retained |

All four exports were flattened to RGB PNGs without source metadata and visually inspected. No unredacted authenticated capture was copied into this folder. UI scores, statuses, and reasoning were not changed. The landing-page prospect cards are marketing illustrations. Displayed scoring confidence is model-reported, not measured predictive accuracy, and a recommendation does not prove an automated action was executed.

## Optional future captures

Use an isolated demonstration environment with synthetic records only. Confirm the screen reflects the reviewed feature and role. The table covers both existing views and optional additions; role labels describe the intended capture context, not a verified role for the supplied images:

| Priority | Proposed file | Actual view and role | What to demonstrate |
| --- | --- | --- | --- |
| 1 | `dashboard.png` | `/dashboard`, Owner | Latest leads and owner charts, with an accurate data/redaction caption |
| 2 | `lead-management.png` | `/leads`, Manager | Filtering, status, assignment and history; pipeline is limited to the current page |
| 3 | `campaign-management.png` | Campaign controls in analytics or platform detail, Manager | Local campaign creation/list and attributed lead counts; do not imply ad-provider publishing |
| 4 | `analytics.png` | `/analytics`, Owner or Manager | Platform/content overview; distinguish estimated and provider-returned metrics in the caption |
| 5 | `lead-scoring.png` | Lead score drawer, Manager | Persisted score components/history and an override rationale; label rule fallback accurately |
| 6 | `platform-integrations.png` | `/platforms` or connection selection, Manager | Available connection types and genuine connection state; never expose a token form value |

## Safe preparation and capture

1. Use a dedicated synthetic workspace and accounts. Do not rename production customers and assume the data is anonymized.
2. Use reserved demonstration email domains and invented names. Avoid real phone numbers, customer text, company identities, external handles, provider IDs, merchant references, and teammate avatars.
3. Close developer tools, secret managers, terminals, password managers, and notifications. Capture the application viewport without browser profile controls or unrelated tabs.
4. Inspect tables, menus, hover content, history, score snapshots, billing links, query strings, and connection metadata for identifiers. Do not capture OAuth callbacks, invitation URLs, recovery links, or credential-entry screens.
5. Capture the real rendered UI at a consistent desktop viewport. Do not synthesize features or edit records into the image. Any cropping/redaction must preserve an honest description of the screen.
6. Review image metadata and visible content, keep an unshared original if needed, then add only approved sanitized images here.
7. Add a short caption stating view, role, demonstration data, capture date, and any unavailable/fallback behavior. Review again before publication.

## Adding images to the root README

After a reviewed file exists, add a product preview near the top of the root README using its relative path, for example `screenshots/dashboard.png`. Start with the dashboard, lead-management view, and score drawer. Add only image references whose files exist. The root README displays the dashboard and groups the other three views in an expandable gallery.

These screenshots remain owner-supplied publication items. They are not evidence of deployment, provider approval, measured business results, or individual authorship on their own.
