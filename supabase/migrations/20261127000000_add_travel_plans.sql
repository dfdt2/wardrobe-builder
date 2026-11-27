create table public.trips (id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,name text not null check(length(trim(name))>0),start_date date not null,end_date date not null check(end_date>=start_date),plan jsonb not null default '{"days":{},"manual":[],"outfits":[]}'::jsonb check(jsonb_typeof(plan)='object'),cover text,updated_at timestamptz not null default now());
alter table public.trips enable row level security;
revoke all on public.trips from anon;
grant select,insert,update,delete on public.trips to authenticated;
create policy "Owners manage trips" on public.trips for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create index trips_owner_idx on public.trips(owner_id);