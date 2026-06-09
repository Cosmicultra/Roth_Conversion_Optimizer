-- Run in Supabase SQL editor or via CLI.
create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  source text not null default 'meta_optimize',
  status text not null default 'started'
    check (status in ('started', 'wizard_complete', 'teaser_viewed')),
  client jsonb not null default '{}'::jsonb,
  roth_worksheet jsonb not null default '{}'::jsonb,
  social_security jsonb not null default '{}'::jsonb,
  manual_traditional_qualified text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_profiles_updated_at_idx
  on public.client_profiles (updated_at desc);

create index if not exists client_profiles_name_search_idx
  on public.client_profiles (lower(first_name), lower(last_name));

create or replace function public.set_client_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists client_profiles_updated_at on public.client_profiles;
create trigger client_profiles_updated_at
  before update on public.client_profiles
  for each row execute function public.set_client_profiles_updated_at();
