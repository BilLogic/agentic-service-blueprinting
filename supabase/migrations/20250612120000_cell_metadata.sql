-- Optional cell metadata: picture, description, and structured links.
-- content = Cell Label (primary blueprint text shown in the grid).

alter table public.cells
  add column if not exists picture text,
  add column if not exists description text,
  add column if not exists links jsonb not null default '[]'::jsonb;

comment on column public.cells.content is
  'Cell Label — primary blueprint text entered in the grid';

comment on column public.cells.picture is
  'Optional image URL or storage reference';

comment on column public.cells.description is
  'Optional longer cell description (detail panel, not grid label)';

comment on column public.cells.links is
  'Optional JSON array of link objects: { "type": string, "label": string, "url"?: string }';

alter table public.cells
  drop constraint if exists cells_links_is_array;

alter table public.cells
  add constraint cells_links_is_array check (jsonb_typeof(links) = 'array');
