-- A garment may be worn independently regardless of its optional layering role.
-- All existing tops and dresses default to no layering until manually classified.
alter table public.garments
  add column if not exists layering_role text not null default 'none'
  constraint garments_layering_role_check check (layering_role in ('none','base','outer'));

update public.garments set layering_role='none' where layering_role is null;
