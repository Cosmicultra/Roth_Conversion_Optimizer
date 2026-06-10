# Monday.com board setup for prospect drip sync

When a prospect completes the `/optimize` wizard, the app creates (or updates) an item on your Monday.com board so automations can run drip campaigns.

## Board columns

Create or configure a board with these columns:

| Column title (suggested) | Monday type | Required | Maps to |
|--------------------------|-------------|----------|---------|
| Name | default (item name) | Yes | First + last name |
| Email | Email | Yes | Prospect email |
| Status | Status | Recommended | Funnel stage for automations |
| State | Text | Optional | State of residence |
| Age | Numbers or Text | Optional | Client age |
| Qualified assets | Numbers | Optional | Traditional IRA balance |
| Source | Text | Optional | Lead source (e.g. `meta_optimize`) |

### Status labels

Create these labels on your **Status** column (exact spelling matters):

| App event | Status label sent to Monday |
|-----------|----------------------------|
| Wizard completed | `Wizard Complete` |
| Preview viewed | `Preview Viewd` (must match your board label exactly) |

Configure Monday automations against these labels (e.g. “When Status changes to Wizard complete → …”).

## API token

1. Open [Monday Developer](https://developer.monday.com/).
2. Create a **Personal API token** with `boards:read` and `boards:write` scopes.
3. Add it to `.env.local` as `MONDAY_API_TOKEN` (server only — never expose in the browser).

## Finding board and column IDs

### Board ID

Open your board in Monday. The URL looks like:

`https://your-account.monday.com/boards/1234567890`

The number at the end is `MONDAY_BOARD_ID`.

### Column IDs

Run this query (replace `YOUR_TOKEN` and board id):

```bash
curl -s https://api.monday.com/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_TOKEN" \
  -d '{"query":"query { boards(ids: [1234567890]) { name columns { id title type } groups { id title } } }"}'
```

Use the returned `id` values for each column in `.env.local`:

- Email column → `MONDAY_COLUMN_EMAIL`
- Status column → `MONDAY_COLUMN_STATUS`
- Optional columns → `MONDAY_COLUMN_STATE`, `MONDAY_COLUMN_AGE`, `MONDAY_COLUMN_ASSETS`, `MONDAY_COLUMN_SOURCE`

Optional: set `MONDAY_GROUP_ID` to a group `id` from the same response if new items should land in a specific group instead of the board default.

## Database migration

Run [`supabase/migrations/002_monday_item_id.sql`](../supabase/migrations/002_monday_item_id.sql) in the Supabase SQL editor so each profile can store its linked Monday item id (prevents duplicate board rows).

## Testing

1. Point env vars at a **test board**, not production drips.
2. Complete the `/optimize` wizard through step 6.
3. Confirm a new item appears with name, email, and status `Wizard complete`.
4. View the Roth preview and confirm status updates to `Preview viewed`.

See [`ENV.md`](../ENV.md) for all `MONDAY_*` variables.
