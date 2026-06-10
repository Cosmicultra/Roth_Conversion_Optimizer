# Environment variables

Copy to `.env.local` in the project root and fill in your values.

```env
# Supabase — use the same project URL for both
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Calendly booking link for prospect CTAs
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-user/roth-consultation

# Calendly webhook signing key (server only — from webhook subscription setup)
CALENDLY_WEBHOOK_SIGNING_KEY=your-webhook-signing-key

# Monday.com — sync wizard-complete prospects to your marketing board (server only)
MONDAY_API_TOKEN=your-personal-api-token
MONDAY_BOARD_ID=1234567890
MONDAY_GROUP_ID=optional_group_id
MONDAY_COLUMN_EMAIL=email_col_id
MONDAY_COLUMN_STATUS=status_col_id
MONDAY_COLUMN_STATE=optional_state_col_id
MONDAY_COLUMN_AGE=optional_age_col_id
MONDAY_COLUMN_ASSETS=optional_assets_col_id
MONDAY_COLUMN_SOURCE=optional_source_col_id
```

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL in [`supabase/migrations/001_client_profiles.sql`](supabase/migrations/001_client_profiles.sql) in the Supabase SQL editor.
3. Run [`supabase/migrations/002_monday_item_id.sql`](supabase/migrations/002_monday_item_id.sql) if you use Monday.com sync.
4. Run [`supabase/migrations/003_meeting_booking.sql`](supabase/migrations/003_meeting_booking.sql) for Calendly meeting tracking.
5. **Settings → API**:
   - **Project URL** → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for browser; used for advisor login)
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose in the browser)
6. **Authentication → Providers → Email** — enable Email sign-in.
7. **Authentication → Users → Add user** — create your advisor account (email + password).
8. Optionally disable public sign-up under Authentication settings.

## Advisor login

1. Restart the dev server after updating `.env.local`.
2. Open **`http://localhost:3000/advisor/login`**
3. Sign in → you land on **`/advisor`** (prospect list).
4. Click a row → **`/advisor/clients/[id]`** (full worksheet).

## Calendly

Set `NEXT_PUBLIC_CALENDLY_URL` to your event scheduling link. Name, email, and prospect profile id (`utm_content`) are appended as query params when available.

### Meeting booking webhooks

When a prospect books through Calendly, the app can mark them as booked on the advisor prospects list.

1. Deploy the app (or expose dev via ngrok) so Calendly can reach **`https://your-domain.com/api/webhooks/calendly`**.
2. In Calendly **Integrations → Webhooks**, create a subscription for **`invitee.created`** and **`invitee.canceled`** (optionally **`invitee.rescheduled`**).
3. Copy the **signing key** into `CALENDLY_WEBHOOK_SIGNING_KEY` in `.env.local`.
4. Restart the dev server and book a test meeting through `/optimize`.

Bookings made before webhooks are configured are not backfilled automatically.

## Monday.com prospect sync

When a prospect reaches `wizard_complete` in `/optimize`, the server creates an item on your Monday board (if configured). When they view the preview (`teaser_viewed`), the Status column updates.

- Set `MONDAY_API_TOKEN` and `MONDAY_BOARD_ID` at minimum; map column IDs for email, status, and any optional fields.
- If either required var is missing, sync is skipped silently.
- Board setup, status labels, and how to fetch column IDs: [`docs/monday-setup.md`](docs/monday-setup.md).

Restart the dev server after updating `.env.local`.

## Generic (Product) FIC template

Prospect runs use hardcoded values in [`lib/prospect-default-fic-template.ts`](lib/prospect-default-fic-template.ts). Update that file if your saved browser template changes.

## Routes

| URL | Purpose |
|-----|---------|
| `/optimize` | Meta ad prospect funnel (public) |
| `/advisor/login` | Advisor sign-in |
| `/advisor` | Prospect dashboard (auth required) |
| `/advisor/clients/[id]` | Client worksheet (auth required) |
| `/worksheet` | Redirects to `/advisor` |
