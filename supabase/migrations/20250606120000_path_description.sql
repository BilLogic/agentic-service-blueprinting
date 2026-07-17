alter table public.paths
  add column if not exists description text;

comment on column public.paths.description is 'Optional summary of what this path variant represents';
