-- Links each prospect profile to its Monday.com board item (prevents duplicate sync).
alter table public.client_profiles
  add column if not exists monday_item_id text;

create index if not exists client_profiles_monday_item_id_idx
  on public.client_profiles (monday_item_id)
  where monday_item_id is not null;
