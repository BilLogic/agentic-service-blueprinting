-- Before Students Join step 2: remove Back Stage Tech Zoom/Pencil and its triggers.

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000096062',
  'a0000000-0000-4000-8000-000000096064'
);

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000180208';
