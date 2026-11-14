-- Garment maintenance marker: false by default for all existing and new items.
alter table public.garments
  add column if not exists flagged boolean not null default false;
