-- Remove Back Stage Actions → Back Stage Tech connections for steps 1–2 on Before Students Join happy path

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000096061',
  'a0000000-0000-4000-8000-000000096062'
);
