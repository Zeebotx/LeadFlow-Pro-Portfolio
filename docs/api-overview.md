# API overview

[Portfolio](../README.md) · [Technical reference](README.md)

Express serves JSON resources under `/api`; signed provider deliveries arrive under `/webhooks`. This is a selected endpoint map, not a complete client contract.

## Access model

Protected requests verify identity and the selected `x-workspace-id` against current membership. Most feature routes also check the workspace owner’s subscription. Managers are Owners or Sales Managers. Ordinary agents and Viewers have assignment-restricted lead visibility; Viewers cannot mutate leads. Assignment targets must be same-workspace Sales Agents.

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `POST /api/auth/login` | Start application session | Public; rate limited |
| `POST /api/auth/refresh` | Rotate session credentials | Valid refresh credential |
| `GET /api/workspaces` | List available workspaces | Signed-in user |
| `GET /api/leads` | Filter and paginate visible leads | Member; assignment restrictions apply |
| `POST /api/leads` | Create lead/interaction; schedule scoring after commit | Manager |
| `PUT /api/leads/:id` | Update allowed fields and status history | Manager; assigned agent limited to status |
| `PUT /api/leads/:id/assignment` | Assign or unassign | Manager |
| `POST /api/leads/:id/notes` | Append follow-up activity | Manager or assigned agent |
| `GET /api/leads/:id/history` | Cursor-paginated activity | Member with record access |
| `GET /api/leads/:id/scores` | Bounded score history | Member with record access |
| `POST /api/leads/:id/rescore` | Request qualification; cooldown applies | Manager |
| `PUT /api/leads/:id/override-score` | Record manual score and rationale | Manager |
| `GET /api/leads/export` | Export matching records as CSV | Owner |
| `POST /api/analytics/sync-media` | Pull connected content metrics | Manager |
| `POST /api/team/invite` | Invite a collaborator | Owner |
| `POST /api/billing/checkout` | Initialize subscription payment | Selected workspace Owner |

Billing recovery routes allow an owner to pay without the ordinary subscription gate. Invitation and workspace bootstrap routes also have distinct access paths.

## Lists and errors

Lead and campaign lists default to 25 rows and cap at 100. History uses a descending ID cursor. Export reads beyond the current UI page using a repeatable-read transaction, cursor batches, backpressure, CSV quoting, and spreadsheet-formula prefix handling.

Validation includes field allowlists, score bounds, supported statuses/platforms, and same-workspace relationships. Response and error wrappers vary between controllers; there is no generated OpenAPI contract. Some analytics failures produce empty data, which weakens failure visibility.

Implementation references: `server.js`, resource routers/controllers, `pagination.js`, `validation.js`, and `teamMiddleware.js`. Endpoint behavior was inspected in source; no live API calls were made for this portfolio.
