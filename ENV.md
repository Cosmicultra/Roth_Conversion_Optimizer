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
```

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL in [`supabase/migrations/001_client_profiles.sql`](supabase/migrations/001_client_profiles.sql) in the Supabase SQL editor.
3. **Settings → API**:
   - **Project URL** → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for browser; used for advisor login)
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose in the browser)
4. **Authentication → Providers → Email** — enable Email sign-in.
5. **Authentication → Users → Add user** — create your advisor account (email + password).
6. Optionally disable public sign-up under Authentication settings.

## Advisor login

1. Restart the dev server after updating `.env.local`.
2. Open **`http://localhost:3000/advisor/login`**
3. Sign in → you land on **`/advisor`** (prospect list).
4. Click a row → **`/advisor/clients/[id]`** (full worksheet).

## Calendly

Set `NEXT_PUBLIC_CALENDLY_URL` to your event scheduling link. Name and email are appended as query params when available.

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
