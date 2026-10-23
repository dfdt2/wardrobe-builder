-- Wardrobe Builder v1: run in Supabase SQL Editor in a NEW project.
-- Data remains private until an authenticated user signs in and owns rows.
create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_code text not null,
  name text not null,
  category text not null,
  subcategory text,
  brand text,
  colors text[] not null default '{}',
  materials text[] not null default '{}',
  material_percentages jsonb,
  pattern text,
  occasions text[] not null default '{}',
  seasons text[] not null default '{}',
  style_tags text[] not null default '{}',
  neckline text,
  fit text,
  sleeve_length text,
  garment_length text,
  size_label text,
  purchase_price numeric(10,2),
  purchase_currency text,
  image_path text,
  image_source text,
  insulation_clo_estimate numeric(5,3),
  warmth_rating smallint check (warmth_rating between 0 and 10),
  warmth_source text check (warmth_source in ('estimated','user_adjusted','measured')),
  wind_resistance smallint check (wind_resistance between 0 and 3),
  water_resistance smallint check (water_resistance between 0 and 3),
  wet_weather_sensitivity smallint check (wet_weather_sensitivity between 0 and 3),
  traction_rating smallint check (traction_rating between 0 and 3),
  layering_role text,
  coverage_regions text[] not null default '{}',
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, item_code),
  unique (owner_id, id)
);

create table if not exists public.compatibility (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  garment_a_id uuid not null,
  garment_b_id uuid not null,
  decision boolean not null, -- true = approved, false = rejected; absent = unevaluated
  evaluated_at timestamptz not null default now(),
  constraint ordered_distinct_pair check (garment_a_id < garment_b_id),
  constraint unique_owner_pair unique (owner_id, garment_a_id, garment_b_id),
  constraint same_owner_a foreign key (owner_id, garment_a_id) references public.garments (owner_id, id) on delete cascade,
  constraint same_owner_b foreign key (owner_id, garment_b_id) references public.garments (owner_id, id) on delete cascade
);

create index if not exists garments_owner_category_idx on public.garments (owner_id, category);
create index if not exists compatibility_owner_a_idx on public.compatibility (owner_id, garment_a_id);
create index if not exists compatibility_owner_b_idx on public.compatibility (owner_id, garment_b_id);

alter table public.garments enable row level security;
alter table public.compatibility enable row level security;

create policy "Owner manages garments" on public.garments
for all to authenticated using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Owner manages compatibility" on public.compatibility
for all to authenticated using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- Storage: create a PRIVATE bucket named garment-images in Storage UI.
-- Store the object's path in garments.image_path; do not store image bytes in the SQL table.
-- Configure authenticated per-user storage policies before uploading from your app.
