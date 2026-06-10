-- Allow multiple prospect profiles per email (each intake gets its own UUID).
alter table public.client_profiles
  drop constraint if exists client_profiles_email_key;

create index if not exists client_profiles_email_search_idx
  on public.client_profiles (lower(email));
