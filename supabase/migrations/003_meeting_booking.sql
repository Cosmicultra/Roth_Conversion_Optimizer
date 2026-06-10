-- Meeting booking fields synced from Calendly webhooks.
alter table public.client_profiles
  add column if not exists meeting_booked_at timestamptz,
  add column if not exists meeting_start_at timestamptz,
  add column if not exists calendly_invitee_uri text;

create index if not exists client_profiles_meeting_booked_at_idx
  on public.client_profiles (meeting_booked_at desc nulls last);

create unique index if not exists client_profiles_calendly_invitee_uri_idx
  on public.client_profiles (calendly_invitee_uri)
  where calendly_invitee_uri is not null;
